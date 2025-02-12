Started over from v0.2.0mvp. Be careful about using older tags.

## merge manual
- Cherry-pick merge requests on ssi repository.
- Firefox upgrades should be done via the tor tag (e.g. `tor-browser-128.7.0esr-14.0-1-build3`). Not use the update merge request of ssi repository.
  - Make it a separate patch, not mixed with others
- Create diff patch compared to previous release.

## merge history
git checkout -b mvp-tor tor-browser-128.6.0esr-14.0-1-build1
ssb-merge-1.patch
ssb-munual-1.patch
ssb-merge-2.patch
ssb-merge-3.patch

### ssb-merge-1.patch
- git merge v0.2.0mvp-128.6.0esr
### ssb-merge-2.patch
- git merge tor-browser-128.7.0esr-14.0-1-build3
### ssb-merge-3.patch
- 3ec9b0a9
- 99ffae95
- 4967878d
- 0d6f7346
