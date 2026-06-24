const fs = require("fs");
const { spawn } = require("child_process");
const { CAPTURE_DIR } = require("../config");
const { buildCaptureScript } = require("./captureScript");
const { normalizeOptions } = require("./cameraOptions");

let activeCapture = null;
let lastRun = {
  startedAt: null,
  endedAt: null,
  exitCode: null,
  error: null,
  command: null,
  output: [],
};

fs.mkdirSync(CAPTURE_DIR, { recursive: true });

function appendOutput(text) {
  const lines = text.toString().split(/\r?\n/).filter(Boolean);
  lastRun.output.push(...lines);
  lastRun.output = lastRun.output.slice(-200);
}

function getStatus() {
  return {
    running: Boolean(activeCapture),
    pid: activeCapture?.pid || null,
    startedAt: lastRun.startedAt,
    endedAt: lastRun.endedAt,
    exitCode: lastRun.exitCode,
    error: lastRun.error,
    command: lastRun.command,
    output: lastRun.output.slice(-80),
    captureDir: CAPTURE_DIR,
  };
}

function startCapture(body) {
  const options = normalizeOptions(body);
  const command = buildCaptureScript(options);
  const child = spawn("bash", ["-lc", command], {
    cwd: process.cwd(),
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  activeCapture = child;
  lastRun = {
    startedAt: new Date().toISOString(),
    endedAt: null,
    exitCode: null,
    error: null,
    command,
    output: [],
  };

  child.stdout.on("data", appendOutput);
  child.stderr.on("data", appendOutput);
  child.on("error", (error) => {
    lastRun.error = error.message;
  });
  child.on("close", (code, signal) => {
    lastRun.endedAt = new Date().toISOString();
    lastRun.exitCode = code;
    if (signal) {
      lastRun.error = `Stopped by ${signal}`;
    }
    activeCapture = null;
  });

  return { status: getStatus(), options };
}

function stopCapture() {
  if (!activeCapture) {
    return;
  }

  try {
    process.kill(-activeCapture.pid, "SIGTERM");
  } catch (error) {
    lastRun.error = error.message;
  }
}

const cameraService = {
  getStatus,
  isRunning: () => Boolean(activeCapture),
  startCapture,
  stopCapture,
};

module.exports = {
  cameraService,
};
