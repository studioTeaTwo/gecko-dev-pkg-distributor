from fluent.migrate.helpers import transforms_from


def migrate(ctx):
    ctx.add_transforms(
        "tor-browser.ftl",
        "tor-browser.ftl",
        transforms_from(
            """
menu-open-tor-manual =
    .label = { COPY(path, "aboutTor.torbrowser_user_manual.label") }
    .accesskey = { COPY(path, "aboutTor.torbrowser_user_manual.accesskey") }

tor-browser-home-heading-stable = { COPY(path, "aboutTor.ready.label") }
tor-browser-home-heading-testing = { COPY(path, "aboutTor.alpha.ready.label") }

tor-browser-home-duck-duck-go-input =
    .placeholder = { COPY(path, "aboutTor.search.label") }

tor-browser-home-message-introduction = { COPY(path, "aboutTor.ready2.label") }
""",
            path="aboutTor.dtd",
        ),
    )
