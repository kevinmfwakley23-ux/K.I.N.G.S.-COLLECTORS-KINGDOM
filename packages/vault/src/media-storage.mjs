import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";

function resolveStoragePath(root, storageKey) {
  if (typeof storageKey !== "string" || !storageKey || storageKey.includes("\\")) {
    throw new TypeError("Vault media storage key is invalid.");
  }
  const segments = storageKey.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === ".." || !/^[A-Za-z0-9._-]+$/.test(segment))) {
    throw new TypeError("Vault media storage key contains an unsafe segment.");
  }
  const rootPath = resolve(root);
  const filePath = resolve(rootPath, ...segments);
  if (!filePath.startsWith(`${rootPath}${sep}`)) throw new TypeError("Vault media storage key escapes its storage root.");
  return filePath;
}

export class LocalVaultMediaStorage {
  constructor(root) {
    if (typeof root !== "string" || !root.trim()) throw new TypeError("Vault media storage root is required.");
    this.root = resolve(root);
  }

  async put(storageKey, bytes) {
    if (!Buffer.isBuffer(bytes)) throw new TypeError("Vault media bytes must be a Buffer.");
    const filePath = resolveStoragePath(this.root, storageKey);
    await mkdir(dirname(filePath), { recursive: true, mode: 0o700 });
    const temporaryPath = `${filePath}.tmp-${randomUUID()}`;
    try {
      await writeFile(temporaryPath, bytes, { flag: "wx", mode: 0o600 });
      await rename(temporaryPath, filePath);
    } catch (error) {
      await rm(temporaryPath, { force: true }).catch(() => {});
      throw error;
    }
    return storageKey;
  }

  async read(storageKey) {
    return readFile(resolveStoragePath(this.root, storageKey));
  }

  async remove(storageKey) {
    await rm(resolveStoragePath(this.root, storageKey), { force: true });
  }
}
