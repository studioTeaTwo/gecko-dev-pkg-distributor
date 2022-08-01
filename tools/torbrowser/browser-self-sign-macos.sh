#!/bin/bash

CERTNAME=my-codesign-cert-tor
BROWSERPATH=.

if [ $# -ge 1 ]
then
  BROWSERPATH=$1
fi


security find-certificate -c $CERTNAME > /dev/null

if [ $? -ne 0 ]
then
  echo ""
  echo "ERROR: Self Signing Certificate not found, please create:"
  echo "  1. In the Keychain Access app on your Mac, choose Keychain Access > Certificate Assistant > Create a Certificate."
  echo "  2. Enter the name '$CERTNAME' for the certificate"
  echo "  3. Choose an identity type:  Self Signed Root"
  echo "  4. Certificate Type > Code Signing"
  echo "  5. Check 'Let me override defaults' & click Continue."
  echo "  6. Enter a unique Serial Number. (123 is fine)"
  echo "  7. Enter a big Validity Period (days), like 3560 & click Continue."
  echo "  8. Fill in your personal information & click Continue."
  echo "  9. Accept defaults for the rest of the dialog boxes. (Continue several times)"
  echo "  10. Certificate Created! Click Done."
  echo ""
  echo "For additional help see:"
  echo "  https://support.apple.com/en-ca/guide/keychain-access/kyca8916/mac"
  echo "  https://stackoverflow.com/questions/58356844/what-are-the-ways-or-technologies-to-sign-an-executable-application-file-in-mac"
  
  echo ""
  read -n 1 -r -s -p $'Press enter to launch "Keychain Access"...\n'
  open /System/Applications/Utilities/Keychain\ Access.app

  exit -1
fi

echo "Found $CERTNAME, looking for browser to sign..."

if [ ! -f "$BROWSERPATH/XUL" ]
then
  TESTPATH="$BROWSERPATH/Contents/MacOS"
  if [ -f "$TESTPATH/XUL" ]
  then
      BROWSERPATH=$TESTPATH
  else
    echo "Error: browser files not detected in $BROWSERPATH!"
    echo "  This script needs to be run in the 'Contents/MacOS' directory of a SomeBrowser.app directory"
    exit -1
  fi
fi

echo "Mozilla based browser found, signing..."
echo '  Will be asked for password to certificate for all the things that need to be signed. Click "Always Allow" to automate'

cd "$BROWSERPATH"

codesign -s $CERTNAME *.dylib
codesign -s $CERTNAME plugin-container.app

if [ -d Tor ]
then
  codesign -s $CERTNAME Tor/PluggableTransports/*
  codesign -s $CERTNAME Tor/libevent-2.1.7.dylib
  if [ -f Tor/tor.real ]
  then
    codesign -s $CERTNAME Tor/tor.real
  fi
  if [ -f Tor/tor ]
  then
    codesign -s $CERTNAME Tor/tor
  fi
fi

codesign -s $CERTNAME XUL

if [ -d updater.app ]
then
  codesign -s $CERTNAME updater.app
fi

# mullvadbrowser
if [ -f mullvadbrowser ]
then
  codesign -s $CERTNAME mullvadbrowser
fi

# BB or TB
if [ -f firefox ]
then
  codesign -s $CERTNAME firefox
fi

echo ""
echo "Browser signing step done!"
echo ""

echo "App still needs one more override to be easily opened with double click in Finder"
echo "Alternatively you can right click it, select 'Open' and then select 'Open' from the override popup"
echo "Or to enable it to be double clicked to open perform the following"
echo ""
echo "Double click the app and select either 'Ok' or 'Cancel' from the warning popup depending on which you get (Do Not 'Move to Trash')"
echo 'Go to Preferences -> Security & Privacy and click on padlock to allow changes. '
echo '  Then in "Allow appications downloaded from" select either:'
echo '    - App Store and identified developers'
echo '    - Anywhere'
echo '  Below that may be a notice about your specific app saying it was blocked because it was not from an identified developer. Click "Open Anyways" and "Open"'

