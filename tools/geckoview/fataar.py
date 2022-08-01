#!/usr/bin/env python3
import os
import re
import subprocess
import sys

dev_root = sys.argv[1]
archs_in = re.split("\\s+|,", sys.argv[2]) if len(sys.argv) >= 3 else []
archs_out = []
env = dict(os.environ)

env["MOZCONFIG"] = "mozconfig-android-all"
if "armv7" in archs_in:
    env["MOZ_ANDROID_FAT_AAR_ARMEABI_V7A"] = (
        dev_root
        + "/obj-arm-linux-androideabi/gradle/build/mobile/android/geckoview/outputs/aar/geckoview-withGeckoBinaries-debug.aar"
    )
    archs_out.append("armeabi-v7a")
if "aarch64" in archs_in:
    env["MOZ_ANDROID_FAT_AAR_ARM64_V8A"] = (
        dev_root
        + "/obj-aarch64-linux-android/gradle/build/mobile/android/geckoview/outputs/aar/geckoview-withGeckoBinaries-debug.aar"
    )
    archs_out.append("arm64-v8a")
if "x86" in archs_in or "i686" in archs_in:
    env["MOZ_ANDROID_FAT_AAR_X86"] = (
        dev_root
        + "/obj-i386-linux-android/gradle/build/mobile/android/geckoview/outputs/aar/geckoview-withGeckoBinaries-debug.aar"
    )
    archs_out.append("x86")
if "x86_64" in archs_in or "x86-64" in archs_in:
    env["MOZ_ANDROID_FAT_AAR_X86_64"] = (
        dev_root
        + "/obj-x86_64-linux-android/gradle/build/mobile/android/geckoview/outputs/aar/geckoview-withGeckoBinaries-debug.aar"
    )
    archs_out.append("x86_64")
env["MOZ_ANDROID_FAT_AAR_ARCHITECTURES"] = ",".join(archs_out)

if not archs_out:
    print(
        "The architectures have not specified or are not valid.",
        file=sys.stderr,
    )
    print('Usage: make fat-aar ARCHS="$archs"', file=sys.stderr)
    print(
        "Valid architectures are armv7 aarch64 x86 x86_64, and must be separated with a space.",
        file=sys.stderr,
    )
    sys.exit(1)

subprocess.run(["./mach", "configure"], cwd=dev_root, env=env, check=True)
subprocess.run(["./mach", "build"], cwd=dev_root, env=env, check=True)
