/**
 * Common methods for tor UI components.
 */
export const TorUIUtils = {
  /**
   * Shorten the given address if it is an onion address.
   *
   * @param {string} address - The address to shorten.
   *
   * @returns {string} The shortened form of the address, or the address itself
   *   if it was not shortened.
   */
  shortenOnionAddress(address) {
    if (
      // Only shorten ".onion" addresses.
      !address.endsWith(".onion") ||
      // That are not "onion" aliases.
      address.endsWith(".tor.onion") ||
      // And are long.
      address.length <= 21
    ) {
      return address;
    }
    return `${address.slice(0, 6)}…${address.slice(-12)}`;
  },
};
