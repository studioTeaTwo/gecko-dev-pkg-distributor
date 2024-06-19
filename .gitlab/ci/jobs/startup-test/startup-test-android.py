#!/usr/bin/env python3
import argparse
import json
import os
import sys
import time
from datetime import datetime, timedelta
from enum import Enum

import requests

"""
This script runs Android tests on BrowserStack using the BrowserStack App Automate Espresso API.

Usage:
    startup-test-android.py --devices <devices> [--tests <tests>] [--app_file_path <app_file_path>] [--test_file_path <test_file_path>]

Arguments:
    --devices: Comma-separated list of devices to test on (required).
    --tests: Comma-separated list of tests to run (optional). If not provided, all tests will run.
    --app_file_path: Path to the app file (optional). If not provided, yesterday's nightly will be downloaded.
    --test_file_path: Path to the test file (optional). If not provided, yesterday's nightly will be downloaded.

Environment Variables:
    BROWSERSTACK_USERNAME: BrowserStack username (required).
    BROWSERSTACK_API_KEY: BrowserStack API key (required).

Description:
    - If app and test file paths are not provided, the script downloads the latest nightly build from the Tor Project.
    - Uploads the app and test files to BrowserStack.
    - Triggers the test run on the specified devices.
    - Polls for the test status until completion or timeout.
    - Prints the test results and exits with an appropriate status code.
"""

parser = argparse.ArgumentParser(
    description="Run Android startup tests on BrowserStack."
)
parser.add_argument(
    "--devices",
    type=str,
    help="Comma-separated list of devices to test on",
    required=True,
)
parser.add_argument("--tests", type=str, help="Comma-separated list of tests to run")
parser.add_argument("--app_file_path", type=str, help="Path to the app file")
parser.add_argument("--test_file_path", type=str, help="Path to the test file")

args = parser.parse_args()

if args.app_file_path:
    app_file_path = args.app_file_path
    test_file_path = args.test_file_path
    if not test_file_path:
        print(
            "\033[1;31mIf either app or test file paths are provided, both must be provided.\033[0m"
        )
else:

    def download_file(url, dest_path):
        try:
            response = requests.get(url, stream=True)
            response.raise_for_status()
            with open(dest_path, "wb") as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
        except Exception as e:
            print(f"\033[1;31mFailed to download file from {url}.\033[0m")
            print(e)
            sys.exit(1)

    yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y.%m.%d")
    download_url_base = f"https://nightlies.tbb.torproject.org/nightly-builds/tor-browser-builds/tbb-nightly.{yesterday}/nightly-android-aarch64"
    print(
        f"No file paths provided, downloading yesterday's nightly from {download_url_base}"
    )

    app_file_url = f"{download_url_base}/tor-browser-noopt-android-aarch64-tbb-nightly.{yesterday}.apk"
    test_file_url = (
        f"{download_url_base}/tor-browser-tbb-nightly.{yesterday}-androidTest.apk"
    )

    # BrowserStack will fail if there are `.` in the file name other than before the extension.
    yesterday = yesterday.replace(".", "-")
    app_file_path = f"/tmp/nightly-{yesterday}.apk"
    test_file_path = f"/tmp/nightly-test-{yesterday}.apk"

    download_file(app_file_url, app_file_path)
    download_file(test_file_url, test_file_path)

devices = [device.strip() for device in args.devices.split(",")]
tests = args.tests.split(",") if args.tests else []

browserstack_username = os.getenv("BROWSERSTACK_USERNAME")
browserstack_api_key = os.getenv("BROWSERSTACK_API_KEY")
if not browserstack_username or not browserstack_api_key:
    print(
        "\033[1;31mEnvironment variables BROWSERSTACK_USERNAME and BROWSERSTACK_API_KEY must be set.\033[0m"
    )
    sys.exit(1)

# Upload app file
with open(app_file_path, "rb") as app_file:
    response = requests.post(
        "https://api-cloud.browserstack.com/app-automate/espresso/v2/app",
        auth=(browserstack_username, browserstack_api_key),
        files={"file": app_file},
    )

if response.status_code != 200:
    print("\033[1;31mFailed to upload app file.\033[0m")
    print(response.text)
    sys.exit(1)

bs_app_url = response.json().get("app_url")
print("\033[1;32mSuccessfully uploaded app file.\033[0m")
print(f"App URL: {bs_app_url}")

# Upload test file
with open(test_file_path, "rb") as test_file:
    response = requests.post(
        "https://api-cloud.browserstack.com/app-automate/espresso/v2/test-suite",
        auth=(browserstack_username, browserstack_api_key),
        files={"file": test_file},
    )

if response.status_code != 200:
    print("\033[1;31mFailed to upload test file.\033[0m")
    print(response.text)
    sys.exit(1)

bs_test_url = response.json().get("test_suite_url")
print("\033[1;32mSuccessfully uploaded test file.\033[0m")
print(f"Test URL: {bs_test_url}")

# Trigger tests
test_params = {
    "app": bs_app_url,
    "testSuite": bs_test_url,
    "devices": devices,
    "class": tests,
}

response = requests.post(
    "https://api-cloud.browserstack.com/app-automate/espresso/v2/build",
    auth=(browserstack_username, browserstack_api_key),
    headers={"Content-Type": "application/json"},
    data=json.dumps(test_params),
)

if response.status_code != 200:
    print("\033[1;31mFailed to trigger test run.\033[0m")
    print(response.text)
    sys.exit(1)

build_id = response.json().get("build_id")
print("\033[1;32mSuccessfully triggered test run.\033[0m")
print(
    f"Test status also available at: https://app-automate.browserstack.com/builds/{build_id}\n==="
)

# Poll for status
POLLING_TIMEOUT = 30 * 60  # 30min
POLLING_INTERVAL = 30  # 30s


class TestStatus(Enum):
    QUEUED = "queued"
    RUNNING = "running"
    ERROR = "error"
    FAILED = "failed"
    PASSED = "passed"
    TIMED_OUT = "timed out"
    SKIPPED = "skipped"

    @classmethod
    def from_string(cls, s):
        try:
            return cls[s.upper().replace(" ", "_")]
        except KeyError:
            raise ValueError(f"\033[1;31m'{s}' is not a valid test status.\033[0m")

    def is_terminal(self):
        return self not in {TestStatus.QUEUED, TestStatus.RUNNING}

    def is_success(self):
        return self in {TestStatus.PASSED, TestStatus.SKIPPED}

    def color_print(self):
        if self == TestStatus.PASSED:
            return f"\033[1;32m{self.value}\033[0m"

        if self in {TestStatus.ERROR, TestStatus.FAILED, TestStatus.TIMED_OUT}:
            return f"\033[1;31m{self.value}\033[0m"

        if self == TestStatus.SKIPPED:
            return f"\033[1;33m{self.value}\033[0m"

        return self.value


start_time = time.time()
elapsed_time = 0
test_status = None
while elapsed_time <= POLLING_TIMEOUT:
    response = requests.get(
        f"https://api-cloud.browserstack.com/app-automate/espresso/v2/builds/{build_id}",
        auth=(browserstack_username, browserstack_api_key),
    )

    if response.status_code != 200:
        print("\033[1;31mFailed to get test status.\033[0m")
        print(response.text)
        sys.exit(1)

    test_status = TestStatus.from_string(response.json().get("status"))
    if test_status.is_terminal():
        print(f"===\nTest finished. Result: {test_status.color_print()}")
        break
    else:
        elapsed_time = time.time() - start_time
        print(f"Test status: {test_status.value} ({elapsed_time:.2f}s)")

        if elapsed_time > POLLING_TIMEOUT:
            print("===\n\033[1;33mWaited for tests for too long.\033[0m")
            break

        time.sleep(POLLING_INTERVAL)

if test_status is None or not test_status.is_success():
    sys.exit(1)
