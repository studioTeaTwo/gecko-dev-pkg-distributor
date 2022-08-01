#!/bin/bash
set -e

BINARIES="$1"
BUILD_OUTPUT="$2"
SCRIPT_DIR="$(realpath "$(dirname "$0")")"

RESDIR="$BUILD_OUTPUT/dist/firefox"
if [ "$(uname)" = "Darwin" ]; then
    RESDIR="$RESDIR/Tor Browser.app/Contents/Resources"
fi

# Repackage the manual
# rm -rf $BUILD_OUTPUT/_omni
# mkdir $BUILD_OUTPUT/_omni
# unzip $BINARIES/dev/Browser/browser/omni.ja -d $BUILD_OUTPUT/_omni
# cd $BUILD_OUTPUT/_omni && zip -Xmr $RESDIR/browser/omni.ja chrome/browser/content/browser/manual
# rm -rf $BUILD_OUTPUT/_omni

if [ "$(uname)" = "Darwin" ]; then

    # copy binaries
    cp -r "$BUILD_OUTPUT/dist/firefox/"*.app/Contents/* "$BINARIES/Tor Browser.app/Contents/"
    rm -rf "$BINARIES/TorBrowser-Data/Browser/Caches/*.default/startupCache"

    # Self sign the Binaries
    cd "$BINARIES/Tor Browser.app/Contents/MacOS"
    "$SCRIPT_DIR/browser-self-sign-macos.sh"

else

    # backup the startup script
    mv "$BINARIES/dev/Browser/firefox" "$BINARIES/dev/Browser/firefox.bak"

    # copy binaries
    cp -r "$RESDIR/"* "$BINARIES/dev/Browser"
    rm -rf "$BINARIES/dev/Browser/TorBrowser/Data/Browser/profile.default/startupCache"

    # shuffle firefox bin around and restore script to match a real deployment
    mv "$BINARIES/dev/Browser/firefox" "$BINARIES/dev/Browser/firefox.real"
    mv "$BINARIES/dev/Browser/firefox.bak" "$BINARIES/dev/Browser/firefox"

fi
