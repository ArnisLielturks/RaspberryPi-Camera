const path = require("path");

const PORT = Number(process.env.PORT || 3000);
const CAPTURE_DIR = path.resolve(process.env.CAPTURE_DIR || path.join(process.cwd(), "test"));
const PUBLIC_DIR = path.join(__dirname, "public");
const PRESETS_FILE = path.resolve(process.env.PRESETS_FILE || path.join(process.cwd(), "camera-presets.json"));
const VIDEO_DIR = path.resolve(process.env.VIDEO_DIR || path.join(process.cwd(), "videos"));

module.exports = {
  CAPTURE_DIR,
  PORT,
  PRESETS_FILE,
  PUBLIC_DIR,
  VIDEO_DIR,
};
