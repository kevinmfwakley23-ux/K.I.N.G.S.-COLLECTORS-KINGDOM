import { createHash, randomUUID } from "node:crypto";
import { access, copyFile, mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { DatabaseSync } from "node:sqlite";

const SNAPSHOT_VERSION = 1;
const MAX_SNAPSHOT_ATTEMPTS = 3;
const DATABASE_NAME = "vault.sqlite";
const MANIFEST_NAME = "manifest.json";
const FILES_DIRECTORY = "files";

function safePath(root, relative) {
  const base = resolve(root);
  const absolute = resolve(base, relative);
  if (absolute !== base && !absolute.startsWith(`${base}${sep}`)) throw new Error(`Unsafe recovery path: ${relative}`);
  return absolute;
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function sha256File(path) {
  const bytes = await readFile(path);
  return createHash("sha256").update(bytes).digest("hex");
}

function tableExists(database, tableName) {
  return Boolean(database.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name = ?").get(tableName));
}

function referencedFiles(database) {
  const rows = [];
  if (tableExists(database, "vault_media")) {
    rows.push(...database.prepare(`SELECT storage_path, byte_size, sha256, 'media' AS kind FROM vault_media`).all());
  }
  if (tableExists(database, "vault_evidence_documents")) {
    rows.push(...database.prepare(`SELECT storage_path, byte_size, sha256, 'evidence' AS kind FROM vault_evidence_documents`).all());
  }

  const byPath = new Map();
  for (const row of rows) {
    const relativePath = String(row.storage_path ?? "");
    if (!relativePath) throw new Error("Recovery snapshot encountered an empty storage path.");
    const next = {
      path: relativePath,
      byteSize: Number(row.byte_size),
      sha256: String(row.sha256),
      kind: String(row.kind)
    };
    const previous = byPath.get(relativePath);
    if (previous && (previous.sha256 !== next.sha256 || previous.byteSize !== next.byteSize)) {
      throw new Error(`Recovery snapshot found conflicting storage metadata for ${relativePath}.`);
    }
    if (!previous) byPath.set(relativePath, next);
  }
  return [...byPath.values()].sort((left, right) => left.path.localeCompare(right.path));
}

function databaseCounts(database) {
  const tables = [
    "vault_treasures",
    "vault_folders",
    "vault_locations",
    "vault_media",
    "vault_evidence_documents",
    "vault_ownership_history",
    "vault_treasure_attributes",
    "vault_collection_sets",
    "vault_set_entries",
    "vault_set_links",
    "vault_marketplace_preparation"
  ];
  const counts = {};
  for (const table of tables) {
    if (!tableExists(database, table)) continue;
    counts[table] = Number(database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get()?.count ?? 0);
  }
  return counts;
}

function validateDatabase(database) {
  const integrityRows = database.prepare("PRAGMA integrity_check").all();
  const integrityOk = integrityRows.length === 1 && String(integrityRows[0].integrity_check ?? "").toLowerCase() === "ok";
  if (!integrityOk) throw new Error(`SQLite integrity check failed: ${JSON.stringify(integrityRows)}`);
  const foreignKeyRows = database.prepare("PRAGMA foreign_key_check").all();
  if (foreignKeyRows.length) throw new Error(`SQLite foreign-key check failed with ${foreignKeyRows.length} violation(s).`);
  return { integrity: "ok", foreignKeyViolations: 0 };
}

async function assertEmptyTarget(path, label) {
  if (!(await exists(path))) return;
  const info = await stat(path);
  if (!info.isDirectory()) throw new Error(`${label} already exists.`);
  const entries = await readdir(path);
  if (entries.length) throw new Error(`${label} must be empty before recovery.`);
}

export async function createVaultRecoverySnapshot({ databasePath, storageRoot, snapshotDirectory, now = () => new Date() } = {}) {
  if (typeof databasePath !== "string" || !databasePath.trim()) throw new TypeError("Vault recovery requires a database path.");
  if (typeof storageRoot !== "string" || !storageRoot.trim()) throw new TypeError("Vault recovery requires a storage root.");
  if (typeof snapshotDirectory !== "string" || !snapshotDirectory.trim()) throw new TypeError("Vault recovery requires a snapshot directory.");
  if (!(await exists(databasePath))) throw new Error("Vault recovery source database does not exist.");
  if (await exists(snapshotDirectory)) throw new Error("Recovery snapshot destination already exists.");

  let lastError = null;
  for (let attempt = 1; attempt <= MAX_SNAPSHOT_ATTEMPTS; attempt += 1) {
    const partial = `${snapshotDirectory}.partial-${randomUUID()}`;
    const snapshotDatabasePath = resolve(partial, DATABASE_NAME);
    const snapshotFilesRoot = resolve(partial, FILES_DIRECTORY);
    try {
      await mkdir(partial, { recursive: false });
      const source = new DatabaseSync(databasePath);
      try {
        source.exec("PRAGMA busy_timeout = 5000;");
        source.exec(`VACUUM INTO ${sqlString(snapshotDatabasePath)};`);
      } finally {
        source.close();
      }

      const snapshotDatabase = new DatabaseSync(snapshotDatabasePath, { readOnly: true });
      let references;
      let counts;
      let validation;
      try {
        validation = validateDatabase(snapshotDatabase);
        references = referencedFiles(snapshotDatabase);
        counts = databaseCounts(snapshotDatabase);
      } finally {
        snapshotDatabase.close();
      }

      const copiedFiles = [];
      for (const reference of references) {
        const sourcePath = safePath(storageRoot, reference.path);
        const sourceInfo = await stat(sourcePath);
        if (!sourceInfo.isFile()) throw new Error(`Referenced Vault file is not a regular file: ${reference.path}`);
        if (sourceInfo.size !== reference.byteSize) throw new Error(`Referenced Vault file size changed during backup: ${reference.path}`);
        const sourceHash = await sha256File(sourcePath);
        if (sourceHash !== reference.sha256) throw new Error(`Referenced Vault file hash does not match database metadata: ${reference.path}`);

        const destinationPath = safePath(snapshotFilesRoot, reference.path);
        await mkdir(dirname(destinationPath), { recursive: true });
        await copyFile(sourcePath, destinationPath, constants.COPYFILE_EXCL);
        const copiedHash = await sha256File(destinationPath);
        if (copiedHash !== reference.sha256) throw new Error(`Copied Vault file failed hash verification: ${reference.path}`);
        copiedFiles.push(reference);
      }

      const databaseSha256 = await sha256File(snapshotDatabasePath);
      const manifest = {
        format: "kings-vault-recovery-snapshot",
        version: SNAPSHOT_VERSION,
        createdAt: now().toISOString(),
        database: {
          file: DATABASE_NAME,
          sha256: databaseSha256,
          validation,
          counts
        },
        filesDirectory: FILES_DIRECTORY,
        files: copiedFiles,
        sourcePolicy: {
          includesAuthoritativeVaultDatabase: true,
          includesReferencedMediaAndEvidence: true,
          includesIdentityDatabase: false,
          includesOffsiteReplication: false,
          includesPointInTimeLog: false
        }
      };
      await writeFile(resolve(partial, MANIFEST_NAME), `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
      await rename(partial, snapshotDirectory);
      return Object.freeze({ snapshotDirectory, manifest });
    } catch (error) {
      lastError = error;
      await rm(partial, { recursive: true, force: true });
    }
  }
  throw new Error(`Vault recovery snapshot failed after ${MAX_SNAPSHOT_ATTEMPTS} attempts: ${lastError?.message ?? "unknown error"}`);
}

export async function verifyVaultRecoverySnapshot({ snapshotDirectory } = {}) {
  if (typeof snapshotDirectory !== "string" || !snapshotDirectory.trim()) throw new TypeError("Snapshot directory is required.");
  const manifestPath = resolve(snapshotDirectory, MANIFEST_NAME);
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (manifest.format !== "kings-vault-recovery-snapshot" || manifest.version !== SNAPSHOT_VERSION) {
    throw new Error("Unsupported Vault recovery snapshot format or version.");
  }

  const databasePath = safePath(snapshotDirectory, manifest.database.file);
  const databaseHash = await sha256File(databasePath);
  if (databaseHash !== manifest.database.sha256) throw new Error("Vault recovery database hash verification failed.");

  const database = new DatabaseSync(databasePath, { readOnly: true });
  try {
    validateDatabase(database);
    const counts = databaseCounts(database);
    if (JSON.stringify(counts) !== JSON.stringify(manifest.database.counts)) throw new Error("Vault recovery database counts no longer match the manifest.");
    const references = referencedFiles(database);
    if (JSON.stringify(references) !== JSON.stringify(manifest.files)) throw new Error("Vault recovery file references no longer match the manifest.");
  } finally {
    database.close();
  }

  const filesRoot = safePath(snapshotDirectory, manifest.filesDirectory);
  for (const file of manifest.files) {
    const path = safePath(filesRoot, file.path);
    const info = await stat(path);
    if (!info.isFile() || info.size !== file.byteSize) throw new Error(`Vault recovery file size verification failed: ${file.path}`);
    if (await sha256File(path) !== file.sha256) throw new Error(`Vault recovery file hash verification failed: ${file.path}`);
  }
  return Object.freeze({ valid: true, manifest });
}

export async function restoreVaultRecoverySnapshot({ snapshotDirectory, targetDatabasePath, targetStorageRoot } = {}) {
  if (typeof targetDatabasePath !== "string" || !targetDatabasePath.trim()) throw new TypeError("Recovery target database path is required.");
  if (typeof targetStorageRoot !== "string" || !targetStorageRoot.trim()) throw new TypeError("Recovery target storage root is required.");
  const verification = await verifyVaultRecoverySnapshot({ snapshotDirectory });
  if (await exists(targetDatabasePath)) throw new Error("Recovery target database already exists.");
  await assertEmptyTarget(targetStorageRoot, "Recovery target storage directory");

  const sourceDatabasePath = safePath(snapshotDirectory, verification.manifest.database.file);
  const sourceFilesRoot = safePath(snapshotDirectory, verification.manifest.filesDirectory);
  let databaseCopied = false;
  try {
    await mkdir(dirname(targetDatabasePath), { recursive: true });
    await mkdir(targetStorageRoot, { recursive: true });
    await copyFile(sourceDatabasePath, targetDatabasePath, constants.COPYFILE_EXCL);
    databaseCopied = true;
    for (const file of verification.manifest.files) {
      const source = safePath(sourceFilesRoot, file.path);
      const destination = safePath(targetStorageRoot, file.path);
      await mkdir(dirname(destination), { recursive: true });
      await copyFile(source, destination, constants.COPYFILE_EXCL);
    }

    const restoredDatabase = new DatabaseSync(targetDatabasePath, { readOnly: true });
    try {
      validateDatabase(restoredDatabase);
    } finally {
      restoredDatabase.close();
    }
    for (const file of verification.manifest.files) {
      const restored = safePath(targetStorageRoot, file.path);
      if (await sha256File(restored) !== file.sha256) throw new Error(`Restored Vault file failed hash verification: ${file.path}`);
    }
    return Object.freeze({ restored: true, manifest: verification.manifest });
  } catch (error) {
    if (databaseCopied) await rm(targetDatabasePath, { force: true });
    await rm(targetStorageRoot, { recursive: true, force: true });
    throw error;
  }
}
