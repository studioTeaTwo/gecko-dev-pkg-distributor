export JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64
export ANDROID_HOME=$HOME/.mozbuild/android-sdk-linux/ # or $HOME/Android/Sdk/ # Or .../android-toolchain/android-sdk-linux if you extract android-toolchain from tor-browser-build
export ANDROID_NDK_HOME=$ANDROID_HOME/ndk/r26c/ # for 128esr
export GRADLE_HOME=/FULL/PATH/TO/tor-browser-build/out/gradle/gradle-8.8 # Or the version that we currently use
export LOCAL_DEV_BUILD=1
export PATH=/FULL/PATH/TO/tor-browser-build/out/clang/clang-16.x.y-arm/bin/:$PATH # prepend our newly built and assembled clang to the path so it gets used to build geckoview
