#!/bin/bash
set -e
DEV_ROOT=$1

cd $DEV_ROOT
./mach build

if [ -z "$LOCALES" ]; then
  ./mach build stage-package
else
  export MOZ_CHROME_MULTILOCALE=$LOCALES
  # No quotes on purpose
  ./mach package-multi-locale --locales en-US $MOZ_CHROME_MULTILOCALE
  AB_CD=multi ./mach build stage-package
fi
