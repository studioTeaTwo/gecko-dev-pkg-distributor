#!/bin/bash

cd "$(dirname $(realpath "$0"))/.."

if [ -z "$APKSIGNER_ARGS" ]; then
	if [ -z "$QA_KEY" ]; then
		if [ -z "$TOR_BROWSER_BUILD" ]; then
			TOR_BROWSER_BUILD=../../../../tor-browser-build
		fi
		QA_KEY="$TOR_BROWSER_BUILD/projects/browser/android-qa.keystore"
	fi
	if [ ! -f "$QA_KEY" ]; then
		echo "The QA key has not been found."
		echo "Please define either \$QA_KEY with its path, or \$TOR_BROWSER_BUILD with the path to tor-browser-build"
		exit 2
	fi
	APKSIGNER_ARGS="--ks "$QA_KEY" --ks-key-alias androidqakey --key-pass pass:android --ks-pass pass:android"
fi

if [ -z "$ANDROID_HOME" ]; then
	ANDROID_HOME=~/Android
fi

function find_tool() {
	tool="$(find $ANDROID_HOME -name "$1" | head -1)"
	if [ -z "$tool" ]; then
		tool=$(which $1)
	fi
	echo $tool
}

apksigner="$(find_tool apksigner)"
zipalign="$(find_tool zipalign)"
if [ -z "$apksigner" -o ! -x "$apksigner" -o -z "$zipalign" -o ! -x "$zipalign" ]; then
	echo "apksigner or zipalign not found."
	echo "Please make sure they are on your \$PATH, or define \$ANDROID_HOME."
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
	echo "Signing $out"
	"$apksigner" sign --in "$aligned" --out "$out" $APKSIGNER_ARGS
}

for channel in app/build/outputs/apk/fenix/*; do
	for apk in $channel/*-unsigned.apk; do
		sign "$apk"
	done
done

rm -rf "$tmpdir"
