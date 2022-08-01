#!/bin/bash
set -e
IDE=$1
DEV_ROOT=$2

cd $DEV_ROOT
./mach ide $IDE
