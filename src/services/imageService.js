const fs = require("fs");
const path = require("path");
const { CAPTURE_DIR } = require("../config");

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"]);

function imagePathFromName(name) {
  const fileName = path.basename(name);
  const fullPath = path.join(CAPTURE_DIR, fileName);
  if (!fullPath.startsWith(CAPTURE_DIR + path.sep)) {
    return null;
  }
  return fullPath;
}

async function listImages() {
  const entries = await fs.promises.readdir(CAPTURE_DIR, { withFileTypes: true });
  const files = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
      .map(async (entry) => {
        const fullPath = path.join(CAPTURE_DIR, entry.name);
        const stat = await fs.promises.stat(fullPath);
        return {
          name: entry.name,
          size: stat.size,
          modifiedAt: stat.mtime.toISOString(),
          url: `/images/${encodeURIComponent(entry.name)}`,
          downloadUrl: `/download/${encodeURIComponent(entry.name)}`,
        };
      })
  );

  return files.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt)).slice(0, 36);
}

async function listImageEntries() {
  const entries = await fs.promises.readdir(CAPTURE_DIR, { withFileTypes: true });
  return entries.filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()));
}

async function deleteAllImages() {
  const entries = await listImageEntries();
  let deletedCount = 0;
  let freedBytes = 0;

  for (const entry of entries) {
    const fullPath = path.join(CAPTURE_DIR, entry.name);
    const stat = await fs.promises.stat(fullPath);
    await fs.promises.unlink(fullPath);
    deletedCount += 1;
    freedBytes += stat.size;
  }

  return {
    deletedCount,
    freedBytes,
  };
}

const imageService = {
  deleteAllImages,
  imagePathFromName,
  listImages,
};

module.exports = {
  imageService,
};
