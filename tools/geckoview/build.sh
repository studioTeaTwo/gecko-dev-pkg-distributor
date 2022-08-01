#!/bin/bash
set -e
DEV_ROOT=$1
ARCH=$2

source android-env.sh

cd $DEV_ROOT
MOZCONFIG=mozconfig-android-$ARCH  ./mach build
