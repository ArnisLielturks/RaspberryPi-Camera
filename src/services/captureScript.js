const { CAPTURE_DIR } = require("../config");

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function buildCaptureScript(options) {
  const extension = options.format === "jpg" ? "jpg" : "png";
  const outputEncoding = extension === "jpg" ? "jpg" : "png";
  const finalSuffix = options.stackFrames ? "-stacked" : "-1";
  const loopStart = options.captureMode === "continuous" ? "while true; do" : "for capture_set in 1; do";
  const loopDelay = options.captureMode === "continuous" ? "sleep 1" : "";

  return [
    "set -e",
    `CAPTURE_DIR=${shellQuote(CAPTURE_DIR)}`,
    "mkdir -p \"$CAPTURE_DIR\"",
    loopStart,
    "  TIMESTAMP=$(date +%Y%m%d_%H%M%S)",
    "  PREFIX=\"$CAPTURE_DIR/longexposure_${TIMESTAMP}\"",
    `  FINAL="$PREFIX${finalSuffix}.${extension}"`,
    `  for i in $(seq 1 ${options.frames}); do`,
    '    echo "Taking picture $i"',
    "    FRAME=\"$PREFIX-$i." + extension + "\"",
    [
      "    rpicam-still",
      '      -o "$FRAME"',
      `      -e ${outputEncoding}`,
      `      --width ${options.width}`,
      `      --height ${options.height}`,
      `      --shutter ${options.shutterMicros}`,
      `      --gain ${options.gain}`,
      `      --awb ${options.awb}`,
      `      --denoise ${options.denoise}`,
      "      --nopreview",
    ].join(" \\\n"),
    "  done",
    options.stackFrames
      ? [
          '  echo "Finalizing frames into $FINAL"',
          `  ffmpeg -pattern_type glob -i "$PREFIX-*.${extension}" \\`,
          `    -vf "tblend=all_mode=average,hqdn3d=3:3:6:6,eq=gamma=${options.gamma}:contrast=${options.contrast}:brightness=${options.brightness}" \\`,
          "    -frames:v 1 -y \"$FINAL\"",
        ].join("\n")
      : '  mv "$PREFIX-1.' + extension + '" "$FINAL"',
    '  echo "Captured $FINAL"',
    loopDelay ? `  ${loopDelay}` : "",
    "done",
  ].join("\n");
}

module.exports = {
  buildCaptureScript,
};
