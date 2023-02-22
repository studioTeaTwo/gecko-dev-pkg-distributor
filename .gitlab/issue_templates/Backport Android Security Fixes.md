<details>
  <summary>Explanation of Variables</summary>

- `$(ESR_VERSION)`: the Mozilla defined ESR version, used in various places for building tor-browser tags, labels, etc
  - **Example**: `102.8.0`
- `$(RR_VERSION)`: the Mozilla defined Rapid-Release version; Tor Browser for Android is based off of the `$(ESR_VERSION)`, but Mozilla's Firefox for Android is based off of the `$(RR_VERSION)` so we need to keep track of security vulnerabilities to backport from the monthly Rapid-Release train and our frozen ESR train.
  - **Example**: `110`
- `$(PROJECT_NAME)`: the name of the browser project, either `base-browser` or `tor-browser`
- `$(TOR_BROWSER_MAJOR)`: the Tor Browser major version
  - **Example**: `12`
- `$(TOR_BROWSER_MINOR)`: the Tor Browser minor version
  - **Example**: either `0` or `5`; Alpha's is always `(Stable + 5) % 10`
- `$(BUILD_N)`: a project's build revision within a its branch; many of the Firefox-related projects have a `$(BUILD_N)` suffix and may differ between projects even when they contribute to the same build.
  - **Example**: `build1`
</details>

**NOTE:** It is assumed the `tor-browser` rebases (stable and alpha) have already happened and there exists a `build1` build tags for both `base-browser` and `tor-browser` (stable and alpha)

### **Bookkeeping**

- [ ] Link this issue to the appropriate [Release Prep](https://gitlab.torproject.org/tpo/applications/tor-browser-build/-/issues/?sort=updated_desc&state=opened&label_name%5B%5D=Release%20Prep) issues (stable and alpha).

### **Security Vulnerabilities Report**: https://www.mozilla.org/en-US/security/advisories/

- Potentially Affected Components:
  - `firefox`/`geckoview`: https://github.com/mozilla/gecko-dev
  - `application-services`: https://github.com/mozilla/application-services
  - `android-components` (ESR 102 only): https://github.com/mozilla-mobile/firefox-android
  - `fenix` (ESR 102 only): https://github.com/mozilla-mobile/firefox-android
  - `firefox-android`: https://github.com/mozilla-mobile/firefox-android

**NOTE:** `android-components` and `fenix` used to have their own repos, but since November 2022 they have converged to a single `firefox-android` repo. Any backports will require manually porting patches over to our legacy repos until we have transitioned to ESR 115.

- [ ] Go through the `Security Vulnerabilities fixed in Firefox $(RR_VERSION)` report and create a candidate list of CVEs which potentially need to be backported in this issue:
  - CVEs which are explicitly labeled as 'Android' only
  - CVEs which are fixed in Rapid Release but not in ESR
  - 'Memory safety bugs' fixed in Rapid Release but not in ESR
- [ ] Foreach issue:
  - Create link to the CVE on [mozilla.org](https://www.mozilla.org/en-US/security/advisories/)
    - **Example**: https://www.mozilla.org/en-US/security/advisories/mfsa2023-05/#CVE-2023-25740
  - Create link to the associated Bugzilla issues (found in the CVE description)
  - Create links to the relevant `gecko-dev`/other commit hashes which need to be backported OR a brief justification for why the fix does not need to be backported
    - To find the `gecko-dev` version of a `mozilla-central`, search for a unique string in the relevant `mozilla-central` commit message in the `gecko-dev/release` branch log.
    - **NOTE:** This process is unfortunately somewhat poorly defined/ad-hoc given the general variation in how Bugzilla issues are labeled and resolved. In general this is going to involve a bit of hunting to identify needed commits or determining whether or not the fix is relevant.

### CVEs

<!-- CVE Resolution Template, foreach CVE to investigate add an entry in the form:
- [ ] https://www.mozilla.org/en-US/security/advisories/mfsaYYYY-NN/#CVE-YYYY-XXXXX // CVE description
  - https://bugzilla.mozilla.org/show_bug.cgi?id=NNNNNN // Bugzilla issue
  - **Note**: Any relevant info about this fix, justification for why it is not necessary, etc
  - **Patches**
    - firefox-android: https://link.to/relevant/patch
    - firefox: https://link.to/relevant/patch
 -->

### **tor-browser**: https://gitlab.torproject.org/tpo/applications/tor-browser.git
- [ ] Backport any Android-specific security fixes from Firefox rapid-release
  - [ ] Backport patches to `tor-browser` stable branch
  - [ ] Open MR
  - [ ] Merge
  - [ ] Rebase patches onto:
    - [ ] `base-browser` stable
    - [ ] `tor-browser` alpha
    - [ ] `base-browser` alpha
  - [ ] Sign/Tag commits:
    - **Tag**: `$(PROJECT_NAME)-$(ESR_VERSION)-$(TOR_BROWSER_MAJOR).$(TOR_BROWSER_MINOR)-1-$(BUILD_N)`
    - **Message**: `Tagging $(BUILD_N) for $(ESR_VERSION)-based stable|alpha)`
    - [ ] `base-browser` stable
    - [ ] `tor-browser` stable
    - [ ] `base-browser` alpha
    - [ ] `tor-browser` alpha
  - [ ] Push tags to `upstream`
- **OR**
- [ ] No backports

### **application-services**: https://gitlab.torproject.org/tpo/applications/application-services
- **NOTE**: we will need to setup a gitlab copy of this repo and update `tor-browser-build` before we can apply security backports here
- [ ] Backport any Android-specific security fixes from Firefox rapid-release
  - [ ] Backport patches to `application-services` stable branch
  - [ ] Open MR
  - [ ] Merge
  - [ ] Rebase patches onto `application-services` alpha
  - [ ] Sign/Tag commits:
    - **Tag**: `application-services-$(ESR_VERSION)-$(TOR_BROWSER_MAJOR).$(TOR_BROWSER_MINOR)-1-$(BUILD_N)`
    - **Message**: `Tagging $(BUILD_N) for $(ESR_VERSION)-based stable|alpha`
    - [ ] `application-services` stable
    - [ ] `application-services` alpha
  - [ ] Push tags to `upstream`
- **OR**
- [ ] No backports


### **android-components (Optional, ESR 102)**: https://gitlab.torproject.org/tpo/applications/android-components.git
- [ ] Backport any Android-specific security fixes from Firefox rapid-release
  - **NOTE**: Since November 2022, this repo has been merged with `fenix` into a singular `firefox-android` repo: https://github.com/mozilla-mobile/firefox-android. Any backport will require a patch rewrite to apply to our legacy `android-components` project.
  - [ ] Backport patches to `android-components` stable branch
  - [ ] Open MR
  - [ ] Merge
  - [ ] Rebase patches onto `android-components` alpha
  - [ ] Sign/Tag commits:
    - **Tag**: `android-components-$(ESR_VERSION)-$(TOR_BROWSER_MAJOR).$(TOR_BROWSER_MINOR)-1-$(BUILD_N)`
    - **Message**: `Tagging $(BUILD_N) for $(ESR_VERSION)-based stable|alpha)`
    - [ ] `android-components` stable
    - [ ] `android-components` alpha
  - [ ] Push tags to `upstream`
- **OR**
- [ ] No backports


### **fenix (Optional, ESR 102)**: https://gitlab.torproject.org/tpo/applications/fenix.git
- [ ] Backport any Android-specific security fixes from Firefox rapid-release
  - **NOTE**: Since February 2023, this repo has been merged with `android-components` into a singular `firefox-android` repo: https://github.com/mozilla-mobile/firefox-android. Any backport will require a patch rewrite to apply to our legacy `fenix` project.
  - [ ] Backport patches to `fenix` stable branch
  - [ ] Open MR
  - [ ] Merge
  - [ ] Rebase patches onto `fenix` alpha
  - [ ] Sign/Tag commits:
    - **Tag**: `tor-browser-$(ESR_VERSION)-$(TOR_BROWSER_MAJOR).$(TOR_BROWSER_MINOR)-1-$(BUILD_N)`
    - **Message**: `Tagging $(BUILD_N) for $(ESR_VERSION)-based stable|alpha)`
    - [ ] `fenix` stable
    - [ ] `fenix` alpha
  - [ ] Push tags to `upstream`
- **OR**
- [ ] No backports

### **firefox-android**: https://gitlab.torproject.org/tpo/applications/firefox-android
- [ ] Backport any Android-specific security fixes from Firefox rapid-release
  - [ ] Backport patches to `firefox-android` stable branch
  - [ ] Open MR
  - [ ] Merge
  - [ ] Rebase patches onto `fenix` alpha
  - [ ] Sign/Tag commits:
    - **Tag**: `firefox-android-$(ESR_VERSION)-$(TOR_BROWSER_MAJOR).$(TOR_BROWSER_MINOR)-1-$(BUILD_N)`
    - **Message**: `Tagging $(BUILD_N) for $(ESR_VERSION)-based stable|alpha)`
    - [ ] `firefox-android` stable
    - [ ] `firefox-android` alpha
  - [ ] Push tags to `upstream`
- **OR**
- [ ] No backports

/confidential
