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

if [ -z "$GRADLE_MAVEN_REPOSITORIES" ]; then
	GRADLE_MAVEN_REPOSITORIES="$HOME/.m2/repository"
fi

os="$(uname -s)"
case "${os}" in
    Linux*)     os=unknown-linux;;
    Darwin*)    os=apple-darwin;;
	# This is not quite correct, however the only option for the nimbus-fml
	# build are these three... so if it's not Linux or Darwin it's very likely
	# we are building from Windows. I apologize in advance to all the BSD users.
    *)          os="pc-windows";;
esac

arch="$(uname -m)"
case "${arch}" in
	# Also no quite correct, but again these are the only options for nimbus-fml.
	aarch64)    arch=aarch64;;
	arm64)      arch=aarch64;;
	*)          arch="x86_64";;
esac

if [ "$os" = "unsupported" ] || [ "$arch" = "unsupported" ]; then
	echo "Android builds from $os-$arch are not supported."
	exit 2
fi

app_services="$(ls -1t "$TOR_BROWSER_BUILD/out/application-services/"application-services*.tar.zst | head -1)"
mkdir -p "$GRADLE_MAVEN_REPOSITORIES/org/mozilla"
if [ -f "$app_services" ]; then
	tar -C /tmp -xf "$app_services"
	cp -r /tmp/application-services/maven/org/mozilla/* "$GRADLE_MAVEN_REPOSITORIES/org/mozilla"

	# Over on tor-browser-build all build tools are built for x86_64-linux.
	# If we are not building from that platform, we need to fetch the correct
	# nimbus-fml binary.
	#
	# Even though we do modify nimbus-fml in tbb, all the changes are made to
	# support reproducibility and are not necessary for development builds.
	if [ "$os" != "unknown-linux" ] || [ "$arch" != "x86_64" ]; then
		echo "Downloading nimbus-fml binary for $arch-$os"
		app_services_version=$(echo "$app_services" | grep -oE 'application-services-[0-9]+\.[0-9]+\.[0-9]+' | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')

		curl -L -o /tmp/nimbus-fml.zip "https://archive.mozilla.org/pub/app-services/releases/$app_services_version/nimbus-fml.zip"
		unzip -d /tmp/nimbus-fml /tmp/nimbus-fml.zip
		nimbus_fml="$(find "/tmp/nimbus-fml/" -name 'nimbus-fml*' | grep "$arch-$os")"
		echo "Using nimbus-fml binary: $nimbus_fml"
		cp $nimbus_fml tools/

		rm -rf /tmp/nimbus-fml
		rm /tmp/nimbus-fml.zip
	else
		cp /tmp/application-services/nimbus-fml tools/
	fi
	chmod +x tools/nimbus-fml

	rm -rf /tmp/application-services
else
	echo "Cannot find application-services artifacts!"
	exit 2
fi
