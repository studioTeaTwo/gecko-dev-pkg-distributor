/*************************************************************************
 * Drag and Drop Handler.
 *
 * Implements an observer that filters drag events to prevent OS
 * access to URLs (a potential proxy bypass vector).
 *************************************************************************/

const lazy = {};

ChromeUtils.defineLazyGetter(lazy, "logger", () => {
  // Keep the logger lazy, because it is used only in the parent process.
  // For some reason, Mozilla considers reading the preference linked to the
  // level in the children illegal (and triggers a crash when
  // fission.enforceBlocklistedPrefsInSubprocesses is true).
  // (Or maybe this crash used to happen when the logger was not lazy, and maybe
  // the preferences were not ready, yet?)
  return console.createInstance({
    maxLogLevelPref: "browser.dragdropfilter.log_level",
    prefix: "DragDropFilter",
  });
});

const URLISH_TYPES = Object.freeze([
  "text/x-moz-url",
  "text/x-moz-url-data",
  "text/uri-list",
  "application/x-moz-file-promise-url",
]);

const MAIN_PROCESS =
  Services.appinfo.processType === Services.appinfo.PROCESS_TYPE_DEFAULT;

const EMPTY_PAYLOAD = {};
export const OpaqueDrag = {
  listening: false,
  payload: EMPTY_PAYLOAD,
  store(value, type) {
    let opaqueKey = crypto.randomUUID();
    this.payload = { opaqueKey, value, type };
    if (!this.listening && MAIN_PROCESS) {
      Services.ppmm.addMessageListener(
        "DragDropFilter:GetOpaqueDrag",
        () => this.payload
      );
      this.listening = true;
    }
    return opaqueKey;
  },
  retrieve(key) {
    let { opaqueKey, value, type } = this.payload;
    if (opaqueKey === key) {
      return { value, type };
    }
    if (!MAIN_PROCESS) {
      this.payload = Services.cpmm.sendSyncMessage(
        "DragDropFilter:GetOpaqueDrag"
      )[0];
      if (key === this.payload.opaqueKey) {
        return this.retrieve(key);
      }
    }
    return EMPTY_PAYLOAD;
  },
};

export const DragDropFilter = {
  init() {
    if (MAIN_PROCESS) {
      lazy.logger.info(
        "Observed profile-after-change: registering the observer."
      );
      // We want to update our status in the main process only, in order to
      // serve the same opaque drag payload in every process.
      try {
        Services.obs.addObserver(this, "on-datatransfer-available");
      } catch (e) {
        lazy.logger.error("Failed to register drag observer", e);
      }
    }
  },

  observe(subject, topic) {
    if (topic === "on-datatransfer-available") {
      lazy.logger.debug("The DataTransfer is available");
      this.filterDataTransferURLs(subject);
    }
  },

  filterDataTransferURLs(aDataTransfer) {
    for (let i = 0, count = aDataTransfer.mozItemCount; i < count; ++i) {
      lazy.logger.debug(`Inspecting the data transfer: ${i}.`);
      const types = aDataTransfer.mozTypesAt(i);
      const urlType = "text/x-moz-url";
      // Fallback url type, to be parsed by this browser but not externally
      const INTERNAL_FALLBACK = "application/x-torbrowser-opaque";
      if (types.contains(urlType)) {
        const links = aDataTransfer.mozGetDataAt(urlType, i);
        // Skip DNS-safe URLs (no hostname, e.g. RFC 3966 tel:)
        const mayLeakDNS = links.split("\n").some(link => {
          try {
            return new URL(link).hostname;
          } catch (e) {
            return false;
          }
        });
        if (!mayLeakDNS) {
          continue;
        }
        const opaqueKey = OpaqueDrag.store(links, urlType);
        aDataTransfer.mozSetDataAt(INTERNAL_FALLBACK, opaqueKey, i);
      }
      for (const maybeUrlType of types) {
        lazy.logger.debug(`Type is: ${maybeUrlType}.`);
        if (URLISH_TYPES.includes(maybeUrlType)) {
          lazy.logger.info(
            `Removing transfer data ${aDataTransfer.mozGetDataAt(
              maybeUrlType,
              i
            )}`
          );
          // Once we find a URL, we remove also all the other types that can be
          // read outside the browser, to be sure the URL is not leaked.
          for (const type of types) {
            if (
              type !== INTERNAL_FALLBACK &&
              type !== "text/x-moz-place" && // don't touch bookmarks
              type !== "application/x-moz-file" // don't touch downloads
            ) {
              aDataTransfer.mozClearDataAt(type, i);
            }
          }
          break;
        }
      }
    }
  },

  opaqueDrag: {
    get(opaqueKey) {
      return OpaqueDrag.retrieve(opaqueKey);
    },
  },
};
