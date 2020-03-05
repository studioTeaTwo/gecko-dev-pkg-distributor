// Copyright (c) 2020, The Tor Project, Inc.

/**
 * This class contains the child part of Onion Location.
 */
export class OnionLocationChild extends JSWindowActorChild {
  handleEvent(event) {
    this.onPageShow(event);
  }

  onPageShow(event) {
    if (event.target != this.document) {
      return;
    }
    const onionLocationURI = this.document.onionLocationURI;
    if (onionLocationURI) {
      this.sendAsyncMessage("OnionLocation:Set");
    }
  }

  receiveMessage(aMessage) {
    if (aMessage.name == "OnionLocation:Refresh") {
      const doc = this.document;
      const docShell = this.docShell;
      let onionLocationURI = doc.onionLocationURI;
      const refreshURI = docShell.QueryInterface(Ci.nsIRefreshURI);
      if (onionLocationURI && refreshURI) {
        const docUrl = new URL(doc.URL);
        let onionUrl = new URL(onionLocationURI.asciiSpec);
        // Keep consistent with Location
        if (!onionUrl.hash && docUrl.hash) {
          onionUrl.hash = docUrl.hash;
          onionLocationURI = Services.io.newURI(onionUrl.toString());
        }
        refreshURI.refreshURI(
          onionLocationURI,
          doc.nodePrincipal,
          0,
          false,
          true
        );
      }
    }
  }
}
