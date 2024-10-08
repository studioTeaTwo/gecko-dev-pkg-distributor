#!/bin/bash
set -e
DEV_ROOT=$1
ARCH=$2
VARIANT=$3

source android-env.sh

cd $DEV_ROOT/mobile/android/fenix
MOZCONFIG=mozconfig-android-$ARCH $GRADLE_HOME/bin/gradle --no-daemon -Dorg.gradle.jvmargs=-Xmx20g -PdisableOptimization assemble$VARIANT
tools/tba-sign-devbuilds.sh
