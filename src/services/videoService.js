const fs = require("fs");
const path = require("path");
const { VIDEO_DIR } = require("../config");

const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".m4v", ".webm"]);

fs.mkdirSync(VIDEO_DIR, { recursive: true });

function normalizePagination({ page = 1, pageSize = 8 } = {}) {
  const safePage = Math.max(Number.parseInt(page, 10) || 1, 1);
  const safePageSize = Math.min(Math.max(Number.parseInt(pageSize, 10) || 8, 1), 30);
  return { page: safePage, pageSize: safePageSize };
}

function videoPathFromName(name) {
  const fileName = path.basename(name);
  const fullPath = path.join(VIDEO_DIR, fileName);
  if (!fullPath.startsWith(VIDEO_DIR + path.sep)) {
    return null;
  }
  return fullPath;
}

async function listVideos(pagination = {}) {
  const { page, pageSize } = normalizePagination(pagination);
  const entries = await fs.promises.readdir(VIDEO_DIR, { withFileTypes: true });
  const files = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && VIDEO_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
      .map(async (entry) => {
        const fullPath = path.join(VIDEO_DIR, entry.name);
        const stat = await fs.promises.stat(fullPath);
        return {
          name: entry.name,
          size: stat.size,
          modifiedAt: stat.mtime.toISOString(),
          url: `/videos/${encodeURIComponent(entry.name)}`,
          downloadUrl: `/download-video/${encodeURIComponent(entry.name)}`,
        };
      })
  );

  const sortedFiles = files.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));
  const total = sortedFiles.length;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;

  return {
    videos: sortedFiles.slice(start, start + pageSize),
    pagination: {
      page: currentPage,
      pageSize,
      total,
      totalPages,
    },
  };
}

const videoService = {
  listVideos,
  videoPathFromName,
};

module.exports = {
  videoService,
};
