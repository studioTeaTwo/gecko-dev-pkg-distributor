.DEFAULT_GOAL := all

# one of armv7 aarch64 x86 x86_64
ARCH=aarch64

ARCHS=$(ARCH)
OS="${shell uname}"

# https://stackoverflow.com/questions/18136918/how-to-get-current-relative-directory-of-your-makefile
mkfile_path := "$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))"

DEV_ROOT = "$(mkfile_path)/../.."

clobber: env
	./clobber.sh $(DEV_ROOT) $(ARCH)

config: env
	./config.sh $(DEV_ROOT) $(ARCH)

build: env
	./build.sh $(DEV_ROOT) $(ARCH)

fataar: env
	bash -c "source android-env.sh && ./fataar.py $(DEV_ROOT) $(ARCHS)"

package: env
	./package-gradle.sh $(DEV_ROOT) $(ARCH)

show:
	ls -lh ~/.m2/repository/org/mozilla/geckoview/geckoview-default-omni/
	ls -lh ~/.m2/repository/org/mozilla/geckoview/geckoview-default-omni/$(shell ls ~/.m2/repository/org/mozilla/geckoview/geckoview-default-omni | tail -n 2 | head -n 1)

env:
	test -e android-env.sh || { echo "copy android-env-...-template.sh to android-env.sh and edit appropriatly"; exit 1; }

all: env build package

jslint:
	./jslint.sh $(DEV_ROOT) $(JS)

clean:
	rm -rf $(BUILD_OUTPUT)

