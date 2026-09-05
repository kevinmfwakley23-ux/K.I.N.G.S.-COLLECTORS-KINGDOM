import { createHash, randomUUID } from "node:crypto";
import { extname } from "node:path";
import { VaultError } from "./service.mjs";

const MAX_MEDIA_PER_TREASURE = 24;
const MAX_ACCOUNT_MEDIA_BYTES = 512 * 1024 * 1024;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

const MEDIA_TYPES = Object.freeze({
  "image/jpeg": Object.freeze({ mediaKind: "image", extension: "jpg", extensions: new Set([".jpg", ".jpeg"]), maxBytes: MAX_IMAGE_BYTES }),
  "image/png": Object.freeze({ mediaKind: "image", extension: "png", extensions: new Set([".png"]), maxBytes: MAX_IMAGE_BYTES }),
  "image/webp": Object.freeze({ mediaKind: "image", extension: "webp", extensions: new Set([".webp"]), maxBytes: MAX_IMAGE_BYTES }),
  "image/gif": Object.freeze({ mediaKind: "image", extension: "gif", extensions: new Set([".gif"]), maxBytes: MAX_IMAGE_BYTES }),
  "image/avif": Object.freeze({ mediaKind: "image", extension: "avif", extensions: new Set([".avif"]), maxBytes: MAX_IMAGE_BYTES }),
  "application/pdf": Object.freeze({ mediaKind: "document", extension: "pdf", extensions: new Set([".pdf"]), maxBytes: MAX_DOCUMENT_BYTES })
});

function requireCollector(identity) {
  if (!identity?.id) throw new VaultError("unauthorized", "Authentication is required.", 401);
  return identity;
}

function requireTreasure(vaultStore, ownerAccountId, treasureId) {
  if (typeof treasureId !== "string" || !treasureId.trim()) throw new VaultError("invalid_treasure_id", "A treasure identifier is required.");
  const treasure = vaultStore.findTreasureById(ownerAccountId, treasureId.trim());
  if (!treasure) throw new VaultError("treasure_not_found", "The requested treasure does not exist in this Vault.", 404);
  return treasure;
}

function safeSha256(value) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/i.test(value.trim())) {
    throw new VaultError("invalid_media_sha256", "A valid SHA-256 digest is required.", 400);
  }
  return value.trim().toLowerCase();
}

function safeOriginalName(value) {
  if (typeof value !== "string") throw new VaultError("invalid_media_filename", "An original filename is required.");
  const name = value.normalize("NFKC").trim();
  if (!name || name.length > 180) throw new VaultError("invalid_media_filename", "The media filename must contain 1 to 180 characters.");
  if (/[\\/\u0000-\u001f\u007f]/.test(name) || name.startsWith(".") || name.includes("..")) {
    throw new VaultError("invalid_media_filename", "The media filename contains unsafe path or control characters.");
  }
  return name;
}

function isJpeg(bytes) {
  return bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function isPng(bytes) {
  return bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) && bytes.subarray(12, 16).toString("ascii") === "IHDR";
}

function isGif(bytes) {
  if (bytes.length < 13) return false;
  const signature = bytes.subarray(0, 6).toString("ascii");
  return signature === "GIF87a" || signature === "GIF89a";
}

function isWebp(bytes) {
  return bytes.length >= 16 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
}

function isAvif(bytes) {
  if (bytes.length < 16 || bytes.subarray(4, 8).toString("ascii") !== "ftyp") return false;
  const brands = bytes.subarray(8, Math.min(bytes.length, 32)).toString("ascii");
  return brands.includes("avif") || brands.includes("avis");
}

function isPdf(bytes) {
  return bytes.length >= 8 && bytes.subarray(0, 5).toString("ascii") === "%PDF-";
}

function detectContentType(bytes) {
  if (isJpeg(bytes)) return "image/jpeg";
  if (isPng(bytes)) return "image/png";
  if (isGif(bytes)) return "image/gif";
  if (isWebp(bytes)) return "image/webp";
  if (isAvif(bytes)) return "image/avif";
  if (isPdf(bytes)) return "application/pdf";
  return null;
}

function inspectMedia(bytes, { claimedContentType, originalName }) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) throw new VaultError("empty_media", "The uploaded media file is empty.");
  const name = safeOriginalName(originalName);
  const detectedContentType = detectContentType(bytes);
  if (!detectedContentType) {
    throw new VaultError("unsupported_media_type", "Only verified JPEG, PNG, WebP, GIF, AVIF, and PDF files are accepted.", 415);
  }

  const definition = MEDIA_TYPES[detectedContentType];
  const normalizedClaim = typeof claimedContentType === "string" ? claimedContentType.split(";", 1)[0].trim().toLowerCase() : "";
  if (!MEDIA_TYPES[normalizedClaim] || normalizedClaim !== detectedContentType) {
    throw new VaultError("media_type_mismatch", "The declared media type does not match the file signature.", 415);
  }

  const extension = extname(name).toLowerCase();
  if (!definition.extensions.has(extension)) {
    throw new VaultError("media_extension_mismatch", `The filename extension does not match ${detectedContentType}.`, 415);
  }
  if (bytes.length > definition.maxBytes) {
    throw new VaultError("media_too_large", `${definition.mediaKind === "image" ? "Images" : "PDF documents"} may not exceed ${Math.floor(definition.maxBytes / (1024 * 1024))} MiB.`, 413);
  }

  return Object.freeze({
    originalName: name,
    contentType: detectedContentType,
    mediaKind: definition.mediaKind,
    extension: definition.extension,
    sizeBytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex")
  });
}

function hashedSegment(value) {
  return createHash("sha256").update(String(value)).digest("hex").slice(0, 32);
}

function storageKey({ ownerAccountId, treasureId, mediaId, extension }) {
  return `${hashedSegment(ownerAccountId)}/${hashedSegment(treasureId)}/${mediaId}.${extension}`;
}

function publicMedia(media) {
  return Object.freeze({
    id: media.id,
    treasureId: media.treasureId,
    mediaKind: media.mediaKind,
    originalName: media.originalName,
    contentType: media.contentType,
    sizeBytes: media.sizeBytes,
    createdAt: media.createdAt,
    url: `/api/vault/media/${encodeURIComponent(media.id)}`
  });
}

export function createVaultMediaService({ vaultStore, mediaRepository, storage, now = () => new Date() } = {}) {
  if (!vaultStore) throw new TypeError("Vault media service requires the Vault store.");
  if (!mediaRepository) throw new TypeError("Vault media service requires a media repository.");
  if (!storage) throw new TypeError("Vault media service requires private media storage.");

  async function add(identity, treasureId, input = {}) {
    const collector = requireCollector(identity);
    const treasure = requireTreasure(vaultStore, collector.id, treasureId);
    const inspected = inspectMedia(input.bytes, {
      claimedContentType: input.contentType,
      originalName: input.originalName
    });

    const existing = mediaRepository.listForTreasure(collector.id, treasure.id);
    if (existing.length >= MAX_MEDIA_PER_TREASURE) {
      throw new VaultError("media_limit_reached", `A treasure may have at most ${MAX_MEDIA_PER_TREASURE} stored media files.`, 409);
    }
    const usage = mediaRepository.usage(collector.id);
    if (usage.sizeBytes + inspected.sizeBytes > MAX_ACCOUNT_MEDIA_BYTES) {
      throw new VaultError("media_storage_limit_reached", "The collector media storage allowance has been reached.", 409);
    }

    const id = randomUUID();
    const key = storageKey({ ownerAccountId: collector.id, treasureId: treasure.id, mediaId: id, extension: inspected.extension });
    const createdAt = now().toISOString();
    await storage.put(key, input.bytes);

    try {
      const media = mediaRepository.create({
        id,
        ownerAccountId: collector.id,
        treasureId: treasure.id,
        mediaKind: inspected.mediaKind,
        storageKey: key,
        originalName: inspected.originalName,
        contentType: inspected.contentType,
        sizeBytes: inspected.sizeBytes,
        sha256: inspected.sha256,
        createdAt
      });
      vaultStore.writeEvent({
        id: randomUUID(),
        ownerAccountId: collector.id,
        treasureId: treasure.id,
        eventType: "vault.media_added",
        metadata: {
          mediaId: media.id,
          mediaKind: media.mediaKind,
          contentType: media.contentType,
          sizeBytes: media.sizeBytes,
          sha256: inspected.sha256
        },
        createdAt
      });
      return publicMedia(media);
    } catch (error) {
      mediaRepository.remove(collector.id, id);
      await storage.remove(key).catch(() => {});
      throw error;
    }
  }

  function list(identity, treasureId) {
    const collector = requireCollector(identity);
    const treasure = requireTreasure(vaultStore, collector.id, treasureId);
    return mediaRepository.listForTreasure(collector.id, treasure.id).map(publicMedia);
  }

  function matchBySha256(identity, treasureId, sha256) {
    const collector = requireCollector(identity);
    const treasure = requireTreasure(vaultStore, collector.id, treasureId);
    const digest = safeSha256(sha256);
    const media = mediaRepository.findBySha256(collector.id, treasure.id, digest);
    if (!media || media.mediaKind !== "image") return null;
    return publicMedia(media);
  }

  async function read(identity, mediaId) {
    const collector = requireCollector(identity);
    if (typeof mediaId !== "string" || !mediaId.trim()) throw new VaultError("invalid_media_id", "A media identifier is required.");
    const media = mediaRepository.findById(collector.id, mediaId.trim());
    if (!media) throw new VaultError("media_not_found", "The requested Vault media does not exist.", 404);
    requireTreasure(vaultStore, collector.id, media.treasureId);
    try {
      const bytes = await storage.read(media.storageKey);
      return Object.freeze({ media: publicMedia(media), bytes });
    } catch (error) {
      if (error?.code === "ENOENT") throw new VaultError("media_file_missing", "The Vault media record exists but its private file is unavailable.", 410);
      throw error;
    }
  }

  async function remove(identity, mediaId) {
    const collector = requireCollector(identity);
    if (typeof mediaId !== "string" || !mediaId.trim()) throw new VaultError("invalid_media_id", "A media identifier is required.");
    const media = mediaRepository.findById(collector.id, mediaId.trim());
    if (!media) throw new VaultError("media_not_found", "The requested Vault media does not exist.", 404);
    requireTreasure(vaultStore, collector.id, media.treasureId);

    await storage.remove(media.storageKey);
    if (!mediaRepository.remove(collector.id, media.id)) {
      throw new VaultError("media_not_found", "The requested Vault media no longer exists.", 404);
    }
    vaultStore.writeEvent({
      id: randomUUID(),
      ownerAccountId: collector.id,
      treasureId: media.treasureId,
      eventType: "vault.media_removed",
      metadata: { mediaId: media.id, originalName: media.originalName },
      createdAt: now().toISOString()
    });
    return Object.freeze({ id: media.id, removed: true });
  }

  function usage(identity) {
    const collector = requireCollector(identity);
    const value = mediaRepository.usage(collector.id);
    return Object.freeze({
      ...value,
      maxBytes: MAX_ACCOUNT_MEDIA_BYTES,
      maxPerTreasure: MAX_MEDIA_PER_TREASURE
    });
  }

  return Object.freeze({ add, list, matchBySha256, read, remove, usage });
}
