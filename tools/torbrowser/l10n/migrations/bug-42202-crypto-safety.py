import fluent.syntax.ast as FTL
from fluent.migrate.helpers import VARIABLE_REFERENCE, transforms_from
from fluent.migrate.transforms import REPLACE


def migrate(ctx):
    legacy_path = "cryptoSafetyPrompt.properties"

    ctx.add_transforms(
        "tor-browser.ftl",
        "tor-browser.ftl",
        transforms_from(
            """
crypto-safety-prompt-title = { COPY(path, "cryptoSafetyPrompt.cryptoTitle") }
crypto-safety-prompt-reload-button = { COPY(path, "cryptoSafetyPrompt.primaryAction") }
crypto-safety-prompt-dismiss-button = { COPY(path, "cryptoSafetyPrompt.secondaryAction") }
""",
            path=legacy_path,
        )
        + [
            # Replace "%1$S" and "%2$S" with "{ $address }" and "{ $host }"
            FTL.Message(
                id=FTL.Identifier("crypto-safety-prompt-body"),
                value=REPLACE(
                    legacy_path,
                    "cryptoSafetyPrompt.cryptoBody",
                    {
                        "%1$S": VARIABLE_REFERENCE("address"),
                        "%2$S": VARIABLE_REFERENCE("host"),
                    },
                ),
            ),
        ],
    )
