const { CAPTURE_DIR, VIDEO_DIR } = require("../config");

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function buildCaptureScript(options) {
  const extension = options.format === "jpg" ? "jpg" : "png";
  const outputEncoding = extension === "jpg" ? "jpg" : "png";
  const finalSuffix = options.stackFrames ? "_stacked" : "-0001";
  const loopStart = options.captureMode === "continuous" ? "while true; do" : "for capture_set in 1; do";
  const loopDelay = options.captureMode === "continuous" ? "sleep 1" : "";

  return [
    "set -e",
    `CAPTURE_DIR=${shellQuote(CAPTURE_DIR)}`,
    `VIDEO_DIR=${shellQuote(VIDEO_DIR)}`,
    "mkdir -p \"$CAPTURE_DIR\" \"$VIDEO_DIR\"",
    loopStart,
    "  TIMESTAMP=$(date +%Y%m%d_%H%M%S)",
    "  PREFIX=\"$CAPTURE_DIR/longexposure_${TIMESTAMP}\"",
    `  FINAL="$PREFIX${finalSuffix}.${extension}"`,
    '  VIDEO="$VIDEO_DIR/longexposure_${TIMESTAMP}.mp4"',
    `  for i in $(seq 1 ${options.frames}); do`,
    '    echo "Taking picture $i"',
    `    FRAME=$(printf "%s-%04d.${extension}" "$PREFIX" "$i")`,
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
          '  echo "Saving video to $VIDEO"',
          `  ffmpeg -framerate 12 -pattern_type glob -i "$PREFIX-*.${extension}" \\`,
          '    -vf "format=yuv420p" \\',
          '    -c:v libx264 -pix_fmt yuv420p -movflags +faststart -y "$VIDEO"',
        ].join("\n")
      : '  mv "$PREFIX-0001.' + extension + '" "$FINAL"',
    '  echo "Captured $FINAL"',
    loopDelay ? `  ${loopDelay}` : "",
    "done",
  ].join("\n");
}

module.exports = {
  buildCaptureScript,
};
