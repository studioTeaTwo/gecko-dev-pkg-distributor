export MOZ_BUILD_DATE=20230710165010 # This should match the data in [firefox-android](https://gitlab.torproject.org/tpo/applications/firefox-android)/android-components/plugins/dependencies/src/main/java/Gecko.kt ~ln 12's def of the variable *version*, the date component
export JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64
export ANDROID_HOME=$HOME/.mozbuild/android-sdk-linux/ # or $HOME/Android/Sdk/ # Or .../android-toolchain/android-sdk-linux if you extract android-toolchain from tor-browser-build
export ANDROID_NDK_HOME=$ANDROID_HOME/ndk/23.2.8568313/ # for 115esr
export GRADLE_HOME=/FULL/PATH/TO/tor-browser-build/out/gradle/gradle-7.5.1 # Or the version that we currently use
export LOCAL_DEV_BUILD=1
export PATH=/FULL/PATH/TO/tor-browser-build/out/clang/clang-16.x.y-arm/bin/:$PATH # prepend our newly built and assembled clang to the path so it gets used to build geckoview
