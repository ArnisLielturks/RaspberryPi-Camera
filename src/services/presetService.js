const fs = require("fs");
const path = require("path");
const { PRESETS_FILE } = require("../config");
const { normalizeOptions } = require("./cameraOptions");

const DEFAULT_PRESETS = [
  {
    id: "night-stack",
    name: "Night stacked",
    options: normalizeOptions({
      captureMode: "single",
      shutterSeconds: 5,
      iso: 800,
      gain: 8,
      width: 3280,
      height: 2464,
      frames: 30,
      format: "png",
      awb: "tungsten",
      denoise: "off",
      stackFrames: true,
      gamma: 2.5,
      contrast: 2.2,
      brightness: 0.35,
    }),
  },
  {
    id: "quick-preview",
    name: "Quick preview",
    options: normalizeOptions({
      captureMode: "single",
      shutterSeconds: 0.1,
      iso: 200,
      gain: 2,
      width: 1640,
      height: 1232,
      frames: 1,
      format: "jpg",
      awb: "auto",
      denoise: "auto",
      stackFrames: false,
      gamma: 1,
      contrast: 1,
      brightness: 0,
    }),
  },
];

function createId(name) {
  const slug = String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || `preset-${Date.now()}`;
}

function readStore() {
  try {
    const raw = fs.readFileSync(PRESETS_FILE, "utf8");
    const data = JSON.parse(raw);
    if (!Array.isArray(data.presets)) {
      return { presets: [] };
    }
    return {
      presets: data.presets
        .filter((preset) => preset && preset.id && preset.name && preset.options)
        .map((preset) => ({
          id: String(preset.id),
          name: String(preset.name),
          options: normalizeOptions(preset.options),
        })),
    };
  } catch (error) {
    if (error.code === "ENOENT") {
      return { presets: DEFAULT_PRESETS };
    }
    throw error;
  }
}

function writeStore(store) {
  fs.mkdirSync(path.dirname(PRESETS_FILE), { recursive: true });
  fs.writeFileSync(PRESETS_FILE, `${JSON.stringify(store, null, 2)}\n`);
}

function ensureStore() {
  const store = readStore();
  if (!fs.existsSync(PRESETS_FILE)) {
    writeStore(store);
  }
  return store;
}

function listPresets() {
  return ensureStore().presets;
}

function savePreset({ id, name, options }) {
  const trimmedName = String(name || "").trim();
  if (!trimmedName) {
    const error = new Error("Preset name is required.");
    error.statusCode = 400;
    throw error;
  }

  const store = ensureStore();
  const presetId = id ? String(id) : createId(trimmedName);
  const preset = {
    id: presetId,
    name: trimmedName,
    options: normalizeOptions(options),
  };
  const existingIndex = store.presets.findIndex((entry) => entry.id === presetId);

  if (existingIndex >= 0) {
    store.presets[existingIndex] = preset;
  } else {
    store.presets.push(preset);
  }

  store.presets.sort((a, b) => a.name.localeCompare(b.name));
  writeStore(store);
  return preset;
}

function deletePreset(id) {
  const store = ensureStore();
  const nextPresets = store.presets.filter((preset) => preset.id !== id);
  const deleted = nextPresets.length !== store.presets.length;
  if (deleted) {
    writeStore({ presets: nextPresets });
  }
  return deleted;
}

const presetService = {
  deletePreset,
  listPresets,
  savePreset,
};

module.exports = {
  presetService,
};
