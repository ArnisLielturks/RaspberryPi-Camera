#!/bin/bash

mkdir -p pics

while true
do
    filename="pics3/longexposure_$(date +%Y%m%d_%H%M%S).jpg"
#3280x2464
    rpicam-still \
        -o "$filename" \
        --width 2180 \
        --height 2464 \
        --shutter 1500000 \
        --gain 2 \
        --awb auto \
	--framerate 5

    sleep 10
done
