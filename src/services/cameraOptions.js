const MICROSECONDS_PER_SECOND = 1000 * 1000;

function clampNumber(value, { min, max, fallback, integer = false }) {
  const parsed = Number(value);
  const safeValue = Number.isFinite(parsed) ? parsed : fallback;
  const clamped = Math.min(Math.max(safeValue, min), max);
  return integer ? Math.round(clamped) : clamped;
}

function normalizeOptions(body = {}) {
  const shutterSeconds = clampNumber(body.shutterSeconds, {
    min: 0.0001,
    max: 8,
    fallback: 5,
  });
  const iso = clampNumber(body.iso, { min: 100, max: 1600, fallback: 800, integer: true });
  const gain = clampNumber(body.gain || iso / 100, { min: 1, max: 16, fallback: 8 });
  const width = clampNumber(body.width, { min: 320, max: 9152, fallback: 3280, integer: true });
  const height = clampNumber(body.height, { min: 240, max: 6944, fallback: 2464, integer: true });
  const frames = clampNumber(body.frames, { min: 1, max: 120, fallback: 30, integer: true });
  const format = ["jpg", "png"].includes(body.format) ? body.format : "png";
  const awb = ["auto", "tungsten", "daylight", "cloudy", "fluorescent", "incandescent", "indoor"].includes(body.awb)
    ? body.awb
    : "tungsten";
  const denoise = ["off", "cdn_off", "cdn_fast", "cdn_hq", "auto"].includes(body.denoise)
    ? body.denoise
    : "off";
  const stackFrames = body.stackFrames !== false && frames > 1;
  const gamma = clampNumber(body.gamma, { min: 0.1, max: 5, fallback: 2.5 });
  const contrast = clampNumber(body.contrast, { min: 0, max: 4, fallback: 2.2 });
  const brightness = clampNumber(body.brightness, { min: -1, max: 1, fallback: 0.35 });
  const captureMode = body.captureMode === "continuous" ? "continuous" : "single";

  return {
    captureMode,
    shutterSeconds,
    shutterMicros: Math.round(shutterSeconds * MICROSECONDS_PER_SECOND),
    iso,
    gain,
    width,
    height,
    frames,
    format,
    awb,
    denoise,
    stackFrames,
    gamma,
    contrast,
    brightness,
  };
}

module.exports = {
  normalizeOptions,
};
