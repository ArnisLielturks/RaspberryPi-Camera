#!/bin/bash
set -e
while true
do
filenameEnd="test/longexposure_$(date +%Y%m%d_%H%M%S)-999.png"
filenamePrefix="test/longexposure_$(date +%Y%m%d_%H%M%S)"
for i in {1..30}; do

echo ""
echo ""
echo ""
echo "----------------------------"
	echo "Taking picture $i"
 rpicam-still \
 -o "$filenamePrefix-$i.png" \
 -e png \
 --width 3280 \
 --height 2464 \
 --shutter 5000000 \
 --gain 8 \
 --awb tungsten \
 --denoise off \
 --nopreview
done

echo "Finalizing frames into single picture $filenameEnd"

ffmpeg -pattern_type glob -i "$filenamePrefix-*.png" \
-vf tmix=frames=30 \
-vf "tblend=all_mode=average,hqdn3d=3:3:6:6,eq=gamma=2.5:contrast=2.2:brightness=0.35" \
-frames:v 1 \
-y \
$filenameEnd

done
