/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { TorParsers } from "resource://gre/modules/TorParsers.sys.mjs";

const logger = console.createInstance({
  maxLogLevelPref: "browser.tor_provider.cp_log_level",
  prefix: "TorControlPort",
});

/**
 * A wrapper around XPCOM sockets and buffers to handle streams in a standard
 * async JS fashion.
 * This class can handle both Unix sockets and TCP sockets.
 */
class AsyncSocket {
  /**
   * The output stream used for write operations.
   *
   * @type {nsIAsyncOutputStream}
   */
  #outputStream;
  /**
   * The output stream can only have one registered callback at a time, so
   * multiple writes need to be queued up (see nsIAsyncOutputStream.idl).
   * Every item is associated with a promise we returned in write, and it will
   * resolve it or reject it when called by the output stream.
   *
   * @type {nsIOutputStreamCallback[]}
   */
  #outputQueue = [];
  /**
   * The input stream.
   *
   * @type {nsIAsyncInputStream}
   */
  #inputStream;
  /**
   * An input stream adapter that makes reading from scripts easier.
   *
   * @type {nsIScriptableInputStream}
   */
  #scriptableInputStream;
  /**
   * The queue of callbacks to be used when we receive data.
   * Every item is associated with a promise we returned in read, and it will
   * resolve it or reject it when called by the input stream.
   *
   * @type {nsIInputStreamCallback[]}
   */
  #inputQueue = [];

  /**
   * Connect to a Unix socket. Not available on Windows.
   *
   * @param {nsIFile} ipcFile The path to the Unix socket to connect to.
   * @returns {AsyncSocket}
   */
  static fromIpcFile(ipcFile) {
    const sts = Cc[
      "@mozilla.org/network/socket-transport-service;1"
    ].getService(Ci.nsISocketTransportService);
    const socket = new AsyncSocket();
    const transport = sts.createUnixDomainTransport(ipcFile);
    socket.#createStreams(transport);
    return socket;
  }

  /**
   * Connect to a TCP socket.
   *
   * @param {string} host The hostname to connect the TCP socket to.
   * @param {number} port The port to connect the TCP socket to.
   * @returns {AsyncSocket}
   */
  static fromSocketAddress(host, port) {
    const sts = Cc[
      "@mozilla.org/network/socket-transport-service;1"
    ].getService(Ci.nsISocketTransportService);
    const socket = new AsyncSocket();
    const transport = sts.createTransport([], host, port, null, null);
    socket.#createStreams(transport);
    return socket;
  }

  #createStreams(socketTransport) {
    const OPEN_UNBUFFERED = Ci.nsITransport.OPEN_UNBUFFERED;
    this.#outputStream = socketTransport
      .openOutputStream(OPEN_UNBUFFERED, 1, 1)
      .QueryInterface(Ci.nsIAsyncOutputStream);

    this.#inputStream = socketTransport
      .openInputStream(OPEN_UNBUFFERED, 1, 1)
      .QueryInterface(Ci.nsIAsyncInputStream);
    this.#scriptableInputStream = Cc[
      "@mozilla.org/scriptableinputstream;1"
    ].createInstance(Ci.nsIScriptableInputStream);
    this.#scriptableInputStream.init(this.#inputStream);
  }

  /**
   * Asynchronously write string to underlying socket.
   *
   * When write is called, we create a new promise and queue it on the output
   * queue. If it is the only element in the queue, we ask the output stream to
   * run it immediately.
   * Otherwise, the previous item of the queue will run it after it finishes.
   *
   * @param {string} str The string to write to the socket. The underlying
   * implementation should convert JS strings (UTF-16) into UTF-8 strings.
   * See also write nsIOutputStream (the first argument is a string, not a
   * wstring).
   * @returns {Promise<number>} The number of written bytes
   */
  async write(str) {
    return new Promise((resolve, reject) => {
      // Asynchronously wait for the stream to be writable (or closed) if we
      // have any pending requests.
      const tryAsyncWait = () => {
        if (this.#outputQueue.length) {
          this.#outputStream.asyncWait(
            this.#outputQueue.at(0), // next request
            0,
            0,
            Services.tm.currentThread
          );
        }
      };

      // Implement an nsIOutputStreamCallback: write the string once possible,
      // and then start running the following queue item, if any.
      this.#outputQueue.push({
        onOutputStreamReady: () => {
          try {
            const bytesWritten = this.#outputStream.write(str, str.length);

            // Remove this callback object from queue, as it is now completed.
            this.#outputQueue.shift();

            // Queue the next request if there is one.
            tryAsyncWait();

            // Finally, resolve the promise.
            resolve(bytesWritten);
          } catch (err) {
            // Reject the promise on error.
            reject(err);
          }
        },
      });

      // Length 1 imples that there is no in-flight asyncWait, so we may
      // immediately follow through on this write.
      if (this.#outputQueue.length === 1) {
        tryAsyncWait();
      }
    });
  }

  /**
   * Asynchronously read string from underlying socket and return it.
   *
   * When read is called, we create a new promise and queue it on the input
   * queue. If it is the only element in the queue, we ask the input stream to
   * run it immediately.
   * Otherwise, the previous item of the queue will run it after it finishes.
   *
   * This function is expected to throw when the underlying socket has been
   * closed.
   *
   * @returns {Promise<string>} The read string
   */
  async read() {
    return new Promise((resolve, reject) => {
      const tryAsyncWait = () => {
        if (this.#inputQueue.length) {
          this.#inputStream.asyncWait(
            this.#inputQueue.at(0), // next input request
            0,
            0,
            Services.tm.currentThread
          );
        }
      };

      this.#inputQueue.push({
        onInputStreamReady: () => {
          try {
            if (!this.#scriptableInputStream.available()) {
              // This means EOF, but not closed yet. However, arriving at EOF
              // should be an error condition for us, since we are in a socket,
              // and EOF should mean peer disconnected.
              // If the stream has been closed, this function itself should
              // throw.
              reject(
                new Error("onInputStreamReady called without available bytes.")
              );
              return;
            }

            // Read our string from input stream.
            const str = this.#scriptableInputStream.read(
              this.#scriptableInputStream.available()
            );

            // Remove this callback object from queue now that we have read.
            this.#inputQueue.shift();

            // Start waiting for incoming data again if the reading queue is not
            // empty.
            tryAsyncWait();

            // Finally resolve the promise.
            resolve(str);
          } catch (err) {
            // E.g., we received a NS_BASE_STREAM_CLOSED because the socket was
            // closed.
            reject(err);
          }
        },
      });

      // Length 1 imples that there is no in-flight asyncWait, so we may
      // immediately follow through on this read.
      if (this.#inputQueue.length === 1) {
        tryAsyncWait();
      }
    });
  }

  /**
   * Close the streams.
   */
  close() {
    this.#outputStream.close();
    this.#inputStream.close();
  }
}

/**
 * @typedef Command
 * @property {string} commandString The string to send over the control port
 * @property {Function} resolve The function to resolve the promise with the
 * response we got on the control port
 * @property {Function} reject The function to reject the promise associated to
 * the command
 */
/**
 * The ID of a circuit.
 * From control-spec.txt:
 *   CircuitID = 1*16 IDChar
 *   IDChar = ALPHA / DIGIT
 *   Currently, Tor only uses digits, but this may change.
 *
 * @typedef {string} CircuitID
 */
/**
 * The ID of a stream.
 * From control-spec.txt:
 *   CircuitID = 1*16 IDChar
 *   IDChar = ALPHA / DIGIT
 *   Currently, Tor only uses digits, but this may change.
 *
 * @typedef {string} StreamID
 */
/**
 * The fingerprint of a node.
 * From control-spec.txt:
 *   Fingerprint = "$" 40*HEXDIG
 * However, we do not keep the $ in our structures.
 *
 * @typedef {string} NodeFingerprint
 */
/**
 * @typedef {object} CircuitInfo
 * @property {CircuitID} id The ID of a circuit
 * @property {NodeFingerprint[]} nodes List of node fingerprints
 */
/**
 * @typedef {object} Bridge
 * @property {string} transport The transport of the bridge, or vanilla if not
 * specified
 * @property {string} addr The IP address and port of the bridge
 * @property {NodeFingerprint} id The fingerprint of the bridge
 * @property {string} args Optional arguments passed to the bridge
 */
/**
 * @typedef {object} PTInfo The information about a pluggable transport
 * @property {string[]} transports An array with all the transports supported by
 * this configuration
 * @property {string} type Either socks4, socks5 or exec
 * @property {string} [ip] The IP address of the proxy (only for socks4 and
 * socks5)
 * @property {integer} [port] The port of the proxy (only for socks4 and socks5)
 * @property {string} [pathToBinary] Path to the binary that is run (only for
 * exec)
 * @property {string} [options] Optional options passed to the binary (only for
 * exec)
 */
/**
 * @typedef {object} OnionAuthKeyInfo
 * @property {string} address The address of the onion service
 * @property {string} typeAndKey Onion service key and type of key, as
 * `type:base64-private-key`
 * @property {string} Flags Additional flags, such as Permanent
 */
/**
 * @callback EventCallback A callback to receive messages from the control
 * port.
 * @param {string} message The message to handle
 */

/**
 * This is a custom error thrown when we receive an error response over the
 * control port.
 *
 * It includes the command that caused it, the error code and the raw message
 * sent by the tor daemon.
 */
class TorProtocolError extends Error {
  constructor(command, reply) {
    super(`${command} -> ${reply}`);
    this.name = "TorProtocolError";
    const info = reply.match(/(?<code>\d{3})(?:\s(?<message>.+))?/);
    this.torStatusCode = info.groups.code;
    if (info.groups.message) {
      this.torMessage = info.groups.message;
    }
  }
}

/**
 * This class implements a JavaScript API around some of the commands and
 * notifications that can be sent and received with tor's control port protocol.
 */
export class TorController {
  /**
   * The socket to write to the control port.
   *
   * @type {AsyncSocket}
   */
  #socket;

  /**
   * Data we received on a read but that was not a complete line (missing a
   * final CRLF). We will prepend it to the next read.
   *
   * @type {string}
   */
  #pendingData = "";
  /**
   * The lines we received and are still queued for being evaluated.
   *
   * @type {string[]}
   */
  #pendingLines = [];
  /**
   * The commands that need to be run or receive a response.
   *
   * @type {Command[]}
   */
  #commandQueue = [];

  /**
   * The event handler.
   *
   * @type {TorEventHandler}
   */
  #eventHandler;

  /**
   * Connect to a control port over a Unix socket.
   * Not available on Windows.
   *
   * @param {nsIFile} ipcFile The path to the Unix socket to connect to
   * @param {TorEventHandler} eventHandler The event handler to use for
   * asynchronous notifications
   * @returns {TorController}
   */
  static fromIpcFile(ipcFile, eventHandler) {
    return new TorController(AsyncSocket.fromIpcFile(ipcFile), eventHandler);
  }

  /**
   * Connect to a control port over a TCP socket.
   *
   * @param {string} host The hostname to connect to
   * @param {number} port The port to connect the to
   * @param {TorEventHandler} eventHandler The event handler to use for
   * asynchronous notifications
   * @returns {TorController}
   */
  static fromSocketAddress(host, port, eventHandler) {
    return new TorController(
      AsyncSocket.fromSocketAddress(host, port),
      eventHandler
    );
  }

  /**
   * Construct the controller and start the message pump.
   * The class should not be constructed directly, but through static methods.
   * However, this is public because JavaScript does not support private
   * constructors.
   *
   * @private
   * @param {AsyncSocket} socket The socket to use
   * @param {TorEventHandler} eventHandler The event handler to use for
   * asynchronous notifications
   */
  constructor(socket, eventHandler) {
    this.#socket = socket;
    this.#eventHandler = eventHandler;
    this.#startMessagePump();
  }

  // Socket and communication handling

  /**
   * Return the next line in the queue. If there is not any, block until one is
   * read (or until a communication error happens, including the underlying
   * socket being closed while it was still waiting for data).
   * Any letfovers will be prepended to the next read.
   *
   * @returns {Promise<string>} A line read over the socket
   */
  async #readLine() {
    // Keep reading from socket until we have at least a full line to return.
    while (!this.#pendingLines.length) {
      if (!this.#socket) {
        throw new Error(
          "Read interrupted because the control socket is not available anymore"
        );
      }
      // Read data from our socket and split on newline tokens.
      // This might still throw when the socket has been closed.
      this.#pendingData += await this.#socket.read();
      const lines = this.#pendingData.split("\r\n");
      // The last line will either be empty string, or a partial read of a
      // response/event so save it off for the next socket read.
      this.#pendingData = lines.pop();
      // Copy remaining full lines to our pendingLines list.
      this.#pendingLines = this.#pendingLines.concat(lines);
    }
    return this.#pendingLines.shift();
  }

  /**
   * Blocks until an entire message is ready and returns it.
   * This function does a rudimentary parsing of the data only to handle
   * multi-line responses.
   *
   * @returns {Promise<string>} The read message (without the final CRLF)
   */
  async #readMessage() {
    // Whether we are searching for the end of a multi-line values.
    // See control-spec section 3.9.
    let handlingMultlineValue = false;
    let endOfMessageFound = false;
    const message = [];

    do {
      const line = await this.#readLine();
      message.push(line);

      if (handlingMultlineValue) {
        // look for end of multiline
        if (line === ".") {
          handlingMultlineValue = false;
        }
      } else {
        // 'Multiline values' are possible. We avoid interrupting one by
        // detecting it and waiting for a terminating "." on its own line.
        // (See control-spec section 3.9 and
        // https://gitlab.torproject.org/tpo/applications/tor-browser/-/issues/16990#note_2625464).
        // Ensure this is the first line of a new message
        // eslint-disable-next-line no-lonely-if
        if (message.length === 1 && line.match(/^\d\d\d\+.+?=$/)) {
          handlingMultlineValue = true;
        }
        // Look for end of message (notice the space character at end of the
        // regex!).
        else if (line.match(/^\d\d\d /)) {
          if (message.length === 1) {
            endOfMessageFound = true;
          } else {
            const firstReplyCode = message[0].substring(0, 3);
            const lastReplyCode = line.substring(0, 3);
            endOfMessageFound = firstReplyCode === lastReplyCode;
          }
        }
      }
    } while (!endOfMessageFound);

    // join our lines back together to form one message
    return message.join("\r\n");
  }

  /**
   * Handles a message that was received as a reply to a command (i.e., all the
   * messages that are not async notification messages starting with 650).
   *
   * @param {string} message The message to handle
   */
  #handleCommandReply(message) {
    const cmd = this.#commandQueue.shift();
    // We resolve also for messages that are failures for sure. The commands
    // should always check the output.
    cmd.resolve(message);

    // send next command if one is available
    if (this.#commandQueue.length) {
      this.#writeNextCommand();
    }
  }

  /**
   * Read messages on the socket and routed them to a dispatcher until the
   * socket is open or some error happens (including the underlying socket being
   * closed).
   */
  async #startMessagePump() {
    try {
      // This while is inside the try block because it is very likely that it
      // will be broken by a NS_BASE_STREAM_CLOSED exception, rather than by its
      // condition becoming false.
      while (this.#socket) {
        const message = await this.#readMessage();
        try {
          if (message.startsWith("650")) {
            this.#handleNotification(message);
          } else {
            this.#handleCommandReply(message);
          }
        } catch (err) {
          // E.g., if a notification handler fails. Without this internal
          // try/catch we risk of closing the connection while not actually
          // needed.
          logger.error("Caught an exception while handling a message", err);
        }
      }
    } catch (err) {
      logger.debug("Caught an exception, closing the control port", err);
      try {
        this.#close(err);
      } catch (ec) {
        logger.error(
          "Caught another error while closing the control socket.",
          ec
        );
      }
    }
  }

  /**
   * Start running the first available command in the queue.
   * To be called when the previous one has finished running.
   * This makes sure to avoid conflicts when using the control port.
   */
  #writeNextCommand() {
    const cmd = this.#commandQueue[0];
    this.#socket.write(`${cmd.commandString}\r\n`).catch(cmd.reject);
  }

  /**
   * Send a command over the control port.
   * This function returns only when it receives a complete message over the
   * control port. This class does some rudimentary parsing to check wheter it
   * needs to handle multi-line messages.
   *
   * @param {string} commandString The command to send
   * @returns {Promise<string>} The message sent by the control port. The return
   * value should never be an empty string (even though it will not include the
   * final CRLF).
   */
  async #sendCommand(commandString) {
    if (!this.#socket) {
      throw new Error("ControlSocket not open");
    }

    // this promise is resolved either in #handleCommandReply, or in
    // #startMessagePump (on stream error)
    return new Promise((resolve, reject) => {
      const command = {
        commandString,
        resolve,
        reject,
      };
      this.#commandQueue.push(command);
      if (this.#commandQueue.length === 1) {
        this.#writeNextCommand();
      }
    });
  }

  /**
   * Send a simple command whose response is expected to be simply a "250 OK".
   * The function will not return a reply, but will throw if an unexpected one
   * is received.
   *
   * @param {string} command The command to send
   */
  async #sendCommandSimple(command) {
    const reply = await this.#sendCommand(command);
    if (!/^250 OK\s*$/i.test(reply)) {
      throw new TorProtocolError(command, reply);
    }
  }

  /**
   * Reject all the commands that are still in queue and close the control
   * socket.
   *
   * @param {object?} reason An error object used to pass a more specific
   * rejection reason to the commands that are still queued.
   */
  #close(reason) {
    logger.info("Closing the control port", reason);
    const error = new Error(
      "The control socket has been closed" +
        (reason ? `: ${reason.message}` : "")
    );
    const commands = this.#commandQueue;
    this.#commandQueue = [];
    for (const cmd of commands) {
      cmd.reject(error);
    }
    try {
      this.#socket?.close();
    } finally {
      this.#socket = null;
    }
  }

  /**
   * Closes the socket connected to the control port.
   */
  close() {
    this.#close(null);
  }

  /**
   * Tells whether the underlying socket is still open.
   *
   * @returns {boolean}
   */
  get isOpen() {
    return !!this.#socket;
  }

  /**
   * Authenticate to the tor daemon.
   * Notice that a failure in the authentication makes the connection close.
   *
   * @param {Uint8Array} password The password for the control port, as an array
   * of bytes
   */
  async authenticate(password) {
    const passwordString = Array.from(password ?? [], b =>
      b.toString(16).padStart(2, "0")
    ).join("");
    await this.#sendCommandSimple(`authenticate ${passwordString}`);
  }

  // Information

  /**
   * Sends a GETINFO for a single key.
   * control-spec.txt says "one ReplyLine is sent for each requested value", so,
   * we expect to receive only one line starting with `250-keyword=`, or one
   * line starting with `250+keyword=` (in which case we will match until a
   * period).
   * This function could be possibly extended to handle several keys at once,
   * but we currently do not need this functionality, so we preferred keeping
   * the function simpler.
   *
   * @param {string} key The key to get value for
   * @returns {Promise<string>} The string we received (only the value, without
   * the key). We do not do any additional parsing on it
   */
  async #getInfo(key) {
    this.#expectString(key);
    const cmd = `GETINFO ${key}`;
    const reply = await this.#sendCommand(cmd);
    const match =
      reply.match(/^250-([^=]+)=(.*)$/m) ||
      reply.match(/^250\+([^=]+)=\r?\n(.*?)\r?\n^\.\r?\n^250 OK\s*$/ms);
    if (!match || match[1] !== key) {
      throw new TorProtocolError(cmd, reply);
    }
    return match[2];
  }

  /**
   * Ask Tor its bootstrap phase.
   *
   * @returns {object} An object with the bootstrap information received from
   * Tor. Its keys might vary, depending on the input
   */
  async getBootstrapPhase() {
    return this.#parseBootstrapStatus(
      await this.#getInfo("status/bootstrap-phase")
    );
  }

  /**
   * Get the IPv4 and optionally IPv6 addresses of an onion router.
   *
   * @param {NodeFingerprint} id The fingerprint of the node the caller is
   * interested in
   * @returns {string[]} The IP addresses (one IPv4 and optionally an IPv6)
   */
  async getNodeAddresses(id) {
    this.#expectString(id, "id");
    const reply = await this.#getInfo(`ns/id/${id}`);
    // See dir-spec.txt.
    // r nickname identity digest publication IP OrPort DirPort
    const rLine = reply.match(/^r\s+(.*)$/m);
    const v4 = rLine ? rLine[1].split(/\s+/) : [];
    // Tor should already reply with a 552 when a relay cannot be found.
    // Also, publication is a date with a space inside, so it is counted twice.
    if (!rLine || v4.length !== 8) {
      throw new Error(`Received an invalid node information: ${reply}`);
    }
    const addresses = [v4[5]];
    // a address:port
    // dir-spec.txt also states only the first one should be taken
    const v6 = reply.match(/^a\s+\[([0-9a-fA-F:]+)\]:\d{1,5}$/m);
    if (v6) {
      addresses.push(v6[1]);
    }
    return addresses;
  }

  /**
   * Maps IP addresses to 2-letter country codes, or ?? if unknown.
   *
   * @param {string} ip The IP address to look for
   * @returns {Promise<string>} A promise with the country code. If unknown, the
   * promise is resolved with "??". It is rejected only when the underlying
   * GETINFO command fails or if an exception is thrown
   */
  async getIPCountry(ip) {
    this.#expectString(ip, "ip");
    return this.#getInfo(`ip-to-country/${ip}`);
  }

  /**
   * Ask Tor a list of circuits.
   *
   * @returns {CircuitInfo[]} An array with a string for each line
   */
  async getCircuits() {
    const circuits = await this.#getInfo("circuit-status");
    return circuits
      .split(/\r?\n/)
      .map(this.#parseCircBuilt.bind(this))
      .filter(circ => circ);
  }

  // Configuration

  /**
   * Sends a GETCONF for a single key.
   * The function could be easily generalized to get multiple keys at once, but
   * we do not need this functionality, at the moment.
   *
   * @param {string} key The keys to get info for
   * @returns {Promise<string[]>} The values obtained from the control port.
   * The key is removed, and the values unescaped, but they are not parsed.
   * The array might contain an empty string, which means that the default value
   * is used
   */
  async #getConf(key) {
    this.#expectString(key, "key");
    // GETCONF expects a `keyword`, which should be only alpha characters,
    // according to the definition in control-port.txt. But as a matter of fact,
    // several configuration keys include numbers (e.g., Socks4Proxy). So, we
    // accept also numbers in this regular expression. One of the reason to
    // sanitize the input is that we then use it to create a regular expression.
    // Sadly, JavaScript does not provide a function to escape/quote a string
    // for inclusion in a regex. Should we remove this limitation, we should
    // also implement a regex sanitizer, or switch to another pattern, like
    // `([^=])` and then filter on the keyword.
    if (!/^[A-Za-z0-9]+$/.test(key)) {
      throw new Error("The key can be composed only of letters and numbers.");
    }
    const cmd = `GETCONF ${key}`;
    const reply = await this.#sendCommand(cmd);
    // From control-spec.txt: a 'default' value semantically different from an
    // empty string will not have an equal sign, just `250 $key`.
    const defaultRe = new RegExp(`^250[-\\s]${key}$`, "gim");
    if (reply.match(defaultRe)) {
      return [];
    }
    const re = new RegExp(`^250[-\\s]${key}=(.*)$`, "gim");
    const values = Array.from(reply.matchAll(re), m =>
      TorParsers.unescapeString(m[1])
    );
    if (!values.length) {
      throw new TorProtocolError(cmd, reply);
    }
    return values;
  }

  /**
   * Get the bridges Tor has been configured with.
   *
   * @returns {Bridge[]} The configured bridges
   */
  async getBridges() {
    let missingId = false;
    const bridges = (await this.#getConf("BRIDGE")).map(line => {
      const info = TorParsers.parseBridgeLine(line);
      if (!info.id) {
        missingId = true;
      }
      return info;
    });

    // tor-browser#42541: bridge lines are allowed not to have a fingerprint.
    // If such a bridge is in use, we will fail to associate it to the circuits,
    // and the circuit display will not be shown.
    // Tor provides a couple of GETINFO commands we can try to use to get more
    // data about bridges, in particular GETINFO ns/purpose/bridge.
    // While it tells us the bridge's IP (as configured by the user, which might
    // be different from the real one with some PTs such as Snowflake), it does
    // not tell the pluggable transport.
    // Therefore, we need to start from the configured bridge lines, and if we
    // detect that a bridge does not have a fingerprint, we try to associate one
    // through its IP address and port.
    // However, users can set them directly, therefore we might end up setting
    // a fingerprint to the wrong line (e.g., if the IP address is reused).
    // Also, we are not sure about when the data of ns/purpose/bridge is
    // populated.
    // Usually, we are interested only in the data of currently active bridges
    // for the circuit display. So, as a matter of fact, we expect to have
    // entries and to expose only the correct and working data in the frontend.
    if (missingId) {
      // See https://spec.torproject.org/dir-spec/consensus-formats.html.
      // r <name> <identity> <digest> <date> <time> <address> <orport> <dirport>
      const info = (await this.#getInfo("ns/purpose/bridge")).matchAll(
        /^r\s+\S+\s+(?<identity>\S+)\s+\S+\s+\S+\s+\S+\s+(?<address>\S+)\s+(?<orport>\d+)/gm
      );
      const b64ToHex = b64 => {
        let hex = "";
        const raw = atob(b64);
        for (let i = 0; i < raw.length; i++) {
          hex += raw.charCodeAt(i).toString(16).toUpperCase().padStart(2, "0");
        }
        return hex;
      };
      const knownBridges = new Map(
        Array.from(info, m => [
          `${m.groups.address}:${m.groups.orport}`,
          b64ToHex(m.groups.identity),
        ])
      );
      for (const b of bridges) {
        if (!b.id) {
          // We expect the addresses of these lines to be only IPv4, therefore
          // we do not check for brackets, even though they might be matched by
          // our regex.
          b.id = knownBridges.get(b.addr) ?? "";
        }
      }
    }

    return bridges;
  }

  /**
   * Get the configured pluggable transports.
   *
   * @returns {PTInfo[]} An array with the info of all the configured pluggable
   * transports.
   */
  async getPluggableTransports() {
    return (await this.#getConf("ClientTransportPlugin")).map(ptLine => {
      // man 1 tor: ClientTransportPlugin transport socks4|socks5 IP:PORT
      const socksLine = ptLine.match(
        /(\S+)\s+(socks[45])\s+([\d.]{7,15}|\[[\da-fA-F:]+\]):(\d{1,5})/i
      );
      // man 1 tor: transport exec path-to-binary [options]
      const execLine = ptLine.match(
        /(\S+)\s+(exec)\s+("(?:[^"\\]|\\.)*"|\S+)\s*(.*)/i
      );
      if (socksLine) {
        return {
          transports: socksLine[1].split(","),
          type: socksLine[2].toLowerCase(),
          ip: socksLine[3],
          port: parseInt(socksLine[4], 10),
        };
      } else if (execLine) {
        return {
          transports: execLine[1].split(","),
          type: execLine[2].toLowerCase(),
          pathToBinary: TorParsers.unescapeString(execLine[3]),
          options: execLine[4],
        };
      }
      throw new Error(
        `Received an invalid ClientTransportPlugin line: ${ptLine}`
      );
    });
  }

  /**
   * Send multiple configuration values to tor.
   *
   * @param {Array} values The values to set. It should be an array of
   * [key, value] pairs to pass to SETCONF. Keys can be repeated, and array
   * values will be automatically unrolled.
   */
  async setConf(values) {
    const args = values
      .flatMap(([key, value]) => {
        if (value === undefined || value === null) {
          return [key];
        }
        if (Array.isArray(value)) {
          return value.length
            ? value.map(v => `${key}=${TorParsers.escapeString(v)}`)
            : key;
        } else if (typeof value === "string" || value instanceof String) {
          return `${key}=${TorParsers.escapeString(value)}`;
        } else if (typeof value === "boolean") {
          return `${key}=${value ? "1" : "0"}`;
        } else if (typeof value === "number") {
          return `${key}=${value}`;
        }
        throw new Error(`Unsupported type ${typeof value} (key ${key})`);
      })
      .join(" ");
    return this.#sendCommandSimple(`SETCONF ${args}`);
  }

  /**
   * Enable or disable the network.
   * Notice: switching from network disabled to network enabled will trigger a
   * bootstrap on C tor! (Or stop the current one).
   *
   * @param {boolean} enabled Tell whether the network should be enabled
   */
  async setNetworkEnabled(enabled) {
    return this.setConf([["DisableNetwork", !enabled]]);
  }

  /**
   * Ask Tor to write out its config options into its torrc.
   */
  async flushSettings() {
    return this.#sendCommandSimple("SAVECONF");
  }

  // Onion service authentication

  /**
   * Sends a ONION_CLIENT_AUTH_VIEW command to retrieve the list of private
   * keys.
   *
   * @returns {OnionAuthKeyInfo[]}
   */
  async onionAuthViewKeys() {
    const cmd = "onion_client_auth_view";
    const message = await this.#sendCommand(cmd);
    // Either `250-CLIENT`, or `250 OK` if no keys are available.
    if (!message.startsWith("250")) {
      throw new TorProtocolError(cmd, message);
    }
    const re =
      /^250-CLIENT\s+(?<HSAddress>[A-Za-z2-7]+)\s+(?<KeyType>[^:]+):(?<PrivateKeyBlob>\S+)(?:\s(?<other>.+))?$/gim;
    return Array.from(message.matchAll(re), match => {
      // TODO: Change the consumer and make the fields more consistent with what
      // we get (e.g., separate key and type, and use a boolen for permanent).
      const info = {
        address: match.groups.HSAddress,
        keyType: match.groups.KeyType,
        keyBlob: match.groups.PrivateKeyBlob,
        flags: [],
      };
      const maybeFlags = match.groups.other?.match(/Flags=(\S+)/);
      if (maybeFlags) {
        info.flags = maybeFlags[1].split(",");
      }
      return info;
    });
  }

  /**
   * Sends an ONION_CLIENT_AUTH_ADD command to add a private key to the Tor
   * configuration.
   *
   * @param {string} address The address of the onion service
   * @param {string} b64PrivateKey The private key of the service, in base64
   * @param {boolean} isPermanent Tell whether the key should be saved forever
   */
  async onionAuthAdd(address, b64PrivateKey, isPermanent) {
    this.#expectString(address, "address");
    this.#expectString(b64PrivateKey, "b64PrivateKey");
    const keyType = "x25519";
    let cmd = `onion_client_auth_add ${address} ${keyType}:${b64PrivateKey}`;
    if (isPermanent) {
      cmd += " Flags=Permanent";
    }
    const reply = await this.#sendCommand(cmd);
    const status = reply.substring(0, 3);
    if (status !== "250" && status !== "251" && status !== "252") {
      throw new TorProtocolError(cmd, reply);
    }
  }

  /**
   * Sends an ONION_CLIENT_AUTH_REMOVE command to remove a private key from the
   * Tor configuration.
   *
   * @param {string} address The address of the onion service
   */
  async onionAuthRemove(address) {
    this.#expectString(address, "address");
    const cmd = `onion_client_auth_remove ${address}`;
    const reply = await this.#sendCommand(cmd);
    const status = reply.substring(0, 3);
    if (status !== "250" && status !== "251") {
      throw new TorProtocolError(cmd, reply);
    }
  }

  // Daemon ownership

  /**
   * Instructs Tor to shut down when this control connection is closed.
   * If multiple connection sends this request, Tor will shut dwon when any of
   * them is closed.
   */
  async takeOwnership() {
    return this.#sendCommandSimple("TAKEOWNERSHIP");
  }

  /**
   * The __OwningControllerProcess argument can be used to make Tor periodically
   * check if a certain PID is still present, or terminate itself otherwise.
   * When switching to the ownership tied to the control port, this mechanism
   * should be stopped by calling this function.
   */
  async resetOwningControllerProcess() {
    return this.#sendCommandSimple("RESETCONF __OwningControllerProcess");
  }

  // Signals

  /**
   * Ask Tor to swtich to new circuits and clear the DNS cache.
   */
  async newnym() {
    return this.#sendCommandSimple("SIGNAL NEWNYM");
  }

  // Events monitoring

  /**
   * Enable receiving certain events.
   * As per control-spec.txt, any events turned on in previous calls but not
   * included in this one will be turned off.
   *
   * @param {string[]} types The events to enable. If empty, no events will be
   * watched.
   * @returns {Promise<void>}
   */
  setEvents(types) {
    if (!types.every(t => typeof t === "string" || t instanceof String)) {
      throw new Error("Event types must be strings");
    }
    return this.#sendCommandSimple("SETEVENTS " + types.join(" "));
  }

  /**
   * Parse an asynchronous event and pass the data to the relative handler.
   * Only single-line messages are currently supported.
   *
   * @param {string} message The message received on the control port. It should
   * starts with `"650" SP`.
   */
  #handleNotification(message) {
    if (!this.#eventHandler) {
      return;
    }
    const data = message.match(/^650\s+(?<type>\S+)\s*(?<data>.*)?/);
    if (!data) {
      return;
    }
    switch (data.groups.type) {
      case "STATUS_CLIENT":
        let status;
        try {
          status = this.#parseBootstrapStatus(data.groups.data);
        } catch (e) {
          // Probably, a non bootstrap client status
          logger.debug(`Failed to parse STATUS_CLIENT: ${data.groups.data}`, e);
          break;
        }
        this.#eventHandler.onBootstrapStatus(status);
        break;
      case "CIRC":
        const maybeCircuit = this.#parseCircBuilt(data.groups.data);
        const closedEvent = /^(?<ID>[a-zA-Z0-9]{1,16})\sCLOSED/.exec(
          data.groups.data
        );
        if (maybeCircuit) {
          this.#eventHandler.onCircuitBuilt(
            maybeCircuit.id,
            maybeCircuit.nodes
          );
        } else if (closedEvent) {
          this.#eventHandler.onCircuitClosed(closedEvent.groups.ID);
        }
        break;
      case "STREAM":
        const sentConnectEvent =
          /^(?<StreamID>[a-zA-Z0-9]{1,16})\sSENTCONNECT\s(?<CircuitID>[a-zA-Z0-9]{1,16})/.exec(
            data.groups.data
          );
        if (sentConnectEvent) {
          const credentials = this.#parseCredentials(data.groups.data);
          this.#eventHandler.onStreamSentConnect(
            sentConnectEvent.groups.StreamID,
            sentConnectEvent.groups.CircuitID,
            credentials?.username ?? null,
            credentials?.password ?? null
          );
        }
        break;
      case "NOTICE":
      case "WARN":
      case "ERR":
        this.#eventHandler.onLogMessage(data.groups.type, data.groups.data);
        break;
    }
  }

  // Parsers

  /**
   * Parse a bootstrap status line.
   *
   * @param {string} line The line to parse, without the command/notification
   * prefix
   * @returns {object} An object with the bootstrap information received from
   * Tor. Its keys might vary, depending on the input
   */
  #parseBootstrapStatus(line) {
    const match = line.match(/^(NOTICE|WARN) BOOTSTRAP\s*(.*)/);
    if (!match) {
      throw Error(
        `Received an invalid response for the bootstrap phase: ${line}`
      );
    }
    const status = {
      // Type is actually StatusSeverity in the specifications.
      TYPE: match[1],
      ...this.#getKeyValues(match[2]),
    };
    if (status.PROGRESS !== undefined) {
      status.PROGRESS = parseInt(status.PROGRESS, 10);
    }
    if (status.COUNT !== undefined) {
      status.COUNT = parseInt(status.COUNT, 10);
    }
    return status;
  }

  /**
   * Parse a CIRC BUILT event or a GETINFO circuit-status.
   *
   * @param {string} line The line to parse
   * @returns {CircuitInfo?} The ID and nodes of the circuit, or null if the
   * parsing failed.
   */
  #parseCircBuilt(line) {
    const builtEvent =
      /^(?<ID>[a-zA-Z0-9]{1,16})\sBUILT\s(?<Path>(,?\$([0-9a-fA-F]{40})(?:~[a-zA-Z0-9]{1,19})?)+)/.exec(
        line
      );
    if (!builtEvent) {
      return null;
    }
    const fp = /\$([0-9a-fA-F]{40})/g;
    const nodes = Array.from(builtEvent.groups.Path.matchAll(fp), g =>
      g[1].toUpperCase()
    );
    // In some cases, we might already receive SOCKS credentials in the
    // line. However, this might be a problem with Onion services: we get
    // also a 4-hop circuit that we likely do not want to show to the
    // user, especially because it is used only temporarily, and it would
    // need a technical explaination.
    // So we do not try to extract them for now. Otherwise, we could do
    // const credentials = this.#parseCredentials(line);
    return { id: builtEvent.groups.ID, nodes };
  }

  /**
   * Check if a STREAM or CIRC response line contains SOCKS_USERNAME and
   * SOCKS_PASSWORD.
   *
   * @param {string} line The circ or stream line to check
   * @returns {object?} The credentials, or null if not found
   */
  #parseCredentials(line) {
    const username = /SOCKS_USERNAME=("(?:[^"\\]|\\.)*")/.exec(line);
    const password = /SOCKS_PASSWORD=("(?:[^"\\]|\\.)*")/.exec(line);
    return username && password
      ? {
          username: TorParsers.unescapeString(username[1]),
          password: TorParsers.unescapeString(password[1]),
        }
      : null;
  }

  /**
   * Return an object with all the matches that are in the form `key="value"` or
   * `key=value`. The values will be unescaped, but no additional parsing will
   * be done (e.g., numbers will be returned as strings).
   * If keys are repeated, only the last one will be taken.
   *
   * @param {string} str The string to match tokens in
   * @returns {object} An object with all the various tokens. If none is found,
   * an empty object is returned.
   */
  #getKeyValues(str) {
    return Object.fromEntries(
      Array.from(
        str.matchAll(/\s*([^=]+)=("(?:[^"\\]|\\.)*"|\S+)\s*/g) || [],
        pair => [pair[1], TorParsers.unescapeString(pair[2])]
      )
    );
  }

  // Other helpers

  /**
   * Throw an exception when value is not a string.
   *
   * @param {any} value The value to check
   * @param {string} name The name of the `value` argument
   */
  #expectString(value, name) {
    if (typeof value !== "string" && !(value instanceof String)) {
      throw new Error(`The ${name} argument is expected to be a string.`);
    }
  }
}

/**
 * @typedef {object} TorEventHandler
 * The event handler interface.
 * The controller owner can implement this methods to receive asynchronous
 * notifications from the controller.
 *
 * @property {OnBootstrapStatus} onBootstrapStatus Called when a bootstrap
 * status is received (i.e., a STATUS_CLIENT event with a BOOTSTRAP action)
 * @property {OnLogMessage} onLogMessage Called when a log message is received
 * (i.e., a NOTICE, WARN or ERR notification)
 * @property {OnCircuitBuilt} onCircuitBuilt Called when a circuit is built
 * (i.e., a CIRC event with a BUILT status)
 * @property {OnCircuitClosed} onCircuitClosed Called when a circuit is closed
 * (i.e., a CIRC event with a CLOSED status)
 * @property {OnStreamSentConnect} onStreamSentConnect Called when a stream sent
 * a connect cell along a circuit (i.e., a STREAM event with a SENTCONNECT
 * status)
 */
/**
 * @callback OnBootstrapStatus
 *
 * @param {object} status An object with the bootstrap information. Its keys
 * depend on what the arguments sent by the tor daemon
 */
/**
 * @callback OnLogMessage
 *
 * @param {string} type The type of message (NOTICE, WARNING, ERR, etc...)
 * @param {string} message The actual log message
 */
/**
 * @callback OnCircuitBuilt
 *
 * @param {CircuitID} id The id of the circuit that has been built
 * @param {NodeFingerprint[]} nodes The onion routers composing the circuit
 */
/**
 * @callback OnCircuitClosed
 *
 * @param {CircuitID} id The id of the circuit that has been closed
 */
/**
 * @callback OnStreamSentConnect
 *
 * @param {StreamID} streamId The id of the stream that switched to the succeeded
 * state
 * @param {CircuitID} circuitId The id of the circuit the stream is using
 * @param {string?} username The SOCKS username associated to the stream, or
 * null if not available
 * @param {string?} username The SOCKS password associated to the stream, or
 * null if not available
 */
