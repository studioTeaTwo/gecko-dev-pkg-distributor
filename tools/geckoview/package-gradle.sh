#!/bin/bash
set -e
DEV_ROOT=$1
ARCH=$2

source android-env.sh

env ARCHS=$ARCH make fataar

cd $DEV_ROOT
MOZCONFIG=mozconfig-android-$ARCH ./mach build binaries
MOZCONFIG=mozconfig-android-$ARCH ./mach gradle geckoview:publishWithGeckoBinariesDebugPublicationToMavenRepository
MOZCONFIG=mozconfig-android-all ./mach gradle geckoview:publishWithGeckoBinariesDebugPublicationToMavenLocal exoplayer2:publishDebugPublicationToMavenLocal


