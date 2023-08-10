from fluent.migrate.helpers import transforms_from


def migrate(ctx):
    legacy_path = "settings.properties"
    ctx.add_transforms(
        "tor-browser.ftl",
        "tor-browser.ftl",
        transforms_from(
            """
tor-connection-settings-heading = { COPY(path, "settings.categoryTitle") }
tor-connection-browser-learn-more-link = { COPY(path, "settings.learnMore") }

tor-connection-quickstart-heading = { COPY(path, "settings.quickstartHeading") }
tor-connection-quickstart-checkbox =
    .label = { COPY(path, "settings.quickstartCheckbox") }

tor-connection-internet-status-label = { COPY(path, "settings.statusInternetLabel") }
tor-connection-internet-status-test-button = { COPY(path, "settings.statusInternetTest") }
tor-connection-internet-status-online = { COPY(path, "settings.statusInternetOnline") }
tor-connection-internet-status-offline = { COPY(path, "settings.statusInternetOffline") }

tor-bridges-heading = { COPY(path, "settings.bridgesHeading") }
tor-bridges-overview = { COPY(path, "settings.bridgesDescription2") }
tor-bridges-learn-more-link = { COPY(path, "settings.learnMore") }

tor-bridges-built-in-obfs4-description = { COPY(path, "settings.builtinBridgeObfs4Description2") }
tor-bridges-built-in-snowflake-name = { COPY(path, "settings.builtinBridgeSnowflake") }
tor-bridges-built-in-snowflake-description = { COPY(path, "settings.builtinBridgeSnowflakeDescription2") }
tor-bridges-built-in-meek-azure-name = { COPY(path, "settings.builtinBridgeMeekAzure") }
tor-bridges-built-in-meek-azure-description = { COPY(path, "settings.builtinBridgeMeekAzureDescription2") }

remove-all-bridges-warning-title = { COPY(path, "settings.bridgeRemoveAllDialogTitle") }
remove-all-bridges-warning-description = { COPY(path, "settings.bridgeRemoveAllDialogDescription") }
remove-all-bridges-warning-remove-button = { COPY(path, "settings.remove") }

bridge-qr-dialog-title =
    .title = { COPY(path, "settings.scanQrTitle") }

bridge-dialog-button-connect = { COPY(path, "settings.bridgeButtonConnect") }
bridge-dialog-button-accept = { COPY(path, "settings.bridgeButtonAccept") }
bridge-dialog-button-submit = { COPY(path, "settings.submitCaptcha") }

built-in-dialog-title =
    .title = { COPY(path, "settings.builtinBridgeHeader") }
built-in-dialog-snowflake-radio-option =
    .label = { COPY(path, "settings.builtinBridgeSnowflake") }
built-in-dialog-meek-azure-radio-option =
    .label = { COPY(path, "settings.builtinBridgeMeekAzure") }

request-bridge-dialog-title =
    .title = { COPY(path, "settings.requestBridgeDialogTitle") }
request-bridge-dialog-top-wait = { COPY(path, "settings.contactingBridgeDB") }
request-bridge-dialog-top-solve = { COPY(path, "settings.solveTheCaptcha") }
request-bridge-dialog-captcha-input =
    .placeholder = { COPY(path, "settings.captchaTextboxPlaceholder") }
request-bridge-dialog-captcha-failed = { COPY(path, "settings.incorrectCaptcha") }

tor-advanced-settings-heading = { COPY(path, "settings.advancedHeading") }
tor-advanced-settings-button = { COPY(path, "settings.advancedButton") }

tor-log-dialog-copy-button-copied =
    .label = { COPY(path, "settings.copied") }

tor-advanced-dialog-proxy-socks4-menuitem =
    .label = { COPY(path, "settings.proxyTypeSOCKS4") }
tor-advanced-dialog-proxy-socks5-menuitem =
    .label = { COPY(path, "settings.proxyTypeSOCKS5") }
tor-advanced-dialog-proxy-http-menuitem =
    .label = { COPY(path, "settings.proxyTypeHTTP") }
tor-advanced-dialog-proxy-address-input-label = { COPY(path, "settings.proxyAddress") }
tor-advanced-dialog-proxy-address-input =
    .placeholder = { COPY(path, "settings.proxyAddressPlaceholder") }
tor-advanced-dialog-proxy-port-input-label = { COPY(path, "settings.proxyPort") }
tor-advanced-dialog-proxy-username-input-label = { COPY(path, "settings.proxyUsername") }
tor-advanced-dialog-proxy-username-input =
    .placeholder = { COPY(path, "settings.proxyUsernamePasswordPlaceholder") }
tor-advanced-dialog-proxy-password-input-label = { COPY(path, "settings.proxyPassword") }
tor-advanced-dialog-proxy-password-input =
    .placeholder = { COPY(path, "settings.proxyUsernamePasswordPlaceholder") }
tor-advanced-dialog-firewall-checkbox =
    .label = { COPY(path, "settings.useFirewall") }
tor-advanced-dialog-firewall-ports-input =
    .placeholder = { COPY(path, "settings.allowedPortsPlaceholder") }
""",
            path=legacy_path,
        ),
    )
