Started over from v0.2.0mvp. Be careful about using older tags.

## merge history
git checkout -b mvp-tor tor-browser-128.6.0esr-14.0-1-build1
git apply ssb-merge-1.patch
git apply ssb-munual-1.patch

### ssb-merge-1.patch
- git merge v0.2.0mvp-128.6.0esr
