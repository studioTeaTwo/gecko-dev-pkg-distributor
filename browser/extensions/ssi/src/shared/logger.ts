// NOTE(ssb): avoid placing on inpages and contents exposed in tabs as much as possible
// TODO(ssb): review those on inpages and contents
export function log(...args) {
  window.console.info("ssb:", args);
}
