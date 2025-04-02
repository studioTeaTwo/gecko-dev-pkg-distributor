# 🛡️ **Security Backports**

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

## **Bookkeeping**

- [ ] Link this issue to the appropriate [Release Prep](https://gitlab.torproject.org/tpo/applications/tor-browser-build/-/issues/?sort=updated_desc&state=opened&label_name%5B%5D=Apps%3A%3AType%3A%3AReleasePreparation) issues (alpha, stable, and legacy).

## **Security Vulnerabilities Report**: https://www.mozilla.org/en-US/security/advisories/

- Potentially Affected Components:
  - `firefox`/`geckoview`: https://github.com/mozilla/gecko-dev

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

## CVEs

<!-- CVE Resolution Template, foreach CVE to investigate add an entry in the form:
- [ ] https://www.mozilla.org/en-US/security/advisories/mfsaYYYY-NN/#CVE-YYYY-XXXXX // CVE description
  - https://bugzilla.mozilla.org/show_bug.cgi?id=NNNNNN // Bugzilla issue
  - **Note**: Any relevant info about this fix, justification for why it is not necessary, etc
  - **Patches**
    - firefox: https://link.to/relevant/patch
 -->

## **tor-browser**: https://gitlab.torproject.org/tpo/applications/tor-browser.git
- [ ] Backport any Android-specific security fixes from Firefox rapid-release
  - [ ] Backport patches to `tor-browser` stable branch
  - [ ] Open MR
  - [ ] Merge
  - [ ] cherry-pick patches onto:
    - [ ] `base-browser` stable
    - [ ] `mullvad-browser` stable
    - [ ] `tor-browser` alpha
    - [ ] `base-browser` alpha
    - [ ] `mullvad-browser` alpha
  - [ ] Sign/Tag commits:
    - In **tor-browser-build.git**, run signing script:
      ```bash
      ./tools/browser/sign-tag.${PROJECT_NAME} ${CHANNEL} ${BUILD_N}
      ```
    - [ ] `base-browser` stable
    - [ ] `tor-browser` stable
    - [ ] `mullvad-browser` stable
    - [ ] `base-browser` alpha
    - [ ] `tor-browser` alpha
    - [ ] `mullvad-browser` alpha

  - [ ] Push tags to `upstream`
- **OR**
- [ ] No backports

<!-- Do not edit beneath this line <3 -->

---

/confidential
/label ~"Apps::Product::TorBrowser"
/label ~"Apps::Product::MullvadBrowser"
/label ~"Apps::Type::Backport"
/label ~"Apps::Priority::Blocker"
