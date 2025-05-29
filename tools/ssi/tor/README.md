# Tor Browser implementation version

For reference, we are merging the SSI components into the Tor Browser. These patches record updates to the Tor Browser that mounts the SSI components, and tracks merge requests for the main branch of the SSI components and Firefox version upgrades.

Tor Browser rebases separate branch managements for each version, and since it is difficult to integrate versions without discrepancies in the git history, we periodically re-create them from the Tor Browser repository tag and force-push them to our remote repository. **Be careful about using older tags.**

Below is the ongoing merge management. Again, this is periodically reset, e.g. when Tor Browser has a major version update, the merge restarts zero-based from the new Tor Browser tag.

## Merge manual
- Cherry-pick the merge commits on the main branch of SSI components.
- Create a diff patch compared to previous release.
- IMPORTANT: Firefox upgrades should be done via the tor tag (e.g. `tor-browser-128.7.0esr-14.0-1-build3`).
  - Not use the firefox-upgrade merge request of ssi repository.
  - Make it a separate independent patch, not mixed with others.

## Merge history
git checkout -b mvp-tor tor-browser-128.10.0esr-14.5-1-build2
ssb-merge-1.patch
ssb-munual-1.patch

### ssb-merge-1.patch
- git merge v0.7.0mvp-128.10.0esr
