import fluent.syntax.ast as FTL
from fluent.migrate.helpers import transforms_from
from fluent.migrate.transforms import CONCAT, COPY, REPLACE


def migrate(ctx):
    legacy_path = "torbutton.properties"

    ctx.add_transforms(
        "tor-browser.ftl",
        "tor-browser.ftl",
        transforms_from(
            """
downloads-tor-warning-title = { COPY(path, "torbutton.download.warning.title") }
downloads-tor-warning-dismiss-button = { COPY(path, "torbutton.download.warning.dismiss") }
""",
            path=legacy_path,
        )
        + [
            # Replace "%S" with link to Tails website.
            FTL.Message(
                id=FTL.Identifier("downloads-tor-warning-description"),
                value=REPLACE(
                    legacy_path,
                    "torbutton.download.warning.description",
                    {
                        "%1$S": CONCAT(
                            FTL.TextElement('<a data-l10n-name="tails-link">'),
                            COPY(
                                legacy_path,
                                "torbutton.download.warning.tails_brand_name",
                            ),
                            FTL.TextElement("</a>"),
                        )
                    },
                ),
            ),
        ],
    )
