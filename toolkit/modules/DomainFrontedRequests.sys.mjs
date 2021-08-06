/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

const log = console.createInstance({
  maxLogLevel: "Warn",
  prefix: "DomainFrontendRequests",
});

ChromeUtils.defineESModuleGetters(lazy, {
  EventDispatcher: "resource://gre/modules/Messaging.sys.mjs",
  Subprocess: "resource://gre/modules/Subprocess.sys.mjs",
  TorLauncherUtil: "resource://gre/modules/TorLauncherUtil.sys.mjs",
  TorProviderBuilder: "resource://gre/modules/TorProviderBuilder.sys.mjs",
  TorSettings: "resource://gre/modules/TorSettings.sys.mjs",
});

/**
 * The meek pluggable transport takes the reflector URL and front domain as
 * proxy credentials, which can be prepared with this function.
 *
 * @param {string} proxyType The proxy type (socks for socks5 or socks4)
 * @param {string} reflector The URL of the service hosted by the CDN
 * @param {string} front The domain to use as a front
 * @returns {string[]} An array containing [username, password]
 */
function makeMeekCredentials(proxyType, reflector, front) {
  // Construct the per-connection arguments.
  let meekClientEscapedArgs = "";

  // Escape aValue per section 3.5 of the PT specification:
  //   First the "<Key>=<Value>" formatted arguments MUST be escaped,
  //   such that all backslash, equal sign, and semicolon characters
  //   are escaped with a backslash.
  const escapeArgValue = aValue =>
    aValue
      ? aValue
          .replaceAll("\\", "\\\\")
          .replaceAll("=", "\\=")
          .replaceAll(";", "\\;")
      : "";

  if (reflector) {
    meekClientEscapedArgs += "url=";
    meekClientEscapedArgs += escapeArgValue(reflector);
  }

  if (front) {
    if (meekClientEscapedArgs.length) {
      meekClientEscapedArgs += ";";
    }
    meekClientEscapedArgs += "front=";
    meekClientEscapedArgs += escapeArgValue(front);
  }

  // socks5
  if (proxyType === "socks") {
    if (meekClientEscapedArgs.length <= 255) {
      return [meekClientEscapedArgs, "\x00"];
    }
    return [
      meekClientEscapedArgs.substring(0, 255),
      meekClientEscapedArgs.substring(255),
    ];
  } else if (proxyType === "socks4") {
    return [meekClientEscapedArgs, undefined];
  }
  throw new Error(`Unsupported proxy type ${proxyType}.`);
}

/**
 * Subprocess-based implementation to launch and control a PT process.
 */
class MeekTransport {
  // These members are used by consumers to setup the proxy to do requests over
  // meek. They are passed to newProxyInfoWithAuth.
  proxyType = null;
  proxyAddress = null;
  proxyPort = 0;
  proxyUsername = null;
  proxyPassword = null;

  #inited = false;
  #meekClientProcess = null;

  // launches the meekprocess
  async init(reflector, front) {
    // ensure we haven't already init'd
    if (this.#inited) {
      throw new Error("MeekTransport: Already initialized");
    }

    try {
      // figure out which pluggable transport to use
      const supportedTransports = ["meek", "meek_lite"];
      const provider = await lazy.TorProviderBuilder.build();
      const proxy = (await provider.getPluggableTransports()).find(
        pt =>
          pt.type === "exec" &&
          supportedTransports.some(t => pt.transports.includes(t))
      );
      if (!proxy) {
        throw new Error("No supported transport found.");
      }

      const meekTransport = proxy.transports.find(t =>
        supportedTransports.includes(t)
      );
      // Convert meek client path to absolute path if necessary
      const meekWorkDir = lazy.TorLauncherUtil.getTorFile(
        "pt-startup-dir",
        false
      );
      if (lazy.TorLauncherUtil.isPathRelative(proxy.pathToBinary)) {
        const meekPath = meekWorkDir.clone();
        meekPath.appendRelativePath(proxy.pathToBinary);
        proxy.pathToBinary = meekPath.path;
      }

      // Setup env and start meek process
      const ptStateDir = lazy.TorLauncherUtil.getTorFile("tordatadir", false);
      ptStateDir.append("pt_state"); // Match what tor uses.

      const envAdditions = {
        TOR_PT_MANAGED_TRANSPORT_VER: "1",
        TOR_PT_STATE_LOCATION: ptStateDir.path,
        TOR_PT_EXIT_ON_STDIN_CLOSE: "1",
        TOR_PT_CLIENT_TRANSPORTS: meekTransport,
      };
      if (lazy.TorSettings.proxy.enabled) {
        envAdditions.TOR_PT_PROXY = lazy.TorSettings.proxy.uri;
      }

      const opts = {
        command: proxy.pathToBinary,
        arguments: proxy.options.split(/s+/),
        workdir: meekWorkDir.path,
        environmentAppend: true,
        environment: envAdditions,
        stderr: "pipe",
      };

      // Launch meek client
      this.#meekClientProcess = await lazy.Subprocess.call(opts);

      // Callback chain for reading stderr
      const stderrLogger = async () => {
        while (this.#meekClientProcess) {
          const errString = await this.#meekClientProcess.stderr.readString();
          if (errString) {
            log.error(`MeekTransport: stderr => ${errString}`);
          }
        }
      };
      stderrLogger();

      // Read pt's stdout until terminal (CMETHODS DONE) is reached
      // returns array of lines for parsing
      const getInitLines = async (stdout = "") => {
        stdout += await this.#meekClientProcess.stdout.readString();

        // look for the final message
        const CMETHODS_DONE = "CMETHODS DONE";
        let endIndex = stdout.lastIndexOf(CMETHODS_DONE);
        if (endIndex !== -1) {
          endIndex += CMETHODS_DONE.length;
          return stdout.substring(0, endIndex).split("\n");
        }
        return getInitLines(stdout);
      };

      // read our lines from pt's stdout
      const meekInitLines = await getInitLines();
      // tokenize our pt lines
      const meekInitTokens = meekInitLines.map(line => {
        const tokens = line.split(" ");
        return {
          keyword: tokens[0],
          args: tokens.slice(1),
        };
      });

      // parse our pt tokens
      for (const { keyword, args } of meekInitTokens) {
        const argsJoined = args.join(" ");
        let keywordError = false;
        switch (keyword) {
          case "VERSION": {
            if (args.length !== 1 || args[0] !== "1") {
              keywordError = true;
            }
            break;
          }
          case "PROXY": {
            if (args.length !== 1 || args[0] !== "DONE") {
              keywordError = true;
            }
            break;
          }
          case "CMETHOD": {
            if (args.length !== 3) {
              keywordError = true;
              break;
            }
            const transport = args[0];
            const proxyType = args[1];
            const addrPortString = args[2];
            const addrPort = addrPortString.split(":");

            if (transport !== meekTransport) {
              throw new Error(
                `MeekTransport: Expected ${meekTransport} but found ${transport}`
              );
            }
            if (!["socks4", "socks4a", "socks5"].includes(proxyType)) {
              throw new Error(
                `MeekTransport: Invalid proxy type => ${proxyType}`
              );
            }
            if (addrPort.length !== 2) {
              throw new Error(
                `MeekTransport: Invalid proxy address => ${addrPortString}`
              );
            }
            const addr = addrPort[0];
            const port = parseInt(addrPort[1]);
            if (port < 1 || port > 65535) {
              throw new Error(`MeekTransport: Invalid proxy port => ${port}`);
            }

            // convert proxy type to strings used by protocol-proxy-servce
            this.proxyType = proxyType === "socks5" ? "socks" : "socks4";
            this.proxyAddress = addr;
            this.proxyPort = port;

            break;
          }
          // terminal
          case "CMETHODS": {
            if (args.length !== 1 || args[0] !== "DONE") {
              keywordError = true;
            }
            break;
          }
          // errors (all fall through):
          case "VERSION-ERROR":
          case "ENV-ERROR":
          case "PROXY-ERROR":
          case "CMETHOD-ERROR":
            throw new Error(`MeekTransport: ${keyword} => '${argsJoined}'`);
        }
        if (keywordError) {
          throw new Error(
            `MeekTransport: Invalid ${keyword} keyword args => '${argsJoined}'`
          );
        }
      }

      // register callback to cleanup on process exit
      this.#meekClientProcess.wait().then(() => {
        this.#meekClientProcess = null;
        this.uninit();
      });
      [this.proxyUsername, this.proxyPassword] = makeMeekCredentials(
        this.proxyType,
        reflector,
        front
      );
      this.#inited = true;
    } catch (ex) {
      if (this.#meekClientProcess) {
        this.#meekClientProcess.kill();
        this.#meekClientProcess = null;
      }
      throw ex;
    }
  }

  async uninit() {
    this.#inited = false;

    await this.#meekClientProcess?.kill();
    this.#meekClientProcess = null;
    this.proxyType = null;
    this.proxyAddress = null;
    this.proxyPort = 0;
    this.proxyUsername = null;
    this.proxyPassword = null;
  }
}

/**
 * Android implementation of the Meek process.
 *
 * GeckoView does not provide the subprocess module, so we have to use the
 * EventDispatcher, and have a Java handler start and stop the proxy process.
 */
class MeekTransportAndroid {
  // These members are used by consumers to setup the proxy to do requests over
  // meek. They are passed to newProxyInfoWithAuth.
  proxyType = null;
  proxyAddress = null;
  proxyPort = 0;
  proxyUsername = null;
  proxyPassword = null;

  /**
   * An id for process this instance is linked to.
   *
   * Since we do not restrict the transport to be a singleton, we need a handle to
   * identify the process we want to stop when the transport owner is done.
   * We use a counter incremented on the Java side for now.
   *
   * This number must be a positive integer (i.e., 0 is an invalid handler).
   *
   * @type {number}
   */
  #id = 0;

  async init(reflector, front) {
    // ensure we haven't already init'd
    if (this.#id) {
      throw new Error("MeekTransport: Already initialized");
    }
    const details = await lazy.EventDispatcher.instance.sendRequestForResult({
      type: "GeckoView:Tor:StartMeek",
    });
    this.#id = details.id;
    this.proxyType = "socks";
    this.proxyAddress = details.address;
    this.proxyPort = details.port;
    [this.proxyUsername, this.proxyPassword] = makeMeekCredentials(
      this.proxyType,
      reflector,
      front
    );
  }

  async uninit() {
    lazy.EventDispatcher.instance.sendRequest({
      type: "GeckoView:Tor:StopMeek",
      id: this.#id,
    });
    this.#id = 0;
    this.proxyType = null;
    this.proxyAddress = null;
    this.proxyPort = 0;
    this.proxyUsername = null;
    this.proxyPassword = null;
  }
}

/**
 * Corresponds to a Network error with the request.
 */
export class DomainFrontRequestNetworkError extends Error {
  constructor(request, statusCode) {
    super(`Error fetching ${request.name}: ${statusCode}`);
    this.name = "DomainFrontRequestNetworkError";
    this.statusCode = statusCode;
  }
}

/**
 * Corresponds to a non-ok response from the server.
 */
export class DomainFrontRequestResponseError extends Error {
  constructor(request) {
    super(
      `Error response from ${request.name} server: ${request.responseStatus}`
    );
    this.name = "DomainFrontRequestResponseError";
    this.status = request.responseStatus;
    this.statusText = request.responseStatusText;
  }
}

/**
 * Callback object to promisify the XPCOM request.
 */
class ResponseListener {
  #response = "";
  #responsePromise;
  #resolve;
  #reject;
  constructor() {
    this.#response = "";
    // we need this promise here because await nsIHttpChannel::asyncOpen does
    // not return only once the request is complete, it seems to return
    // after it begins, so we have to get the result from this listener object.
    // This promise is only resolved once onStopRequest is called
    this.#responsePromise = new Promise((resolve, reject) => {
      this.#resolve = resolve;
      this.#reject = reject;
    });
  }

  // callers wait on this for final response
  response() {
    return this.#responsePromise;
  }

  // noop
  onStartRequest() {}

  // resolve or reject our Promise
  onStopRequest(request, status) {
    try {
      if (!Components.isSuccessCode(status)) {
        // Assume this is a network error.
        this.#reject(new DomainFrontRequestNetworkError(request, status));
      }
      if (request.responseStatus !== 200) {
        this.#reject(new DomainFrontRequestResponseError(request));
      }
    } catch (err) {
      this.#reject(err);
    }
    this.#resolve(this.#response);
  }

  // read response data
  onDataAvailable(request, stream, offset, length) {
    const scriptableStream = Cc[
      "@mozilla.org/scriptableinputstream;1"
    ].createInstance(Ci.nsIScriptableInputStream);
    scriptableStream.init(stream);
    this.#response += scriptableStream.read(length);
  }
}

/**
 * Factory to create HTTP(S) requests over a domain fronted transport.
 */
export class DomainFrontRequestBuilder {
  #inited = false;
  #meekTransport = null;

  get inited() {
    return this.#inited;
  }

  async init(reflector, front) {
    if (this.#inited) {
      throw new Error("MoatRPC: Already initialized");
    }

    const meekTransport =
      Services.appinfo.OS === "Android"
        ? new MeekTransportAndroid()
        : new MeekTransport();
    await meekTransport.init(reflector, front);
    this.#meekTransport = meekTransport;
    this.#inited = true;
  }

  async uninit() {
    await this.#meekTransport?.uninit();
    this.#meekTransport = null;
    this.#inited = false;
  }

  buildHttpHandler(uriString) {
    if (!this.#inited) {
      throw new Error("MoatRPC: Not initialized");
    }

    const { proxyType, proxyAddress, proxyPort, proxyUsername, proxyPassword } =
      this.#meekTransport;

    const proxyPS = Cc[
      "@mozilla.org/network/protocol-proxy-service;1"
    ].getService(Ci.nsIProtocolProxyService);
    const flags = Ci.nsIProxyInfo.TRANSPARENT_PROXY_RESOLVES_HOST;
    const noTimeout = 0xffffffff; // UINT32_MAX
    const proxyInfo = proxyPS.newProxyInfoWithAuth(
      proxyType,
      proxyAddress,
      proxyPort,
      proxyUsername,
      proxyPassword,
      undefined,
      undefined,
      flags,
      noTimeout,
      undefined
    );

    const uri = Services.io.newURI(uriString);
    // There does not seem to be a way to directly create an nsILoadInfo from
    // JavaScript, so we create a throw away non-proxied channel to get one.
    const secFlags = Ci.nsILoadInfo.SEC_ALLOW_CROSS_ORIGIN_SEC_CONTEXT_IS_NULL;
    const loadInfo = Services.io.newChannelFromURI(
      uri,
      undefined,
      Services.scriptSecurityManager.getSystemPrincipal(),
      undefined,
      secFlags,
      Ci.nsIContentPolicy.TYPE_OTHER
    ).loadInfo;

    const httpHandler = Services.io
      .getProtocolHandler("http")
      .QueryInterface(Ci.nsIHttpProtocolHandler);
    const ch = httpHandler
      .newProxiedChannel(uri, proxyInfo, 0, undefined, loadInfo)
      .QueryInterface(Ci.nsIHttpChannel);

    // remove all headers except for 'Host"
    const headers = [];
    ch.visitRequestHeaders({
      visitHeader: key => {
        if (key !== "Host") {
          headers.push(key);
        }
      },
    });
    headers.forEach(key => ch.setRequestHeader(key, "", false));

    return ch;
  }

  /**
   * Make a POST request with a JSON body and a JSON response.
   *
   * @param {string} url The URL to load
   * @param {object} args The arguments to send to the procedure. It will be
   * serialized to JSON by this function and then set as POST body
   * @returns {Promise<object>} A promise with the parsed response
   */
  async buildPostRequest(url, args) {
    const ch = this.buildHttpHandler(url);

    const argsJson = JSON.stringify(args);
    const inStream = Cc["@mozilla.org/io/string-input-stream;1"].createInstance(
      Ci.nsIStringInputStream
    );
    inStream.setData(argsJson, argsJson.length);
    const upChannel = ch.QueryInterface(Ci.nsIUploadChannel);
    const contentType = "application/vnd.api+json";
    upChannel.setUploadStream(inStream, contentType, argsJson.length);
    ch.requestMethod = "POST";

    // Make request
    const listener = new ResponseListener();
    await ch.asyncOpen(listener, ch);

    // wait for response
    const responseJSON = await listener.response();

    // parse that JSON
    return JSON.parse(responseJSON);
  }
}
