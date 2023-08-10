import fluent.syntax.ast as FTL
from fluent.migrate.helpers import TERM_REFERENCE, transforms_from
from fluent.migrate.transforms import CONCAT, COPY, REPLACE


def migrate(ctx):
    legacy_path = "aboutDialog.dtd"
    ctx.add_transforms(
        "tor-browser.ftl",
        "tor-browser.ftl",
        transforms_from(
            """
about-dialog-questions-link = { COPY(path, "bottomLinks.questions") }
about-dialog-grow-tor-network-link = { COPY(path, "bottomLinks.grow") }
about-dialog-browser-license-link = { COPY(path, "bottomLinks.license") }
""",
            path=legacy_path,
        )
        + [
            # Concatenate as
            #  &project.start;
            #  <label data-l10n-name="project-link">&project.tpoLink;</a>
            #  &project.end;
            #
            # And replace any occurrence of "&brandShortName;" and
            # "&vendorShortName;" with "-brand-short-name" and
            # "-vendor-short-name", wherever they may appear.
            FTL.Message(
                id=FTL.Identifier("about-dialog-tor-project"),
                value=CONCAT(
                    REPLACE(
                        legacy_path,
                        "project.start",
                        {
                            "&brandShortName;": TERM_REFERENCE("brand-short-name"),
                            "&vendorShortName;": TERM_REFERENCE("vendor-short-name"),
                        },
                    ),
                    FTL.TextElement('<label data-l10n-name="project-link">'),
                    REPLACE(
                        legacy_path,
                        "project.tpoLink",
                        {
                            "&brandShortName;": TERM_REFERENCE("brand-short-name"),
                            "&vendorShortName;": TERM_REFERENCE("vendor-short-name"),
                        },
                    ),
                    FTL.TextElement("</label>"),
                    REPLACE(
                        legacy_path,
                        "project.end",
                        {
                            "&brandShortName;": TERM_REFERENCE("brand-short-name"),
                            "&vendorShortName;": TERM_REFERENCE("vendor-short-name"),
                        },
                    ),
                ),
            ),
            # Concatenate with two link labels.
            FTL.Message(
                id=FTL.Identifier("about-dialog-help-out"),
                value=CONCAT(
                    COPY(legacy_path, "help.start"),
                    FTL.TextElement('<label data-l10n-name="donate-link">'),
                    COPY(legacy_path, "help.donateLink"),
                    FTL.TextElement("</label>"),
                    COPY(legacy_path, "help.or"),
                    FTL.TextElement('<label data-l10n-name="community-link">'),
                    COPY(legacy_path, "help.getInvolvedLink"),
                    FTL.TextElement("</label>"),
                    COPY(legacy_path, "help.end"),
                ),
            ),
        ],
    )
