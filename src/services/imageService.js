const fs = require("fs");
const path = require("path");
const { CAPTURE_DIR } = require("../config");

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"]);

function normalizePagination({ page = 1, pageSize = 12 } = {}) {
  const safePage = Math.max(Number.parseInt(page, 10) || 1, 1);
  const safePageSize = Math.min(Math.max(Number.parseInt(pageSize, 10) || 12, 1), 60);
  return { page: safePage, pageSize: safePageSize };
}

function imagePathFromName(name) {
  const fileName = path.basename(name);
  const fullPath = path.join(CAPTURE_DIR, fileName);
  if (!fullPath.startsWith(CAPTURE_DIR + path.sep)) {
    return null;
  }
  return fullPath;
}

async function listImages(pagination = {}) {
  const { page, pageSize } = normalizePagination(pagination);
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

  const sortedFiles = files.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));
  const total = sortedFiles.length;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;

  return {
    images: sortedFiles.slice(start, start + pageSize),
    pagination: {
      page: currentPage,
      pageSize,
      total,
      totalPages,
    },
  };
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
