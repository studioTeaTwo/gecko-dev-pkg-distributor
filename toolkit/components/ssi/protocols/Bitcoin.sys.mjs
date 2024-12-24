import { schnorr } from "resource://gre/modules/shared/secp256k1.sys.mjs";
import { bytesToHex } from "resource://gre/modules/shared/utils-hashes.sys.mjs";

export const Bitcoin = {
  BIP340: {
    sign: async (message, guid) => {
      // Get private key from store
      const credentials = await Services.ssi.searchCredentialsAsync({ guid });
      if (credentials.length === 0) {
        return "";
      }
      const key = credentials[0].secret;

      // Sign
      const signature = schnorr.sign(message, key);
      const hexSignature = bytesToHex(signature);

      return hexSignature;
    },
  },
};
