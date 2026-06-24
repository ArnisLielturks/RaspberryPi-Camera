const express = require("express");
const { cameraController } = require("./controllers/cameraController");
const { errorHandler } = require("./middleware/errorHandler");
const { PUBLIC_DIR } = require("./config");

function createApp() {
  const app = express();

  app.use(express.json());
  app.use(express.static(PUBLIC_DIR));

  app.get("/api/status", cameraController.getStatus);
  app.get("/api/images", cameraController.listImages);
  app.post("/api/capture", cameraController.startCapture);
  app.post("/api/stop", cameraController.stopCapture);
  app.get("/images/:name", cameraController.sendImage);
  app.get("/download/:name", cameraController.downloadImage);

  app.use(errorHandler);

  return app;
}

module.exports = {
  createApp,
};
