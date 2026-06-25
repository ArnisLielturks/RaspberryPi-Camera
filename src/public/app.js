const form = document.getElementById("captureForm");
const statusPill = document.getElementById("statusPill");
const statusMeta = document.getElementById("statusMeta");
const diskSpace = document.getElementById("diskSpace");
const outputLog = document.getElementById("outputLog");
const images = document.getElementById("images");
const videos = document.getElementById("videos");
const startButton = document.getElementById("startButton");
const stopButton = document.getElementById("stopButton");
const refreshButton = document.getElementById("refreshButton");
const imageRefreshButton = document.getElementById("imageRefreshButton");
const imagePrevButton = document.getElementById("imagePrevButton");
const imageNextButton = document.getElementById("imageNextButton");
const imagePageLabel = document.getElementById("imagePageLabel");
const videoRefreshButton = document.getElementById("videoRefreshButton");
const videoPrevButton = document.getElementById("videoPrevButton");
const videoNextButton = document.getElementById("videoNextButton");
const videoPageLabel = document.getElementById("videoPageLabel");
const presetSelect = document.getElementById("presetSelect");
const presetName = document.getElementById("presetName");
const applyPresetButton = document.getElementById("applyPresetButton");
const savePresetButton = document.getElementById("savePresetButton");
const deletePresetButton = document.getElementById("deletePresetButton");
const deleteImagesButton = document.getElementById("deleteImagesButton");
const shutterRange = document.getElementById("shutterRange");
const shutterInput = document.getElementById("shutterInput");
const shutterLabel = document.getElementById("shutterLabel");

let presets = [];
let imagePage = 1;
let imagePagination = { page: 1, pageSize: 12, total: 0, totalPages: 1 };
let videoPage = 1;
let videoPagination = { page: 1, pageSize: 8, total: 0, totalPages: 1 };
let wasCaptureRunning = false;

function syncShutter(value) {
  const numeric = Math.min(Math.max(Number(value) || 5, 0.0001), 8);
  shutterRange.value = numeric;
  shutterInput.value = numeric;
  shutterLabel.textContent = `${numeric.toFixed(4)}s`;
}

function readForm() {
  const formData = new FormData(form);
  return {
    captureMode: formData.get("captureMode"),
    shutterSeconds: shutterInput.value,
    iso: formData.get("iso"),
    gain: formData.get("gain"),
    width: formData.get("width"),
    height: formData.get("height"),
    frames: formData.get("frames"),
    format: formData.get("format"),
    awb: formData.get("awb"),
    denoise: formData.get("denoise"),
    gamma: formData.get("gamma"),
    contrast: formData.get("contrast"),
    brightness: formData.get("brightness"),
    stackFrames: formData.get("stackFrames") === "on",
  };
}

function setNamedField(name, value) {
  const field = form.elements[name];
  if (!field) {
    return;
  }

  if (field.type === "checkbox") {
    field.checked = Boolean(value);
    return;
  }

  field.value = value;
}

function applyOptions(options) {
  setNamedField("captureMode", options.captureMode || "single");
  syncShutter(options.shutterSeconds);
  setNamedField("iso", options.iso);
  setNamedField("gain", options.gain);
  setNamedField("width", options.width);
  setNamedField("height", options.height);
  setNamedField("frames", options.frames);
  setNamedField("format", options.format);
  setNamedField("awb", options.awb);
  setNamedField("denoise", options.denoise);
  setNamedField("gamma", options.gamma);
  setNamedField("contrast", options.contrast);
  setNamedField("brightness", options.brightness);
  setNamedField("stackFrames", options.stackFrames);
}

function selectedPreset() {
  return presets.find((preset) => preset.id === presetSelect.value);
}

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDiskSpace(storage) {
  const available = formatBytes(storage.availableBytes);
  const total = formatBytes(storage.totalBytes);
  return `${available} available of ${total}`;
}

function setStatusMeta(status) {
  const fields = [
    ["Capture folder", status.captureDir],
    ["Video folder", status.videoDir],
    ["Started", status.startedAt ? new Date(status.startedAt).toLocaleString() : "-"],
    ["Ended", status.endedAt ? new Date(status.endedAt).toLocaleString() : "-"],
    ["Exit code", status.exitCode ?? "-"],
    ["Error", status.error || "-"],
  ];

  statusMeta.replaceChildren(
    ...fields.map(([label, value]) => {
      const row = document.createElement("div");
      const strong = document.createElement("strong");
      strong.textContent = `${label}:`;
      row.append(strong, ` ${value}`);
      return row;
    })
  );
}

async function refreshStatus() {
  const response = await fetch("/api/status");
  const status = await response.json();
  statusPill.classList.toggle("running", status.running);
  statusPill.querySelector("span:last-child").textContent = status.running ? "Capturing" : "Idle";
  startButton.disabled = status.running;
  stopButton.disabled = !status.running;
  setStatusMeta(status);
  outputLog.textContent = status.output.length ? status.output.join("\n") : "No capture output yet.";
  if (wasCaptureRunning && !status.running) {
    await Promise.all([refreshImages(), refreshVideos()]);
  }
  wasCaptureRunning = status.running;
}

function renderImage(image) {
  const figure = document.createElement("figure");
  const previewLink = document.createElement("a");
  const thumbnail = document.createElement("img");
  const caption = document.createElement("figcaption");
  const fileName = document.createElement("div");
  const details = document.createElement("div");
  const downloadLink = document.createElement("a");

  previewLink.href = image.url;
  previewLink.target = "_blank";
  previewLink.rel = "noreferrer";

  thumbnail.src = image.url;
  thumbnail.alt = image.name;
  thumbnail.loading = "lazy";
  previewLink.append(thumbnail);

  fileName.className = "filename";
  fileName.title = image.name;
  fileName.textContent = image.name;

  details.textContent = `${new Date(image.modifiedAt).toLocaleString()} · ${formatBytes(image.size)}`;

  downloadLink.className = "download";
  downloadLink.href = image.downloadUrl;
  downloadLink.textContent = "Download";

  caption.append(fileName, details, downloadLink);
  figure.append(previewLink, caption);
  return figure;
}

function renderVideo(video) {
  const figure = document.createElement("figure");
  const player = document.createElement("video");
  const caption = document.createElement("figcaption");
  const fileName = document.createElement("div");
  const details = document.createElement("div");
  const downloadLink = document.createElement("a");

  player.src = video.url;
  player.controls = true;
  player.preload = "metadata";

  fileName.className = "filename";
  fileName.title = video.name;
  fileName.textContent = video.name;

  details.textContent = `${new Date(video.modifiedAt).toLocaleString()} · ${formatBytes(video.size)}`;

  downloadLink.className = "download";
  downloadLink.href = video.downloadUrl;
  downloadLink.textContent = "Download";

  caption.append(fileName, details, downloadLink);
  figure.append(player, caption);
  return figure;
}

function renderEmpty(message) {
  const empty = document.createElement("div");
  empty.className = "empty";
  empty.textContent = message;
  return empty;
}

function updateImagePager() {
  imagePage = imagePagination.page;
  imagePageLabel.textContent = `Page ${imagePagination.page} of ${imagePagination.totalPages} · ${imagePagination.total} files`;
  imagePrevButton.disabled = imagePagination.page <= 1;
  imageNextButton.disabled = imagePagination.page >= imagePagination.totalPages;
}

function updateVideoPager() {
  videoPage = videoPagination.page;
  videoPageLabel.textContent = `Page ${videoPagination.page} of ${videoPagination.totalPages} · ${videoPagination.total} files`;
  videoPrevButton.disabled = videoPagination.page <= 1;
  videoNextButton.disabled = videoPagination.page >= videoPagination.totalPages;
}

async function refreshImages() {
  const response = await fetch(`/api/images?page=${imagePage}&pageSize=${imagePagination.pageSize}`);
  const data = await response.json();
  imagePagination = data.pagination;

  if (!data.images.length) {
    images.replaceChildren(renderEmpty("No images found yet."));
    updateImagePager();
    return;
  }

  images.replaceChildren(...data.images.map(renderImage));
  updateImagePager();
}

async function refreshVideos() {
  const response = await fetch(`/api/videos?page=${videoPage}&pageSize=${videoPagination.pageSize}`);
  const data = await response.json();
  videoPagination = data.pagination;

  if (!data.videos.length) {
    videos.replaceChildren(renderEmpty("No videos found yet."));
    updateVideoPager();
    return;
  }

  videos.replaceChildren(...data.videos.map(renderVideo));
  updateVideoPager();
}

async function refreshStorage() {
  const response = await fetch("/api/storage");
  const data = await response.json();
  diskSpace.textContent = formatDiskSpace(data.storage);
}

function renderPresets() {
  const currentValue = presetSelect.value;
  presetSelect.replaceChildren(new Option("Custom settings", ""));

  for (const preset of presets) {
    presetSelect.append(new Option(preset.name, preset.id));
  }

  if (presets.some((preset) => preset.id === currentValue)) {
    presetSelect.value = currentValue;
  }

  const preset = selectedPreset();
  presetName.value = preset ? preset.name : presetName.value;
  applyPresetButton.disabled = !preset;
  deletePresetButton.disabled = !preset;
}

async function refreshPresets() {
  const response = await fetch("/api/presets");
  const data = await response.json();
  presets = data.presets;
  renderPresets();
}

async function refreshAll() {
  await Promise.all([refreshStatus(), refreshImages(), refreshVideos(), refreshStorage()]);
}

async function refreshLiveState() {
  await Promise.all([refreshStatus(), refreshStorage()]);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  startButton.disabled = true;
  const response = await fetch("/api/capture", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(readForm()),
  });
  if (!response.ok) {
    const data = await response.json();
    alert(data.error || "Capture failed to start.");
  }
  await refreshAll();
});

stopButton.addEventListener("click", async () => {
  await fetch("/api/stop", { method: "POST" });
  await refreshAll();
});

presetSelect.addEventListener("change", () => {
  const preset = selectedPreset();
  presetName.value = preset ? preset.name : "";
  applyPresetButton.disabled = !preset;
  deletePresetButton.disabled = !preset;
  if (preset) {
    applyOptions(preset.options);
  }
});

applyPresetButton.addEventListener("click", () => {
  const preset = selectedPreset();
  if (preset) {
    applyOptions(preset.options);
  }
});

savePresetButton.addEventListener("click", async () => {
  const existingPreset = selectedPreset();
  const name = presetName.value.trim() || existingPreset?.name;
  if (!name) {
    alert("Enter a preset name first.");
    presetName.focus();
    return;
  }

  const response = await fetch("/api/presets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: existingPreset?.id,
      name,
      options: readForm(),
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    alert(data.error || "Preset could not be saved.");
    return;
  }

  presets = data.presets;
  presetSelect.value = data.preset.id;
  presetName.value = data.preset.name;
  renderPresets();
});

deletePresetButton.addEventListener("click", async () => {
  const preset = selectedPreset();
  if (!preset || !confirm(`Delete preset "${preset.name}"?`)) {
    return;
  }

  const response = await fetch(`/api/presets/${encodeURIComponent(preset.id)}`, { method: "DELETE" });
  const data = await response.json();
  presets = data.presets;
  presetSelect.value = "";
  presetName.value = "";
  renderPresets();
});

deleteImagesButton.addEventListener("click", async () => {
  const confirmed = confirm("Delete all captured image files from the capture folder?");
  if (!confirmed) {
    return;
  }

  deleteImagesButton.disabled = true;
  const response = await fetch("/api/images", { method: "DELETE" });
  const data = await response.json();
  deleteImagesButton.disabled = false;

  if (!response.ok) {
    alert(data.error || "Captured images could not be deleted.");
    return;
  }

  imagePagination = data.pagination;
  images.replaceChildren(...data.images.map(renderImage));
  if (!data.images.length) {
    images.replaceChildren(renderEmpty("No images found yet."));
  }
  updateImagePager();
  diskSpace.textContent = formatDiskSpace(data.storage);
  alert(`Deleted ${data.deletedCount} image files and freed ${formatBytes(data.freedBytes)}.`);
});

shutterRange.addEventListener("input", () => syncShutter(shutterRange.value));
shutterInput.addEventListener("input", () => syncShutter(shutterInput.value));
refreshButton.addEventListener("click", refreshAll);
imageRefreshButton.addEventListener("click", refreshImages);
imagePrevButton.addEventListener("click", () => {
  imagePage = Math.max(imagePage - 1, 1);
  refreshImages();
});
imageNextButton.addEventListener("click", () => {
  imagePage = Math.min(imagePage + 1, imagePagination.totalPages);
  refreshImages();
});
videoRefreshButton.addEventListener("click", refreshVideos);
videoPrevButton.addEventListener("click", () => {
  videoPage = Math.max(videoPage - 1, 1);
  refreshVideos();
});
videoNextButton.addEventListener("click", () => {
  videoPage = Math.min(videoPage + 1, videoPagination.totalPages);
  refreshVideos();
});

syncShutter(5);
refreshPresets();
refreshAll();
setInterval(refreshLiveState, 3000);
