const form = document.getElementById("captureForm");
const statusPill = document.getElementById("statusPill");
const statusMeta = document.getElementById("statusMeta");
const outputLog = document.getElementById("outputLog");
const images = document.getElementById("images");
const startButton = document.getElementById("startButton");
const stopButton = document.getElementById("stopButton");
const refreshButton = document.getElementById("refreshButton");
const imageRefreshButton = document.getElementById("imageRefreshButton");
const shutterRange = document.getElementById("shutterRange");
const shutterInput = document.getElementById("shutterInput");
const shutterLabel = document.getElementById("shutterLabel");

function syncShutter(value) {
  const numeric = Math.min(Math.max(Number(value) || 5, 0.0001), 8);
  shutterRange.value = numeric;
  shutterInput.value = numeric;
  shutterLabel.textContent = `${numeric.toFixed(4)}s`;
}

function readForm() {
  const formData = new FormData(form);
  return {
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

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function setStatusMeta(status) {
  const fields = [
    ["Capture folder", status.captureDir],
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

async function refreshImages() {
  const response = await fetch("/api/images");
  const data = await response.json();

  if (!data.images.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No images found yet.";
    images.replaceChildren(empty);
    return;
  }

  images.replaceChildren(...data.images.map(renderImage));
}

async function refreshAll() {
  await Promise.all([refreshStatus(), refreshImages()]);
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

shutterRange.addEventListener("input", () => syncShutter(shutterRange.value));
shutterInput.addEventListener("input", () => syncShutter(shutterInput.value));
refreshButton.addEventListener("click", refreshAll);
imageRefreshButton.addEventListener("click", refreshImages);

syncShutter(5);
refreshAll();
setInterval(refreshAll, 3000);
