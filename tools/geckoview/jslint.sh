#!/bin/bash
set -e
DEV_ROOT=$1
JS_FILE=$2

source android-env.sh

cd $DEV_ROOT
./mach lint -l eslint --fix $JS_FILE
