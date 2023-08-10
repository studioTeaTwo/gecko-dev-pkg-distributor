from fluent.migrate.helpers import transforms_from


def migrate(ctx):
    dtd_path = "torbutton.dtd"
    properties_path = "torbutton.properties"

    ctx.add_transforms(
        "tor-browser.ftl",
        "tor-browser.ftl",
        transforms_from(
            """
onion-site-authentication-prompt-learn-more = { COPY(path, "onionServices.learnMore") }
onion-site-authentication-prompt-remember-checkbox =
    .label = { COPY(dtd_path, "torbutton.onionServices.authPrompt.persistCheckboxLabel") }
onion-site-authentication-prompt-invalid-key = { COPY(path, "onionServices.authPrompt.invalidKey") }
onion-site-authentication-prompt-setting-key-failed = { COPY(path, "onionServices.authPrompt.failedToSetKey") }
onion-site-authentication-preferences-learn-more = { COPY(path, "onionServices.learnMore") }
onion-site-saved-keys-dialog-table-header-key =
    .label = { COPY(path, "onionServices.authPreferences.onionKey") }
onion-site-saved-keys-dialog-remove-button = { COPY(path, "onionServices.authPreferences.remove") }
onion-site-saved-keys-dialog-remove-keys-error-message = { COPY(path, "onionServices.authPreferences.failedToRemoveKey") }
""",
            dtd_path=dtd_path,
            path=properties_path,
        ),
    )
