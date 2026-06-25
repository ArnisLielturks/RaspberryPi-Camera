const { createApp } = require("./server");
const { PORT, CAPTURE_DIR, VIDEO_DIR } = require("./config");

const app = createApp();

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Camera controller running on http://localhost:${PORT}`);
  console.log(`Capture directory: ${CAPTURE_DIR}`);
  console.log(`Video directory: ${VIDEO_DIR}`);
});
