const fs = require("fs");
const { CAPTURE_DIR } = require("../config");

async function getDiskSpace() {
  const stats = await fs.promises.statfs(CAPTURE_DIR);
  const availableBytes = stats.bavail * stats.bsize;
  const freeBytes = stats.bfree * stats.bsize;
  const totalBytes = stats.blocks * stats.bsize;
  const usedBytes = totalBytes - freeBytes;

  return {
    path: CAPTURE_DIR,
    availableBytes,
    freeBytes,
    totalBytes,
    usedBytes,
  };
}

const storageService = {
  getDiskSpace,
};

module.exports = {
  storageService,
};
