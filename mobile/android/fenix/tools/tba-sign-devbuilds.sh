#!/bin/bash

cd "$(dirname $(realpath "$0"))/.."

if [ -z "$TOR_BROWSER_BUILD" ]; then
	TOR_BROWSER_BUILD=../../tor-browser-build
fi
key="$TOR_BROWSER_BUILD/projects/browser/android-qa.keystore"
if [ ! -f "$key" ]; then
	echo "Please define TOR_BROWSER_BUILD with the path to tor-browser-build"
	exit 2
fi

tools="$ANDROID_HOME/build-tools/31.0.0"
apksigner="$tools/apksigner"
zipalign="$tools/zipalign"
if [ ! -x "$apksigner" ]; then
	echo "apksigner not found at $apksigner. Please make sure ANDROID_HOME is defined"
	exit 3
fi

noscript="$(find "$TOR_BROWSER_BUILD/out/browser" -name 'noscript*.xpi' -print | sort | tail -1)"
tmpdir="$(mktemp -d)"
mkdir -p "$tmpdir/assets/extensions"
if [ -f "$noscript" ]; then
	cp "$noscript" "$tmpdir/assets/extensions/{73a6fe31-595d-460b-a920-fcc0f8843232}.xpi"
fi

sign () {
	apk="$(realpath $1)"
	out="$apk"
	if [ ! -f "$apk" ]; then
		return
	fi
	out="${out/unsigned/signed}"
	aligned="$apk"
	aligned="${aligned/unsigned/aligned}"
	pushd "$tmpdir" > /dev/null
	zip -Xr "$apk" assets > /dev/null
	popd > /dev/null
	rm -f "$aligned"
	"$zipalign" -p 4 "$apk" "$aligned"
	"$apksigner" sign --ks "$key" --in "$aligned" --out "$out" --ks-key-alias androidqakey --key-pass pass:android --ks-pass pass:android
	echo "Signed $out"
}

for channel in app/build/outputs/apk/fenix/*; do
	for apk in $channel/*-unsigned.apk; do
		sign "$apk"
	done
done

rm -rf "$tmpdir"
