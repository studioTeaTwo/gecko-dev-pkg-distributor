#!/bin/bash
# MIT License
#
# Copyright (c) 2020 Srevin Saju
# 
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.




set -eu

export APPIMAGE_EXTRACT_AND_RUN=1

WORKFLOW_PATH=.github/workflows/src/appimage

rm -rf build/AppDir
rm -rf build/ssb

tar -xvf build/src/ssb-*.tar.bz2 -C build
mv build/ssb build/AppDir

echo "==> Copying AppRun"
cat $WORKFLOW_PATH/AppRun | sed "s,FIREFOX_BIN_FILE,$( basename build/AppDir/ssb-bin ),g" > build/AppDir/AppRun
chmod 755 build/AppDir/AppRun

echo "==> Copying Firefox Desktop file"
cp $WORKFLOW_PATH/ssb.desktop build/AppDir/.

echo "==> Disable Auto Updates"
cp -r $WORKFLOW_PATH/distribution build/AppDir/.

FIREFOX_ICON_NAME="$( cat $WORKFLOW_PATH/ssb.desktop | grep 'Icon=' | sed 's,Icon=,,g' )"
echo "==> Copying icon :: $FIREFOX_ICON_NAME"
ln -sr build/AppDir/browser/chrome/icons/default/default128.png build/AppDir/$FIREFOX_ICON_NAME.png

echo "==> Downloading appimagetool" 
wget "https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-$(uname -m).AppImage" -O build/appimagetool
chmod +x build/appimagetool

echo "==> Generating AppImage"
GH_USER="$( echo $GITHUB_REPOSITORY | grep -o ".*/" | head -c-2 )"
GH_REPO="$( echo $GITHUB_REPOSITORY | grep -o "/.*" | cut -c2- )"

export FIREFOX_VERSION="$(cat build/AppDir/application.ini | grep -E 'Version' | head -n 1 | grep -E -o '[0-9]+.[0-9]+')"
export FIREFOX_BUILD_ID="$(cat build/AppDir/application.ini | grep -E 'BuildID' | head -n 1 | grep -E -o '[0-9]+')"

./build/appimagetool -n --comp gzip \
    build/AppDir \
    --updateinformation "gh-releases-zsync|$GH_USER|$GH_REPO|latest|ssb*.AppImage.zsync" \
    ssb-$GHA_display_version.linux-$GHA_ARCH.AppImage


echo "==> Done, saved $( realpath ssb*.AppImage)"

echo "==> GitHub Actions "