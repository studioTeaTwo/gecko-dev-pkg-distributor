from fluent.migrate.helpers import transforms_from


def migrate(ctx):
    # Convert
    #
    # my-button = MY TEXT
    #
    # to
    #
    # my-button2 =
    #   .label = MY TEXT
    ctx.add_transforms(
        "tor-browser.ftl",
        "tor-browser.ftl",
        transforms_from(
            """
bridge-dialog-button-connect2 =
    .label = { COPY_PATTERN(path, "bridge-dialog-button-connect") }
bridge-dialog-button-accept2 =
    .label = { COPY_PATTERN(path, "bridge-dialog-button-accept") }
bridge-dialog-button-submit2 =
    .label = { COPY_PATTERN(path, "bridge-dialog-button-submit") }
""",
            path="tor-browser.ftl",
        ),
    )
