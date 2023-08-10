from fluent.migrate.helpers import transforms_from


def migrate(ctx):
    ctx.add_transforms(
        "tor-browser.ftl",
        "tor-browser.ftl",
        transforms_from(
            """
onion-neterror-not-found-description = { COPY(path, "onionServices.descNotFound") }
onion-neterror-unreachable-description = { COPY(path, "onionServices.descInvalid") }
onion-neterror-disconnected-description = { COPY(path, "onionServices.introFailed") }
onion-neterror-connection-failed-description = { COPY(path, "onionServices.rendezvousFailed") }
onion-neterror-missing-authentication-description = { COPY(path, "onionServices.clientAuthMissing") }
onion-neterror-incorrect-authetication-description = { COPY(path, "onionServices.clientAuthIncorrect") }
onion-neterror-invalid-address-description = { COPY(path, "onionServices.badAddress") }
onion-neterror-timed-out-description = { COPY(path, "onionServices.introTimedOut") }
""",
            path="torbutton.properties",
        ),
    )
