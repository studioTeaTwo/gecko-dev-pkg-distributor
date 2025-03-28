/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 557:
/***/ ((__unused_webpack_module, exports) => {


/**
 * Internal assertion helpers.
 * @module
 */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.anumber = anumber;
exports.abytes = abytes;
exports.ahash = ahash;
exports.aexists = aexists;
exports.aoutput = aoutput;
/** Asserts something is positive integer. */
function anumber(n) {
    if (!Number.isSafeInteger(n) || n < 0)
        throw new Error('positive integer expected, got ' + n);
}
/** Is number an Uint8Array? Copied from utils for perf. */
function isBytes(a) {
    return a instanceof Uint8Array || (ArrayBuffer.isView(a) && a.constructor.name === 'Uint8Array');
}
/** Asserts something is Uint8Array. */
function abytes(b, ...lengths) {
    if (!isBytes(b))
        throw new Error('Uint8Array expected');
    if (lengths.length > 0 && !lengths.includes(b.length))
        throw new Error('Uint8Array expected of length ' + lengths + ', got length=' + b.length);
}
/** Asserts something is hash */
function ahash(h) {
    if (typeof h !== 'function' || typeof h.create !== 'function')
        throw new Error('Hash should be wrapped by utils.wrapConstructor');
    anumber(h.outputLen);
    anumber(h.blockLen);
}
/** Asserts a hash instance has not been destroyed / finished */
function aexists(instance, checkFinished = true) {
    if (instance.destroyed)
        throw new Error('Hash instance has been destroyed');
    if (checkFinished && instance.finished)
        throw new Error('Hash#digest() has already been called');
}
/** Asserts output is properly-sized byte array */
function aoutput(out, instance) {
    abytes(out);
    const min = instance.outputLen;
    if (out.length < min) {
        throw new Error('digestInto() expects output buffer of length at least ' + min);
    }
}
//# sourceMappingURL=_assert.js.map

/***/ }),

/***/ 145:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.crypto = void 0;
exports.crypto = typeof globalThis === 'object' && 'crypto' in globalThis ? globalThis.crypto : undefined;
//# sourceMappingURL=crypto.js.map

/***/ }),

/***/ 175:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


/**
 * Utilities for hex, bytes, CSPRNG.
 * @module
 */
/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Hash = exports.nextTick = exports.byteSwapIfBE = exports.isLE = void 0;
exports.isBytes = isBytes;
exports.u8 = u8;
exports.u32 = u32;
exports.createView = createView;
exports.rotr = rotr;
exports.rotl = rotl;
exports.byteSwap = byteSwap;
exports.byteSwap32 = byteSwap32;
exports.bytesToHex = bytesToHex;
exports.hexToBytes = hexToBytes;
exports.asyncLoop = asyncLoop;
exports.utf8ToBytes = utf8ToBytes;
exports.toBytes = toBytes;
exports.concatBytes = concatBytes;
exports.checkOpts = checkOpts;
exports.wrapConstructor = wrapConstructor;
exports.wrapConstructorWithOpts = wrapConstructorWithOpts;
exports.wrapXOFConstructorWithOpts = wrapXOFConstructorWithOpts;
exports.randomBytes = randomBytes;
// We use WebCrypto aka globalThis.crypto, which exists in browsers and node.js 16+.
// node.js versions earlier than v19 don't declare it in global scope.
// For node.js, package.json#exports field mapping rewrites import
// from `crypto` to `cryptoNode`, which imports native module.
// Makes the utils un-importable in browsers without a bundler.
// Once node.js 18 is deprecated (2025-04-30), we can just drop the import.
const crypto_1 = __webpack_require__(145);
const _assert_js_1 = __webpack_require__(557);
// export { isBytes } from './_assert.js';
// We can't reuse isBytes from _assert, because somehow this causes huge perf issues
function isBytes(a) {
    return a instanceof Uint8Array || (ArrayBuffer.isView(a) && a.constructor.name === 'Uint8Array');
}
// Cast array to different type
function u8(arr) {
    return new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
}
function u32(arr) {
    return new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
}
// Cast array to view
function createView(arr) {
    return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
}
/** The rotate right (circular right shift) operation for uint32 */
function rotr(word, shift) {
    return (word << (32 - shift)) | (word >>> shift);
}
/** The rotate left (circular left shift) operation for uint32 */
function rotl(word, shift) {
    return (word << shift) | ((word >>> (32 - shift)) >>> 0);
}
/** Is current platform little-endian? Most are. Big-Endian platform: IBM */
exports.isLE = (() => new Uint8Array(new Uint32Array([0x11223344]).buffer)[0] === 0x44)();
// The byte swap operation for uint32
function byteSwap(word) {
    return (((word << 24) & 0xff000000) |
        ((word << 8) & 0xff0000) |
        ((word >>> 8) & 0xff00) |
        ((word >>> 24) & 0xff));
}
/** Conditionally byte swap if on a big-endian platform */
exports.byteSwapIfBE = exports.isLE
    ? (n) => n
    : (n) => byteSwap(n);
/** In place byte swap for Uint32Array */
function byteSwap32(arr) {
    for (let i = 0; i < arr.length; i++) {
        arr[i] = byteSwap(arr[i]);
    }
}
// Array where index 0xf0 (240) is mapped to string 'f0'
const hexes = /* @__PURE__ */ Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'));
/**
 * Convert byte array to hex string.
 * @example bytesToHex(Uint8Array.from([0xca, 0xfe, 0x01, 0x23])) // 'cafe0123'
 */
function bytesToHex(bytes) {
    (0, _assert_js_1.abytes)(bytes);
    // pre-caching improves the speed 6x
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
        hex += hexes[bytes[i]];
    }
    return hex;
}
// We use optimized technique to convert hex string to byte array
const asciis = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function asciiToBase16(ch) {
    if (ch >= asciis._0 && ch <= asciis._9)
        return ch - asciis._0; // '2' => 50-48
    if (ch >= asciis.A && ch <= asciis.F)
        return ch - (asciis.A - 10); // 'B' => 66-(65-10)
    if (ch >= asciis.a && ch <= asciis.f)
        return ch - (asciis.a - 10); // 'b' => 98-(97-10)
    return;
}
/**
 * Convert hex string to byte array.
 * @example hexToBytes('cafe0123') // Uint8Array.from([0xca, 0xfe, 0x01, 0x23])
 */
function hexToBytes(hex) {
    if (typeof hex !== 'string')
        throw new Error('hex string expected, got ' + typeof hex);
    const hl = hex.length;
    const al = hl / 2;
    if (hl % 2)
        throw new Error('hex string expected, got unpadded hex of length ' + hl);
    const array = new Uint8Array(al);
    for (let ai = 0, hi = 0; ai < al; ai++, hi += 2) {
        const n1 = asciiToBase16(hex.charCodeAt(hi));
        const n2 = asciiToBase16(hex.charCodeAt(hi + 1));
        if (n1 === undefined || n2 === undefined) {
            const char = hex[hi] + hex[hi + 1];
            throw new Error('hex string expected, got non-hex character "' + char + '" at index ' + hi);
        }
        array[ai] = n1 * 16 + n2; // multiply first octet, e.g. 'a3' => 10*16+3 => 160 + 3 => 163
    }
    return array;
}
/**
 * There is no setImmediate in browser and setTimeout is slow.
 * Call of async fn will return Promise, which will be fullfiled only on
 * next scheduler queue processing step and this is exactly what we need.
 */
const nextTick = async () => { };
exports.nextTick = nextTick;
/** Returns control to thread each 'tick' ms to avoid blocking. */
async function asyncLoop(iters, tick, cb) {
    let ts = Date.now();
    for (let i = 0; i < iters; i++) {
        cb(i);
        // Date.now() is not monotonic, so in case if clock goes backwards we return return control too
        const diff = Date.now() - ts;
        if (diff >= 0 && diff < tick)
            continue;
        await (0, exports.nextTick)();
        ts += diff;
    }
}
/**
 * Convert JS string to byte array.
 * @example utf8ToBytes('abc') // new Uint8Array([97, 98, 99])
 */
function utf8ToBytes(str) {
    if (typeof str !== 'string')
        throw new Error('utf8ToBytes expected string, got ' + typeof str);
    return new Uint8Array(new TextEncoder().encode(str)); // https://bugzil.la/1681809
}
/**
 * Normalizes (non-hex) string or Uint8Array to Uint8Array.
 * Warning: when Uint8Array is passed, it would NOT get copied.
 * Keep in mind for future mutable operations.
 */
function toBytes(data) {
    if (typeof data === 'string')
        data = utf8ToBytes(data);
    (0, _assert_js_1.abytes)(data);
    return data;
}
/**
 * Copies several Uint8Arrays into one.
 */
function concatBytes(...arrays) {
    let sum = 0;
    for (let i = 0; i < arrays.length; i++) {
        const a = arrays[i];
        (0, _assert_js_1.abytes)(a);
        sum += a.length;
    }
    const res = new Uint8Array(sum);
    for (let i = 0, pad = 0; i < arrays.length; i++) {
        const a = arrays[i];
        res.set(a, pad);
        pad += a.length;
    }
    return res;
}
/** For runtime check if class implements interface */
class Hash {
    // Safe version that clones internal state
    clone() {
        return this._cloneInto();
    }
}
exports.Hash = Hash;
function checkOpts(defaults, opts) {
    if (opts !== undefined && {}.toString.call(opts) !== '[object Object]')
        throw new Error('Options should be object or undefined');
    const merged = Object.assign(defaults, opts);
    return merged;
}
/** Wraps hash function, creating an interface on top of it */
function wrapConstructor(hashCons) {
    const hashC = (msg) => hashCons().update(toBytes(msg)).digest();
    const tmp = hashCons();
    hashC.outputLen = tmp.outputLen;
    hashC.blockLen = tmp.blockLen;
    hashC.create = () => hashCons();
    return hashC;
}
function wrapConstructorWithOpts(hashCons) {
    const hashC = (msg, opts) => hashCons(opts).update(toBytes(msg)).digest();
    const tmp = hashCons({});
    hashC.outputLen = tmp.outputLen;
    hashC.blockLen = tmp.blockLen;
    hashC.create = (opts) => hashCons(opts);
    return hashC;
}
function wrapXOFConstructorWithOpts(hashCons) {
    const hashC = (msg, opts) => hashCons(opts).update(toBytes(msg)).digest();
    const tmp = hashCons({});
    hashC.outputLen = tmp.outputLen;
    hashC.blockLen = tmp.blockLen;
    hashC.create = (opts) => hashCons(opts);
    return hashC;
}
/** Cryptographically secure PRNG. Uses internal OS-level `crypto.getRandomValues`. */
function randomBytes(bytesLength = 32) {
    if (crypto_1.crypto && typeof crypto_1.crypto.getRandomValues === 'function') {
        return crypto_1.crypto.getRandomValues(new Uint8Array(bytesLength));
    }
    // Legacy Node.js compatibility
    if (crypto_1.crypto && typeof crypto_1.crypto.randomBytes === 'function') {
        return crypto_1.crypto.randomBytes(bytesLength);
    }
    throw new Error('crypto.getRandomValues must be defined');
}
//# sourceMappingURL=utils.js.map

/***/ }),

/***/ 203:
/***/ ((__unused_webpack_module, exports) => {


/*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) */
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.bytes = exports.stringToBytes = exports.str = exports.bytesToString = exports.hex = exports.utf8 = exports.bech32m = exports.bech32 = exports.base58check = exports.createBase58check = exports.base58xmr = exports.base58xrp = exports.base58flickr = exports.base58 = exports.base64urlnopad = exports.base64url = exports.base64nopad = exports.base64 = exports.base32crockford = exports.base32hexnopad = exports.base32hex = exports.base32nopad = exports.base32 = exports.base16 = exports.utils = exports.assertNumber = void 0;
function isBytes(a) {
    return a instanceof Uint8Array || (ArrayBuffer.isView(a) && a.constructor.name === 'Uint8Array');
}
function isArrayOf(isString, arr) {
    if (!Array.isArray(arr))
        return false;
    if (arr.length === 0)
        return true;
    if (isString) {
        return arr.every((item) => typeof item === 'string');
    }
    else {
        return arr.every((item) => Number.isSafeInteger(item));
    }
}
// no abytes: seems to have 10% slowdown. Why?!
function afn(input) {
    if (typeof input !== 'function')
        throw new Error('function expected');
    return true;
}
function astr(label, input) {
    if (typeof input !== 'string')
        throw new Error(`${label}: string expected`);
    return true;
}
function anumber(n) {
    if (!Number.isSafeInteger(n))
        throw new Error(`invalid integer: ${n}`);
}
exports.assertNumber = anumber;
function aArr(input) {
    if (!Array.isArray(input))
        throw new Error('array expected');
}
function astrArr(label, input) {
    if (!isArrayOf(true, input))
        throw new Error(`${label}: array of strings expected`);
}
function anumArr(label, input) {
    if (!isArrayOf(false, input))
        throw new Error(`${label}: array of numbers expected`);
}
/**
 * @__NO_SIDE_EFFECTS__
 */
function chain(...args) {
    const id = (a) => a;
    // Wrap call in closure so JIT can inline calls
    const wrap = (a, b) => (c) => a(b(c));
    // Construct chain of args[-1].encode(args[-2].encode([...]))
    const encode = args.map((x) => x.encode).reduceRight(wrap, id);
    // Construct chain of args[0].decode(args[1].decode(...))
    const decode = args.map((x) => x.decode).reduce(wrap, id);
    return { encode, decode };
}
/**
 * Encodes integer radix representation to array of strings using alphabet and back.
 * Could also be array of strings.
 * @__NO_SIDE_EFFECTS__
 */
function alphabet(letters) {
    // mapping 1 to "b"
    const lettersA = typeof letters === 'string' ? letters.split('') : letters;
    const len = lettersA.length;
    astrArr('alphabet', lettersA);
    // mapping "b" to 1
    const indexes = new Map(lettersA.map((l, i) => [l, i]));
    return {
        encode: (digits) => {
            aArr(digits);
            return digits.map((i) => {
                if (!Number.isSafeInteger(i) || i < 0 || i >= len)
                    throw new Error(`alphabet.encode: digit index outside alphabet "${i}". Allowed: ${letters}`);
                return lettersA[i];
            });
        },
        decode: (input) => {
            aArr(input);
            return input.map((letter) => {
                astr('alphabet.decode', letter);
                const i = indexes.get(letter);
                if (i === undefined)
                    throw new Error(`Unknown letter: "${letter}". Allowed: ${letters}`);
                return i;
            });
        },
    };
}
/**
 * @__NO_SIDE_EFFECTS__
 */
function join(separator = '') {
    astr('join', separator);
    return {
        encode: (from) => {
            astrArr('join.decode', from);
            return from.join(separator);
        },
        decode: (to) => {
            astr('join.decode', to);
            return to.split(separator);
        },
    };
}
/**
 * Pad strings array so it has integer number of bits
 * @__NO_SIDE_EFFECTS__
 */
function padding(bits, chr = '=') {
    anumber(bits);
    astr('padding', chr);
    return {
        encode(data) {
            astrArr('padding.encode', data);
            while ((data.length * bits) % 8)
                data.push(chr);
            return data;
        },
        decode(input) {
            astrArr('padding.decode', input);
            let end = input.length;
            if ((end * bits) % 8)
                throw new Error('padding: invalid, string should have whole number of bytes');
            for (; end > 0 && input[end - 1] === chr; end--) {
                const last = end - 1;
                const byte = last * bits;
                if (byte % 8 === 0)
                    throw new Error('padding: invalid, string has too much padding');
            }
            return input.slice(0, end);
        },
    };
}
/**
 * @__NO_SIDE_EFFECTS__
 */
function normalize(fn) {
    afn(fn);
    return { encode: (from) => from, decode: (to) => fn(to) };
}
/**
 * Slow: O(n^2) time complexity
 */
function convertRadix(data, from, to) {
    // base 1 is impossible
    if (from < 2)
        throw new Error(`convertRadix: invalid from=${from}, base cannot be less than 2`);
    if (to < 2)
        throw new Error(`convertRadix: invalid to=${to}, base cannot be less than 2`);
    aArr(data);
    if (!data.length)
        return [];
    let pos = 0;
    const res = [];
    const digits = Array.from(data, (d) => {
        anumber(d);
        if (d < 0 || d >= from)
            throw new Error(`invalid integer: ${d}`);
        return d;
    });
    const dlen = digits.length;
    while (true) {
        let carry = 0;
        let done = true;
        for (let i = pos; i < dlen; i++) {
            const digit = digits[i];
            const fromCarry = from * carry;
            const digitBase = fromCarry + digit;
            if (!Number.isSafeInteger(digitBase) ||
                fromCarry / from !== carry ||
                digitBase - digit !== fromCarry) {
                throw new Error('convertRadix: carry overflow');
            }
            const div = digitBase / to;
            carry = digitBase % to;
            const rounded = Math.floor(div);
            digits[i] = rounded;
            if (!Number.isSafeInteger(rounded) || rounded * to + carry !== digitBase)
                throw new Error('convertRadix: carry overflow');
            if (!done)
                continue;
            else if (!rounded)
                pos = i;
            else
                done = false;
        }
        res.push(carry);
        if (done)
            break;
    }
    for (let i = 0; i < data.length - 1 && data[i] === 0; i++)
        res.push(0);
    return res.reverse();
}
const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
const radix2carry = /* @__NO_SIDE_EFFECTS__ */ (from, to) => from + (to - gcd(from, to));
const powers = /* @__PURE__ */ (() => {
    let res = [];
    for (let i = 0; i < 40; i++)
        res.push(2 ** i);
    return res;
})();
/**
 * Implemented with numbers, because BigInt is 5x slower
 */
function convertRadix2(data, from, to, padding) {
    aArr(data);
    if (from <= 0 || from > 32)
        throw new Error(`convertRadix2: wrong from=${from}`);
    if (to <= 0 || to > 32)
        throw new Error(`convertRadix2: wrong to=${to}`);
    if (radix2carry(from, to) > 32) {
        throw new Error(`convertRadix2: carry overflow from=${from} to=${to} carryBits=${radix2carry(from, to)}`);
    }
    let carry = 0;
    let pos = 0; // bitwise position in current element
    const max = powers[from];
    const mask = powers[to] - 1;
    const res = [];
    for (const n of data) {
        anumber(n);
        if (n >= max)
            throw new Error(`convertRadix2: invalid data word=${n} from=${from}`);
        carry = (carry << from) | n;
        if (pos + from > 32)
            throw new Error(`convertRadix2: carry overflow pos=${pos} from=${from}`);
        pos += from;
        for (; pos >= to; pos -= to)
            res.push(((carry >> (pos - to)) & mask) >>> 0);
        const pow = powers[pos];
        if (pow === undefined)
            throw new Error('invalid carry');
        carry &= pow - 1; // clean carry, otherwise it will cause overflow
    }
    carry = (carry << (to - pos)) & mask;
    if (!padding && pos >= from)
        throw new Error('Excess padding');
    if (!padding && carry > 0)
        throw new Error(`Non-zero padding: ${carry}`);
    if (padding && pos > 0)
        res.push(carry >>> 0);
    return res;
}
/**
 * @__NO_SIDE_EFFECTS__
 */
function radix(num) {
    anumber(num);
    const _256 = 2 ** 8;
    return {
        encode: (bytes) => {
            if (!isBytes(bytes))
                throw new Error('radix.encode input should be Uint8Array');
            return convertRadix(Array.from(bytes), _256, num);
        },
        decode: (digits) => {
            anumArr('radix.decode', digits);
            return Uint8Array.from(convertRadix(digits, num, _256));
        },
    };
}
/**
 * If both bases are power of same number (like `2**8 <-> 2**64`),
 * there is a linear algorithm. For now we have implementation for power-of-two bases only.
 * @__NO_SIDE_EFFECTS__
 */
function radix2(bits, revPadding = false) {
    anumber(bits);
    if (bits <= 0 || bits > 32)
        throw new Error('radix2: bits should be in (0..32]');
    if (radix2carry(8, bits) > 32 || radix2carry(bits, 8) > 32)
        throw new Error('radix2: carry overflow');
    return {
        encode: (bytes) => {
            if (!isBytes(bytes))
                throw new Error('radix2.encode input should be Uint8Array');
            return convertRadix2(Array.from(bytes), 8, bits, !revPadding);
        },
        decode: (digits) => {
            anumArr('radix2.decode', digits);
            return Uint8Array.from(convertRadix2(digits, bits, 8, revPadding));
        },
    };
}
function unsafeWrapper(fn) {
    afn(fn);
    return function (...args) {
        try {
            return fn.apply(null, args);
        }
        catch (e) { }
    };
}
function checksum(len, fn) {
    anumber(len);
    afn(fn);
    return {
        encode(data) {
            if (!isBytes(data))
                throw new Error('checksum.encode: input should be Uint8Array');
            const sum = fn(data).slice(0, len);
            const res = new Uint8Array(data.length + len);
            res.set(data);
            res.set(sum, data.length);
            return res;
        },
        decode(data) {
            if (!isBytes(data))
                throw new Error('checksum.decode: input should be Uint8Array');
            const payload = data.slice(0, -len);
            const oldChecksum = data.slice(-len);
            const newChecksum = fn(payload).slice(0, len);
            for (let i = 0; i < len; i++)
                if (newChecksum[i] !== oldChecksum[i])
                    throw new Error('Invalid checksum');
            return payload;
        },
    };
}
// prettier-ignore
exports.utils = {
    alphabet, chain, checksum, convertRadix, convertRadix2, radix, radix2, join, padding,
};
// RFC 4648 aka RFC 3548
// ---------------------
/**
 * base16 encoding.
 */
exports.base16 = chain(radix2(4), alphabet('0123456789ABCDEF'), join(''));
exports.base32 = chain(radix2(5), alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'), padding(5), join(''));
exports.base32nopad = chain(radix2(5), alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'), join(''));
exports.base32hex = chain(radix2(5), alphabet('0123456789ABCDEFGHIJKLMNOPQRSTUV'), padding(5), join(''));
exports.base32hexnopad = chain(radix2(5), alphabet('0123456789ABCDEFGHIJKLMNOPQRSTUV'), join(''));
exports.base32crockford = chain(radix2(5), alphabet('0123456789ABCDEFGHJKMNPQRSTVWXYZ'), join(''), normalize((s) => s.toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1')));
/**
 * base64 with padding. For no padding, use `base64nopad`.
 * @example
 * const b = base64.decode('A951'); // Uint8Array.from([ 3, 222, 117 ])
 * base64.encode(b); // 'A951'
 */
exports.base64 = chain(radix2(6), alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'), padding(6), join(''));
/**
 * base64 without padding.
 */
exports.base64nopad = chain(radix2(6), alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'), join(''));
exports.base64url = chain(radix2(6), alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'), padding(6), join(''));
exports.base64urlnopad = chain(radix2(6), alphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'), join(''));
// base58 code
// -----------
const genBase58 = /* @__NO_SIDE_EFFECTS__ */ (abc) => chain(radix(58), alphabet(abc), join(''));
/**
 * Base58: base64 without characters +, /, 0, O, I, l.
 * Quadratic (O(n^2)) - so, can't be used on large inputs.
 */
exports.base58 = genBase58('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz');
exports.base58flickr = genBase58('123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ');
exports.base58xrp = genBase58('rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz');
// Data len (index) -> encoded block len
const XMR_BLOCK_LEN = [0, 2, 3, 5, 6, 7, 9, 10, 11];
/**
 * XMR version of base58.
 * Done in 8-byte blocks (which equals 11 chars in decoding). Last (non-full) block padded with '1' to size in XMR_BLOCK_LEN.
 * Block encoding significantly reduces quadratic complexity of base58.
 */
exports.base58xmr = {
    encode(data) {
        let res = '';
        for (let i = 0; i < data.length; i += 8) {
            const block = data.subarray(i, i + 8);
            res += exports.base58.encode(block).padStart(XMR_BLOCK_LEN[block.length], '1');
        }
        return res;
    },
    decode(str) {
        let res = [];
        for (let i = 0; i < str.length; i += 11) {
            const slice = str.slice(i, i + 11);
            const blockLen = XMR_BLOCK_LEN.indexOf(slice.length);
            const block = exports.base58.decode(slice);
            for (let j = 0; j < block.length - blockLen; j++) {
                if (block[j] !== 0)
                    throw new Error('base58xmr: wrong padding');
            }
            res = res.concat(Array.from(block.slice(block.length - blockLen)));
        }
        return Uint8Array.from(res);
    },
};
const createBase58check = (sha256) => chain(checksum(4, (data) => sha256(sha256(data))), exports.base58);
exports.createBase58check = createBase58check;
/**
 * Use `createBase58check` instead.
 * @deprecated
 */
exports.base58check = exports.createBase58check;
const BECH_ALPHABET = chain(alphabet('qpzry9x8gf2tvdw0s3jn54khce6mua7l'), join(''));
const POLYMOD_GENERATORS = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
function bech32Polymod(pre) {
    const b = pre >> 25;
    let chk = (pre & 0x1ffffff) << 5;
    for (let i = 0; i < POLYMOD_GENERATORS.length; i++) {
        if (((b >> i) & 1) === 1)
            chk ^= POLYMOD_GENERATORS[i];
    }
    return chk;
}
function bechChecksum(prefix, words, encodingConst = 1) {
    const len = prefix.length;
    let chk = 1;
    for (let i = 0; i < len; i++) {
        const c = prefix.charCodeAt(i);
        if (c < 33 || c > 126)
            throw new Error(`Invalid prefix (${prefix})`);
        chk = bech32Polymod(chk) ^ (c >> 5);
    }
    chk = bech32Polymod(chk);
    for (let i = 0; i < len; i++)
        chk = bech32Polymod(chk) ^ (prefix.charCodeAt(i) & 0x1f);
    for (let v of words)
        chk = bech32Polymod(chk) ^ v;
    for (let i = 0; i < 6; i++)
        chk = bech32Polymod(chk);
    chk ^= encodingConst;
    return BECH_ALPHABET.encode(convertRadix2([chk % powers[30]], 30, 5, false));
}
/**
 * @__NO_SIDE_EFFECTS__
 */
function genBech32(encoding) {
    const ENCODING_CONST = encoding === 'bech32' ? 1 : 0x2bc830a3;
    const _words = radix2(5);
    const fromWords = _words.decode;
    const toWords = _words.encode;
    const fromWordsUnsafe = unsafeWrapper(fromWords);
    function encode(prefix, words, limit = 90) {
        astr('bech32.encode prefix', prefix);
        if (isBytes(words))
            words = Array.from(words);
        anumArr('bech32.encode', words);
        const plen = prefix.length;
        if (plen === 0)
            throw new TypeError(`Invalid prefix length ${plen}`);
        const actualLength = plen + 7 + words.length;
        if (limit !== false && actualLength > limit)
            throw new TypeError(`Length ${actualLength} exceeds limit ${limit}`);
        const lowered = prefix.toLowerCase();
        const sum = bechChecksum(lowered, words, ENCODING_CONST);
        return `${lowered}1${BECH_ALPHABET.encode(words)}${sum}`;
    }
    function decode(str, limit = 90) {
        astr('bech32.decode input', str);
        const slen = str.length;
        if (slen < 8 || (limit !== false && slen > limit))
            throw new TypeError(`invalid string length: ${slen} (${str}). Expected (8..${limit})`);
        // don't allow mixed case
        const lowered = str.toLowerCase();
        if (str !== lowered && str !== str.toUpperCase())
            throw new Error(`String must be lowercase or uppercase`);
        const sepIndex = lowered.lastIndexOf('1');
        if (sepIndex === 0 || sepIndex === -1)
            throw new Error(`Letter "1" must be present between prefix and data only`);
        const prefix = lowered.slice(0, sepIndex);
        const data = lowered.slice(sepIndex + 1);
        if (data.length < 6)
            throw new Error('Data must be at least 6 characters long');
        const words = BECH_ALPHABET.decode(data).slice(0, -6);
        const sum = bechChecksum(prefix, words, ENCODING_CONST);
        if (!data.endsWith(sum))
            throw new Error(`Invalid checksum in ${str}: expected "${sum}"`);
        return { prefix, words };
    }
    const decodeUnsafe = unsafeWrapper(decode);
    function decodeToBytes(str) {
        const { prefix, words } = decode(str, false);
        return { prefix, words, bytes: fromWords(words) };
    }
    function encodeFromBytes(prefix, bytes) {
        return encode(prefix, toWords(bytes));
    }
    return {
        encode,
        decode,
        encodeFromBytes,
        decodeToBytes,
        decodeUnsafe,
        fromWords,
        fromWordsUnsafe,
        toWords,
    };
}
/**
 * Low-level bech32 operations. Operates on words.
 */
exports.bech32 = genBech32('bech32');
exports.bech32m = genBech32('bech32m');
/**
 * UTF-8-to-byte decoder. Uses built-in TextDecoder / TextEncoder.
 * @example
 * const b = utf8.decode("hey"); // => new Uint8Array([ 104, 101, 121 ])
 * const str = utf8.encode(b); // "hey"
 */
exports.utf8 = {
    encode: (data) => new TextDecoder().decode(data),
    decode: (str) => new TextEncoder().encode(str),
};
/**
 * hex string decoder.
 * @example
 * const b = hex.decode("0102ff"); // => new Uint8Array([ 1, 2, 255 ])
 * const str = hex.encode(b); // "0102ff"
 */
exports.hex = chain(radix2(4), alphabet('0123456789abcdef'), join(''), normalize((s) => {
    if (typeof s !== 'string' || s.length % 2 !== 0)
        throw new TypeError(`hex.decode: expected string, got ${typeof s} with length ${s.length}`);
    return s.toLowerCase();
}));
// prettier-ignore
const CODERS = {
    utf8: exports.utf8, hex: exports.hex, base16: exports.base16, base32: exports.base32, base64: exports.base64, base64url: exports.base64url, base58: exports.base58, base58xmr: exports.base58xmr
};
const coderTypeError = 'Invalid encoding type. Available types: utf8, hex, base16, base32, base64, base64url, base58, base58xmr';
const bytesToString = (type, bytes) => {
    if (typeof type !== 'string' || !CODERS.hasOwnProperty(type))
        throw new TypeError(coderTypeError);
    if (!isBytes(bytes))
        throw new TypeError('bytesToString() expects Uint8Array');
    return CODERS[type].encode(bytes);
};
exports.bytesToString = bytesToString;
exports.str = exports.bytesToString; // as in python, but for bytes only
const stringToBytes = (type, str) => {
    if (!CODERS.hasOwnProperty(type))
        throw new TypeError(coderTypeError);
    if (typeof str !== 'string')
        throw new TypeError('stringToBytes() expects string');
    return CODERS[type].decode(str);
};
exports.stringToBytes = stringToBytes;
exports.bytes = exports.stringToBytes;
//# sourceMappingURL=index.js.map

/***/ }),

/***/ 684:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.init = exports.doNostrAction = void 0;
const utils_1 = __webpack_require__(175);
const base_1 = __webpack_require__(203);
const logger_1 = __webpack_require__(874);
const state_1 = __webpack_require__(975);
// NOTE(ssb): Currently firefox does not support externally_connectable.
// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/externally_connectable
const SafeProtocols = ["http", "https", "moz-extension"];
const MapBetweenPrefAndState = {
    enabled: "enabled",
};
const DialogMessage = {
    "nostr/getPublicKey": "App is requesting you.",
    "nostr/signEvent": "App is requesting you.",
    "nostr/nip04/encrypt": "App is requesting you.",
    "nostr/nip04/decrypt": "App is requesting you.",
    "nostr/nip44/encrypt": "App is requesting you.",
    "nostr/nip44/decrypt": "App is requesting you.",
};
const ERR_MSG_NOT_ENABLED = "window.ssi.nostr is not enabled or no key is registered. The user can confirm and edit it in 'about:selfsovereignindividual'.";
const ERR_MSG_NOT_SUPPORTED = `This protocol is not spported. Currently, only supports ${SafeProtocols.join(",")}.`;
// Proceed calls from contents
const doNostrAction = async (action, args, origin) => {
    if (!state_1.state.nostr.prefs.enabled) {
        throw new Error(ERR_MSG_NOT_ENABLED);
    }
    if (!supported(origin)) {
        throw new Error(ERR_MSG_NOT_SUPPORTED);
    }
    switch (action) {
        case "nostr/getPublicKey": {
            const credentials = await browser.ssi.searchCredentialsWithoutSecret({
                protocolName: "nostr",
                credentialName: state_1.state.nostr.credentialName,
                primary: true,
            }, { caption: DialogMessage[action], submission: "" });
            if (credentials.length === 0) {
                throw new Error(ERR_MSG_NOT_ENABLED);
            }
            state_1.state.nostr = {
                ...state_1.state.nostr,
                npub: credentials[0].identifier,
            };
            return decodeNpub(state_1.state.nostr.npub);
        }
        case "nostr/signEvent": {
            if (args.type == null || args.type !== "signEvent") {
                throw new Error(`Invalid type: ${args.type}`);
            }
            if (args.message == null || typeof args.message !== "string") {
                throw new Error("Invalid message");
            }
            // Sign
            const signature = await browser.ssi.nostr.sign(args.message, { type: args.type }, {
                caption: DialogMessage[action],
            });
            if (!signature) {
                throw new Error("Failed to sign");
            }
            return signature;
        }
        case "nostr/nip04/encrypt":
        case "nostr/nip44/encrypt": {
            if (args.type == null || !["nip04", "nip44"].includes(args.type)) {
                throw new Error(`Invalid type: ${args.type}`);
            }
            if (args.plaintext == null || typeof args.plaintext !== "string") {
                throw new Error("Invalid plaintext");
            }
            // TODO(ssb): validate in the terms of cryptography. e.g. `function isProbPub` in toolkit/components/ssi/protocols/noble-curves/abstract/weierstrass.sys.mjs
            if (args.pubkey == null || typeof args.pubkey !== "string") {
                throw new window.Error("Invalid partner's pubkey");
            }
            // Encrypt
            const ciphertext = await browser.ssi.nostr.encrypt(args.plaintext, { type: args.type, pubkey: args.pubkey }, {
                caption: DialogMessage[action],
            });
            if (!ciphertext) {
                throw new Error("Failed to encrypt");
            }
            return ciphertext;
        }
        case "nostr/nip04/decrypt":
        case "nostr/nip44/decrypt": {
            if (args.type == null || !["nip04", "nip44"].includes(args.type)) {
                throw new Error(`Invalid type: ${args.type}`);
            }
            // TODO(ssb): validate in the terms of cryptography
            if (args.ciphertext == null || typeof args.ciphertext !== "string") {
                throw new Error("Invalid ciphertext");
            }
            // TODO(ssb): validate in the terms of cryptography. e.g. `function isProbPub` in toolkit/components/ssi/protocols/noble-curves/abstract/weierstrass.sys.mjs
            if (args.pubkey == null || typeof args.pubkey !== "string") {
                throw new window.Error("Invalid partner's pubkey");
            }
            // Decrypt
            const plaintext = await browser.ssi.nostr.decrypt(args.ciphertext, { type: args.type, pubkey: args.pubkey }, {
                caption: DialogMessage[action],
            });
            if (!plaintext) {
                throw new Error("Failed to decrypt");
            }
            return plaintext;
        }
        default:
            throw new Error("Not implemented");
    }
};
exports.doNostrAction = doNostrAction;
async function init() {
    (0, logger_1.log)("experimental-api start...");
    state_1.state.nostr.credentialName = "nsec";
    // Get setting values from the prefs.
    const results = await browser.ssi.nostr.getPrefs();
    const prefs = {};
    Object.entries(MapBetweenPrefAndState).map(([_state, _pref]) => {
        prefs[_state] =
            results && results[_pref] ? results[_pref] : state_1.state.nostr.prefs[_pref];
    });
    state_1.state.nostr = {
        ...state_1.state.nostr,
        prefs: prefs,
    };
    (0, logger_1.log)("nostr inited in background", state_1.state.nostr);
}
exports.init = init;
// The message listener to listen to experimental-apis calls
// After, those calls get passed on to the content scripts.
const onPrimaryChangedCallback = async () => {
    const credentials = await browser.ssi.searchCredentialsWithoutSecret({
        protocolName: "nostr",
        credentialName: state_1.state.nostr.credentialName,
        primary: true,
    }, { caption: DialogMessage["nostr/getPublicKey"], submission: "" });
    (0, logger_1.log)("primary changed!", credentials);
    // That means it's all been removed
    if (credentials.length === 0) {
        state_1.state.nostr.npub = "";
        return;
    }
    state_1.state.nostr = {
        ...state_1.state.nostr,
        npub: credentials[0].identifier,
    };
    // Send the message to the contents
    const tabs = await browser.tabs.query({
        status: "complete",
        discarded: false,
    });
    const pubkey = decodeNpub(state_1.state.nostr.npub);
    for (const tab of tabs) {
        (0, logger_1.log)("send to tab", tab);
        sendTab(tab, "nostr/accountChanged", pubkey);
    }
};
browser.ssi.nostr.onPrimaryChanged.addListener(onPrimaryChangedCallback);
const onPrefChangedCallback = async (prefKey) => {
    // Update new value
    const results = await browser.ssi.nostr.getPrefs();
    const stateName = MapBetweenPrefAndState[prefKey];
    const newVal = results[stateName];
    state_1.state.nostr.prefs[stateName] = newVal;
    (0, logger_1.log)("pref changed!", prefKey, newVal, state_1.state.nostr);
    // Send the message to the contents
    // AccountChanged should only be held in the background.
    if (["enabled"].includes(prefKey)) {
        const tabs = await browser.tabs.query({
            status: "complete",
            discarded: false,
        });
        for (const tab of tabs) {
            (0, logger_1.log)("send to tab", tab);
            sendTab(tab, "nostr/providerChanged", state_1.state.nostr.prefs[stateName]);
        }
    }
};
browser.ssi.nostr.onPrefEnabledChanged.addListener(() => onPrefChangedCallback("enabled"));
/**
 * Internal Utils
 *
 */
async function sendTab(tab, action, data) {
    if (!supported(tab.url)) {
        // browser origin event is not sent anything
        return;
    }
    browser.tabs
        .sendMessage(tab.id, {
        action,
        args: data,
    })
        .catch();
}
function supported(tabUrl) {
    return SafeProtocols.some(protocol => tabUrl.startsWith(protocol));
}
function decodeNpub(npub) {
    const Bech32MaxSize = 5000;
    const { prefix, words } = base_1.bech32.decode(npub, Bech32MaxSize);
    if (prefix !== "npub") {
        throw new Error("Not npub!");
    }
    return (0, utils_1.bytesToHex)(new Uint8Array(base_1.bech32.fromWords(words)));
}


/***/ }),

/***/ 975:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.state = void 0;
// NOTE(ssb): We can hold multiple selfsovereignidentities here, just within background.
// But don't expose them to the contents, so that Peter Todd is not suspected of being Satoshi Nakamoto.
exports.state = {
    nostr: {
        credentialName: "",
        npub: "",
        prefs: {
            enabled: true,
        },
    },
};


/***/ }),

/***/ 874:
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.log = void 0;
// NOTE(ssb): avoid placing on inpages and contents exposed in tabs as much as possible
// TODO(ssb): review those on inpages and contents
function log(...args) {
    console.info("ssb:", args);
}
exports.log = log;


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it uses a non-standard name for the exports (exports).
(() => {
var exports = __webpack_exports__;
var __webpack_unused_export__;

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */
__webpack_unused_export__ = ({ value: true });
const logger_1 = __webpack_require__(874);
const nostr_1 = __webpack_require__(684);
__webpack_require__(684);
(0, logger_1.log)("background-script working");
// The message listener to listen to content calls
// After, return the result to the contents.
browser.runtime.onMessage.addListener((message, sender) => {
    (0, logger_1.log)("background received from content", message, sender);
    if (message.action.includes("nostr/")) {
        return (0, nostr_1.doNostrAction)(message.action, message.args, message.origin);
    }
    return false;
});
(0, nostr_1.init)();

})();

/******/ })()
;