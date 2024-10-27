/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
import { hmac } from 'resource://gre/modules/shared/hmac.sys.mjs';
import { concatBytes, randomBytes } from 'resource://gre/modules/shared/utils-hashes.sys.mjs';
import { weierstrass } from 'resource://gre/modules/shared/weierstrass.sys.mjs';
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