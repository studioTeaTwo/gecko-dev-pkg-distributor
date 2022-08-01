#!/bin/sh
set -e

BINARIES="$1"
BUILD_OUTPUT="$2"

if [ ! -d "$BUILD_OUTPUT" ]; then
    echo "Error: $BUILD_OUTPUT directory does not exist."
    echo "Make sure to run `mach ./build` or `make -C tools/torbrowser build`."
    exit 1
fi

if [ ! -d "$BINARIES" ]; then
    echo "Error: $BINARIES directory does not exist."
    echo "Make sure to run `make -C tools/torbrowser fetch`."
    exit 1
fi

if [ "$(uname)" = "Darwin" ]; then
    cp -r "$BINARIES/Tor Browser.app/Contents/MacOS/Tor" "$BUILD_OUTPUT/dist/firefox/"*.app/Contents/MacOS
    cp -r "$BINARIES/Tor Browser.app/Contents/Resources/fonts" "$BUILD_OUTPUT/dist/firefox/"*.app/Contents/Resources
else
    cp -r "$BINARIES/dev/Browser/fonts" "$BUILD_OUTPUT/dist/bin"
    cp -r "$BINARIES/dev/Browser/TorBrowser" "$BUILD_OUTPUT/dist/bin"
fi
