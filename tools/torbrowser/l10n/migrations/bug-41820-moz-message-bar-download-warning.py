import re

import fluent.syntax.ast as FTL
from fluent.migrate.transforms import COPY_PATTERN, FluentSource
from fluent.syntax.visitor import Visitor


class RemoveAnchorVisitor(Visitor):
    """Class to remove <a> and </a> wrappers from a Fluent TextElement."""

    def __init__(self):
        # Good enough regex for our needs that will match starting and ending
        # tags.
        self._anchor_regex = re.compile(r"<\/?[aA](| [^>]*)>")
        super().__init__()

    def visit_TextElement(self, node):
        node.value = self._anchor_regex.sub("", node.value)


class RemoveAnchorTransform(FluentSource):
    """Class to remove <a> and </a> wrappers from a Fluent source."""

    def __call__(self, ctx):
        pattern = ctx.get_fluent_source_pattern(self.path, self.key).clone()
        # Visit every node in the pattern, replacing each TextElement's content.
        RemoveAnchorVisitor().visit(pattern)
        return pattern


def migrate(ctx):
    # Convert
    #
    # downloads-tor-warning-title = A
    # downloads-tor-warning-description = B<a data-l10n-name="tails-link">C</a>D
    #
    # to
    #
    # downloads-tor-warning-message-bar =
    #   .heading = A
    #   .message = BCD
    ctx.add_transforms(
        "tor-browser.ftl",
        "tor-browser.ftl",
        [
            FTL.Message(
                id=FTL.Identifier("downloads-tor-warning-message-bar"),
                value=None,
                attributes=[
                    FTL.Attribute(
                        id=FTL.Identifier("heading"),
                        value=COPY_PATTERN(
                            "tor-browser.ftl",
                            "downloads-tor-warning-title",
                        ),
                    ),
                    FTL.Attribute(
                        id=FTL.Identifier("message"),
                        value=RemoveAnchorTransform(
                            "tor-browser.ftl",
                            "downloads-tor-warning-description",
                        ),
                    ),
                ],
            ),
        ],
    )
