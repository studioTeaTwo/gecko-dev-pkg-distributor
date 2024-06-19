#!/usr/bin/env python3

import argparse
import subprocess
from datetime import datetime, timedelta

PLATFORM_TO_ARCH = {
    "linux": ["x86_64", "i686"],
    "macos": ["x86_64", "aarch64"],
    "windows": ["x86_64", "i686"],
}


class DynamicArchAction(argparse.Action):
    def __call__(self, parser, namespace, values, option_string=None):
        platform = getattr(namespace, "platform", None)
        if not platform:
            raise argparse.ArgumentError(
                self, "The --platform argument must be provided before --arch."
            )

        valid_archs = PLATFORM_TO_ARCH.get(platform, [])
        if values not in valid_archs:
            raise argparse.ArgumentError(
                self,
                f"Invalid architecture '{values}' for platform '{platform}'. "
                f"Valid options are: {', '.join(valid_archs)}",
            )
        setattr(namespace, self.dest, values)


parser = argparse.ArgumentParser(
    description="Downloads and executes yesterday's build of Tor or Mullvad browser nightly."
)

parser.add_argument(
    "--platform",
    required=True,
    help="Specify the platform (linux, macos or windows). Must be provided before --arch.",
    choices=PLATFORM_TO_ARCH.keys(),
)
parser.add_argument(
    "--arch",
    required=True,
    help="Specify the architecture (validated dynamically based on --platform).",
    action=DynamicArchAction,
)
parser.add_argument(
    "--browser",
    required=True,
    choices=["tor", "mullvad"],
    help="Specify the browser (tor or mullvad)",
)

args = parser.parse_args()
arch = f"-{args.arch}"
extra = ""

if args.platform == "linux":
    archive_extension = "tar.xz"
    binary = f"Browser/start-{args.browser}-browser"
elif args.platform == "macos":
    archive_extension = "dmg"
    # The URL doesn't include the architecture for MacOS,
    # because it's a universal build.
    arch = ""
    if args.browser == "tor":
        binary = "Contents/MacOS/firefox"
    else:
        binary = "Contents/MacOS/mullvadbrowser"
elif args.platform == "windows":
    archive_extension = "exe"

    if args.browser == "tor":
        extra = "-portable"
        binary = "Browser/firefox.exe"
    else:
        binary = "mullvadbrowser.exe"

yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y.%m.%d")

download_url_base = (
    "https://nightlies.tbb.torproject.org/nightly-builds/tor-browser-builds"
)
if args.browser == "tor":
    download_url = f"{download_url_base}/tbb-nightly.{yesterday}/nightly-{args.platform}{arch}/{args.browser}-browser-{args.platform}{arch}{extra}-tbb-nightly.{yesterday}.{archive_extension}"
else:
    download_url = f"{download_url_base}/tbb-nightly.{yesterday}/mullvadbrowser-nightly-{args.platform}{arch}/{args.browser}-browser-{args.platform}{arch}-tbb-nightly.{yesterday}.{archive_extension}"

subprocess.run(
    [
        "python3",
        "testing/mozharness/scripts/does_it_crash.py",
        "--run-for",
        "30",
        "--thing-url",
        download_url,
        "--thing-to-run",
        binary,
    ]
)
