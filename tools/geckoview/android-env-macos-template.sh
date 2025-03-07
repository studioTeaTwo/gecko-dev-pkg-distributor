export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home/ # for arm64. Or JAVA_HOME=/usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home/ for x86_64.
export ANDROID_HOME=$HOME/Library/Android/sdk # or $HOME/.mozbuild/android-sdk-macosx/
export ANDROID_NDK_HOME=$ANDROID_HOME/ndk/26.2.11394342 # will need to download the relevant NDK via android studio (e.g. 26.2.11394342)
GRADLE_DIR=/opt/homebrew/Cellar/gradle # for arm64, or /usr/local/Cellar/gradle for x86_64. Download via homebrew.
GRADLE_VERSION=`ls -1 "$GRADLE_DIR" | sort -hr | head -n 1` # Finds the latest gradle version in the specified GRADLE_DIR
export GRADLE_HOME=$GRADLE_DIR/$GRADLE_VERSION
export LOCAL_DEV_BUILD=1
export PATH=$ANDROID_HOME/ndk/26.2.11394342/toolchains/llvm/prebuilt/darwin-x86_64/bin/:$PATH # prepend android studios latest ndk to the path so it's clang gets used to build geckoview. Note that it doesn't need to be the same version as above
