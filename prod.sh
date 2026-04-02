#!/bin/bash
# AstroPi_rpicam.sh - Fully Automated Astrophotography using rpicam-still
# Camera: IMX219 (Raspberry Pi Camera v2)
# Dependencies: rpicam-still (libcamera), ffmpeg

###########################
# USER CONFIGURATION
###########################

# Directory to save images
SAVE_DIR="$HOME/astro_images"
mkdir -p "$SAVE_DIR"

# Exposure settings
EXPOSURE_TIME=2000      # in microseconds (6 seconds)
ISO=1

# Capture interval in seconds (time between shots)
INTERVAL=5

# Number of photos to capture (0 for infinite)
NUM_PHOTOS=0

# Output video settings
VIDEO_OUTPUT="$SAVE_DIR/astro_timelapse_2.mp4"
FRAME_RATE=30

###########################
# FUNCTIONS
###########################

capture_image() {
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    FILENAME="$SAVE_DIR/astro_$TIMESTAMP.jpg"
    rpicam-still -o "$FILENAME" \
                 --shutter $EXPOSURE_TIME \
                 --gain $ISO \
                    --denoise off \
                 --nopreview
    echo "Captured $FILENAME"
}

create_timelapse() {
    echo "Creating timelapse video..."
    ffmpeg -framerate $FRAME_RATE -pattern_type glob -i "$SAVE_DIR/astro_*.jpg" \
           -c:v libx264 -pix_fmt yuv420p "$VIDEO_OUTPUT"
    echo "Timelapse saved to $VIDEO_OUTPUT"
}

###########################
# MAIN LOOP
###########################

echo "Starting astrophotography session with rpicam-still..."
COUNT=0

# while true; do
#     capture_image
#     COUNT=$((COUNT + 1))
#     if [ $NUM_PHOTOS -ne 0 ] && [ $COUNT -ge $NUM_PHOTOS ]; then
#         break
#     fi
#     sleep $INTERVAL
# done

create_timelapse
echo "Astrophotography session completed!"