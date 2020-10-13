#!/bin/bash

cd "$(dirname $(realpath "$0"))/.."

if [ -z "$TOR_BROWSER_BUILD" ]; then
	TOR_BROWSER_BUILD=../../../../tor-browser-build
fi

tor_expert_bundle_aar="$(ls -1td "$TOR_BROWSER_BUILD/out/tor-expert-bundle-aar/"tor-expert-bundle-aar-* | head -1)"
if [ -z "tor_expert_bundle_aar" ]; then
	echo "Cannot find Tor Expert Bundle arr artifacts!"
	exit 2
fi

cp "$tor_expert_bundle_aar"/* app/

noscript="$(find "$TOR_BROWSER_BUILD/out/browser" -name 'noscript*.xpi' -print | sort | tail -1)"
mkdir -p "app/src/main/assets/extensions"
if [ -f "$noscript" ]; then
	cp "$noscript" "app/src/main/assets/extensions/{73a6fe31-595d-460b-a920-fcc0f8843232}.xpi"
fi
