.DEFAULT_GOAL := all

# https://stackoverflow.com/questions/18136918/how-to-get-current-relative-directory-of-your-makefile
mkfile_path := "$(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))"

DEV_ROOT = "$(mkfile_path)/../.."
BINARIES = "$(DEV_ROOT)/.binaries"
ARCHITECTURE = "$(shell uname -m)"

# Correct the architecture naming for ARM to match what mozilla has
ifeq ($(ARCHITECTURE), "arm64")
  ARCHITECTURE = "aarch64"
endif

# Define build output path based on the platform.
ifeq ("$(shell uname)", "Darwin")
  BUILD_OUTPUT = "$(DEV_ROOT)/obj-$(ARCHITECTURE)-apple-darwin$(shell uname -r)"
else
  BUILD_OUTPUT = "$(DEV_ROOT)/obj-$(ARCHITECTURE)-pc-linux-gnu"
endif

# Define the run command based on the platform.
ifeq ("$(shell uname)", "Darwin")
  RUN_CMD := cd "$(BINARIES)/Tor Browser.app/Contents/MacOS/" && ./firefox --purgecaches
else
  RUN_CMD := "$(BINARIES)/dev/Browser/start-tor-browser" -v --purgecaches $(ARGS)
endif

config:
	./config.sh $(DEV_ROOT)

ide-vscode:
	./ide.sh vscode $(DEV_ROOT)

ide-eclipse:
	./ide.sh eclipse $(DEV_ROOT)

ide-visualstudio:
	./ide.sh visualstudio $(DEV_ROOT)

fetch:
	./fetch.sh $(BINARIES)

build:
	./build.sh $(DEV_ROOT)

deploy:
	./deploy.sh $(BINARIES) $(BUILD_OUTPUT)

all: build deploy

run:
	$(RUN_CMD)

jslint:
	./jslint.sh $(DEV_ROOT) $(JS)

clobber:
	./clobber.sh $(DEV_ROOT)

clean:
	rm -rf $(BUILD_OUTPUT)

