// Copyright (c) 2022, The Tor Project, Inc.

export const TorStatuses = Object.freeze({
  OK: 250,
  EventNotification: 650,
});

export const TorParsers = Object.freeze({
  // Escape non-ASCII characters for use within the Tor Control protocol.
  // Based on Vidalia's src/common/stringutil.cpp:string_escape().
  // Returns the new string.
  escapeString(aStr) {
    // Just return if all characters are printable ASCII excluding SP, ", and #
    const kSafeCharRE = /^[\x21\x24-\x7E]*$/;
    if (!aStr || kSafeCharRE.test(aStr)) {
      return aStr;
    }
    const escaped = aStr
      .replaceAll("\\", "\\\\")
      .replaceAll('"', '\\"')
      .replaceAll("\n", "\\n")
      .replaceAll("\r", "\\r")
      .replaceAll("\t", "\\t")
      .replaceAll(/[^\x20-\x7e]+/g, text => {
        const encoder = new TextEncoder();
        return Array.from(
          encoder.encode(text),
          ch => "\\x" + ch.toString(16)
        ).join("");
      });
    return `"${escaped}"`;
  },

  // Unescape Tor Control string aStr (removing surrounding "" and \ escapes).
  // Based on Vidalia's src/common/stringutil.cpp:string_unescape().
  // Returns the unescaped string. Throws upon failure.
  // Within Torbutton, the file modules/utils.js also contains a copy of
  // _strUnescape().
  unescapeString(aStr) {
    if (
      !aStr ||
      aStr.length < 2 ||
      aStr[0] !== '"' ||
      aStr[aStr.length - 1] !== '"'
    ) {
      return aStr;
    }

    // Regular expression by Tim Pietzcker
    // https://stackoverflow.com/a/15569588
    if (!/^(?:[^"\\]|\\.|"(?:\\.|[^"\\])*")*$/.test(aStr)) {
      throw new Error('Unescaped " within string');
    }

    const matchUnicode = /^(\\x[0-9A-Fa-f]{2}|\\[0-7]{3})+/;
    let rv = "";
    let lastAdded = 1;
    let bs;
    while ((bs = aStr.indexOf("\\", lastAdded)) !== -1) {
      rv += aStr.substring(lastAdded, bs);
      // We always increment lastAdded, because we will either add something, or
      // ignore the backslash.
      lastAdded = bs + 2;
      if (lastAdded === aStr.length) {
        // The string ends with \", which is illegal
        throw new Error("Missing character after \\");
      }
      switch (aStr[bs + 1]) {
        case "n":
          rv += "\n";
          break;
        case "r":
          rv += "\r";
          break;
        case "t":
          rv += "\t";
          break;
        case '"':
        case "\\":
          rv += aStr[bs + 1];
          break;
        default:
          aStr.substring(bs).replace(matchUnicode, sequence => {
            const bytes = [];
            for (let i = 0; i < sequence.length; i += 4) {
              if (sequence[i + 1] === "x") {
                bytes.push(parseInt(sequence.substring(i + 2, i + 4), 16));
              } else {
                bytes.push(parseInt(sequence.substring(i + 1, i + 4), 8));
              }
            }
            lastAdded = bs + sequence.length;
            const decoder = new TextDecoder();
            rv += decoder.decode(new Uint8Array(bytes));
            return "";
          });
          // We have already incremented lastAdded, which means we ignore the
          // backslash, and we will do something at the next one.
          break;
      }
    }
    rv += aStr.substring(lastAdded, aStr.length - 1);
    return rv;
  },

  parseBridgeLine(line) {
    if (!line) {
      return null;
    }
    const re =
      /\s*(?:(?<transport>\S+)\s+)?(?<addr>[0-9a-fA-F\.\[\]\:]+:\d{1,5})(?:\s+(?<id>[0-9a-fA-F]{40}))?(?:\s+(?<args>.+))?/;
    const match = re.exec(line);
    if (!match) {
      throw new Error(`Invalid bridge line: ${line}.`);
    }
    const bridge = match.groups;
    if (!bridge.transport) {
      bridge.transport = "vanilla";
    }
    return bridge;
  },
});
