/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
import { hmac } from 'resource://ssi/protocols/hmac.sys.mjs';
import { concatBytes, randomBytes } from 'resource://ssi/protocols/utils-hashes.sys.mjs';
import { weierstrass } from 'resource://ssi/protocols/weierstrass.sys.mjs';
// connects noble-curves to noble-hashes
export function getHash(hash) {
    return {
        hash,
        hmac: (key, ...msgs) => hmac(hash, key, concatBytes(...msgs)),
        randomBytes,
    };
}
export function createCurve(curveDef, defHash) {
    const create = (hash) => weierstrass({ ...curveDef, ...getHash(hash) });
    return Object.freeze({ ...create(defHash), create });
}
//# sourceMappingURL=_shortw_utils.js.map