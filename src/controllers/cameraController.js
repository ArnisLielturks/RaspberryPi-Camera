const path = require("path");
const { cameraService } = require("../services/cameraService");
const { imageService } = require("../services/imageService");
const { presetService } = require("../services/presetService");
const { storageService } = require("../services/storageService");
const { videoService } = require("../services/videoService");

const cameraController = {
  getStatus(request, response) {
    response.json(cameraService.getStatus());
  },

  async listImages(request, response, next) {
    try {
      response.json(await imageService.listImages(request.query));
    } catch (error) {
      next(error);
    }
  },

  async listVideos(request, response, next) {
    try {
      response.json(await videoService.listVideos(request.query));
    } catch (error) {
      next(error);
    }
  },

  async getStorage(request, response, next) {
    try {
      response.json({ storage: await storageService.getDiskSpace() });
    } catch (error) {
      next(error);
    }
  },

  async deleteAllImages(request, response, next) {
    try {
      const result = await imageService.deleteAllImages();
      response.json({
        ...result,
        ...(await imageService.listImages(request.query)),
        storage: await storageService.getDiskSpace(),
      });
    } catch (error) {
      next(error);
    }
  },

  listPresets(request, response) {
    response.json({ presets: presetService.listPresets() });
  },

  savePreset(request, response, next) {
    try {
      const preset = presetService.savePreset(request.body);
      response.status(201).json({ preset, presets: presetService.listPresets() });
    } catch (error) {
      next(error);
    }
  },

  deletePreset(request, response) {
    const deleted = presetService.deletePreset(request.params.id);
    response.json({ deleted, presets: presetService.listPresets() });
  },

  startCapture(request, response) {
    if (cameraService.isRunning()) {
      response.status(409).json({
        error: "A capture is already running.",
        status: cameraService.getStatus(),
      });
      return;
    }

    const result = cameraService.startCapture(request.body);
    response.status(202).json(result);
  },

  stopCapture(request, response) {
    cameraService.stopCapture();
    response.json({ status: cameraService.getStatus() });
  },

  sendImage(request, response, next) {
    const fullPath = imageService.imagePathFromName(request.params.name);
    if (!fullPath) {
      response.sendStatus(404);
      return;
    }
    response.sendFile(fullPath, next);
  },

  downloadImage(request, response, next) {
    const fullPath = imageService.imagePathFromName(request.params.name);
    if (!fullPath) {
      response.sendStatus(404);
      return;
    }
    response.download(fullPath, path.basename(fullPath), next);
  },

  sendVideo(request, response, next) {
    const fullPath = videoService.videoPathFromName(request.params.name);
    if (!fullPath) {
      response.sendStatus(404);
      return;
    }
    response.sendFile(fullPath, next);
  },

  downloadVideo(request, response, next) {
    const fullPath = videoService.videoPathFromName(request.params.name);
    if (!fullPath) {
      response.sendStatus(404);
      return;
    }
    response.download(fullPath, path.basename(fullPath), next);
  },
};

module.exports = {
  cameraController,
};
