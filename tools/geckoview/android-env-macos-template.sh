export MOZ_BUILD_DATE=20230710165010 # This should match the data in [firefox-android](https://gitlab.torproject.org/tpo/applications/firefox-android)/android-components/plugins/dependencies/src/main/java/Gecko.kt ~ln 12's def of the variable *version*, the date component
export JAVA_HOME=/opt/homebrew/opt/openjdk@11/libexec/openjdk.jdk/Contents/Home/ # for arm64. Or JAVA_HOME=/usr/local/opt/openjdk@11/libexec/openjdk.jdk/Contents/Home/ for x86_64.
export ANDROID_HOME=$HOME/Library/Android/sdk # or $HOME/.mozbuild/android-sdk-macosx/
export ANDROID_NDK_HOME=$ANDROID_HOME/ndk/23.2.8568313 # will need to download NDK 23.2.8568313 via android studio
export GRADLE_HOME=/opt/homebrew/Cellar/gradle@7/7.6.4 # for arm64 or /usr/local/Cellar/gradle@7/7.6.4 for x86_64. Make sure the version is up to date
export LOCAL_DEV_BUILD=1
export PATH=$ANDROID_HOME/ndk/25.2.9519653/toolchains/llvm/prebuilt/darwin-x86_64/bin/:$PATH # prepend android studios latest ndk to the path so it's clang gets used to build geckoview. NDK 25.2.9519653 uses clang 14.0.7, ideally we'd use clang 16 (to be the same as Linux) but that's not an option yet for android studio. NDK 26.1.10909125 uses clang 17.0.2, which we should evaluate with the esr128 migration
