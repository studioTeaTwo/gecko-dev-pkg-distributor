#!/bin/sh
set -e

BINARIES_DIR="$1"

# download the current downloads.json
wget https://aus1.torproject.org/torbrowser/update_3/alpha/downloads.json
# get url for latest alpha linux package
TOR_BROWSER_VERSION=$(grep -Eo "\"version\":\"[0-9.a]+\"" downloads.json | grep -Eo "[0-9.a]+")
if [ "$(uname)" = "Darwin" ]; then
    TOR_BROWSER_PACKAGE="tor-browser-macos-${TOR_BROWSER_VERSION}.dmg"
  else
    TOR_BROWSER_PACKAGE="tor-browser-linux-x86_64-${TOR_BROWSER_VERSION}.tar.xz"
fi
TOR_BROWSER_PACKAGE_URL="https://dist.torproject.org/torbrowser/${TOR_BROWSER_VERSION}/${TOR_BROWSER_PACKAGE}"

# remove download manifest
rm downloads.json

# clear out previous tor-browser and previous package
rm -rf "${BINARIES_DIR}"
rm -f "${TOR_BROWSER_PACKAGE}"

# download
wget "${TOR_BROWSER_PACKAGE_URL}"
mkdir -p "${BINARIES_DIR}"

# and extract
if [ "$(uname)" = "Darwin" ]
  then
    hdiutil attach "${TOR_BROWSER_PACKAGE}"
    cp -R "/Volumes/Tor Browser Alpha/Tor Browser Alpha.app" "${BINARIES_DIR}/Tor Browser.app"
    hdiutil detach "/Volumes/Tor Browser Alpha"
  else
    tar -xf "${TOR_BROWSER_PACKAGE}" -C "${BINARIES_DIR}"
    mv "${BINARIES_DIR}/tor-browser" "${BINARIES_DIR}/dev"
fi

# Final cleanup
rm -f "${TOR_BROWSER_PACKAGE}"
