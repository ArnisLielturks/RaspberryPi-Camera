const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

// Configure shutter/gain pairs here or via CAPTURE_CONFIGS JSON env var.
// Daylight configurations (shorter exposures, lower gain)
const DEFAULT_CONFIGS = [
  { shutter: 1000, gain: 1 },     // Bright daylight
  { shutter: 2000, gain: 1 },     // Slightly dimmer daylight
  { shutter: 5000, gain: 2 },     // Late afternoon, shaded
  { shutter: 15000, gain: 3 },    // Overcast, low sun

  // Nighttime configurations (long exposures, higher gain)
  { shutter: 1000000, gain: 4 },  // Dusk or city-lit night
  { shutter: 2500000, gain: 6 },  // Suburban night
  { shutter: 4000000, gain: 8 },  // Dark sky, short star trails
  { shutter: 6000000, gain: 10 }, // Long exposure, starlight only
];

const SAVE_ROOT = process.env.SAVE_ROOT
  ? path.resolve(process.env.SAVE_ROOT)
  : path.resolve(process.cwd(), "captures");
const INTERVAL_MS = Number(process.env.INTERVAL_MS || 20000);
const MAX_CYCLES = Number(process.env.MAX_CYCLES || 0); // 0 means infinite

function parseConfigs() {
  if (!process.env.CAPTURE_CONFIGS) {
    return DEFAULT_CONFIGS;
  }

  try {
    const parsed = JSON.parse(process.env.CAPTURE_CONFIGS);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("CAPTURE_CONFIGS must be a non-empty array.");
    }

    return parsed.map((entry) => {
      const shutter = Number(entry.shutter);
      const gain = Number(entry.gain);
      if (!Number.isFinite(shutter) || !Number.isFinite(gain)) {
        throw new Error("Every config must include numeric shutter and gain.");
      }
      return { shutter, gain };
    });
  } catch (error) {
    console.error("Failed to parse CAPTURE_CONFIGS:", error.message);
    process.exit(1);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runCapture({ shutter, gain }) {
  const folderName = `shutter_${shutter}_gain_${gain}`;
  const saveDir = path.join(SAVE_ROOT, folderName);
  fs.mkdirSync(saveDir, { recursive: true });

  const captureCommand = [
    'TIMESTAMP=$(date +"%Y%m%d_%H%M%S")',
    `FILENAME="${saveDir}/astro_$TIMESTAMP.jpg"`,
    `rpicam-still -o "$FILENAME" --shutter ${shutter} --gain ${gain} --denoise off --nopreview`,
    'echo "Captured $FILENAME"',
  ].join("; ");

  return new Promise((resolve, reject) => {
    const child = spawn("bash", ["-lc", captureCommand], {
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Capture failed (shutter=${shutter}, gain=${gain}, code=${code})`));
      }
    });
  });
}

async function start() {
  const configs = parseConfigs();
  fs.mkdirSync(SAVE_ROOT, { recursive: true });

  console.log("Starting capture loop...");
  console.log(`Save root: ${SAVE_ROOT}`);
  console.log(`Interval: ${INTERVAL_MS}ms`);
  console.log(`Configs: ${JSON.stringify(configs)}`);

  let cycle = 0;
  while (MAX_CYCLES === 0 || cycle < MAX_CYCLES) {
    cycle += 1;
    console.log(`\nCycle ${cycle} started at ${new Date().toISOString()}`);

    for (const config of configs) {
      try {
        await runCapture(config);
      } catch (error) {
        console.error(error.message);
      }
    }

    if (MAX_CYCLES !== 0 && cycle >= MAX_CYCLES) {
      break;
    }

    await sleep(INTERVAL_MS);
  }

  console.log("Capture loop completed.");
}

start().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
