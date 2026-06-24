const path = require("path");

const PORT = Number(process.env.PORT || 3000);
const CAPTURE_DIR = path.resolve(process.env.CAPTURE_DIR || path.join(process.cwd(), "test"));
const PUBLIC_DIR = path.join(__dirname, "public");

module.exports = {
  CAPTURE_DIR,
  PORT,
  PUBLIC_DIR,
};
