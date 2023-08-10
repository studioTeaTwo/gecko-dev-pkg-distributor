import fluent.syntax.ast as FTL
from fluent.migrate.helpers import transforms_from
from fluent.migrate.transforms import REPLACE


def migrate(ctx):
    legacy_path = "rulesets.properties"

    ctx.add_transforms(
        "tor-browser.ftl",
        "tor-browser.ftl",
        transforms_from(
            """
rulesets-warning-heading = { COPY(path, "rulesets.warningTitle") }
rulesets-warning-description = { COPY(path, "rulesets.warningDescription") }
rulesets-warning-checkbox = { COPY(path, "rulesets.warningEnable") }
rulesets-warning-continue-button = { COPY(path, "rulesets.warningButton") }

rulesets-side-panel-heading = { COPY(path, "rulesets.rulesets") }
rulesets-side-panel-no-rules = { COPY(path, "rulesets.noRulesets") }

rulesets-update-never = { COPY(path, "rulesets.neverUpdated") }
rulesets-update-rule-disabled = { COPY(path, "rulesets.disabled") }

rulesets-details-edit-button = { COPY(path, "rulesets.edit") }
rulesets-details-enable-checkbox = { COPY(path, "rulesets.enable") }
rulesets-details-update-button = { COPY(path, "rulesets.checkUpdates") }
rulesets-details-save-button = { COPY(path, "rulesets.save") }
rulesets-details-cancel-button = { COPY(path, "rulesets.cancel") }
rulesets-details-jwk-input =
    .placeholder = { COPY(path, "rulesets.jwkPlaceholder") }
rulesets-details-jwk-input-invalid = { COPY(path, "rulesets.jwkInvalid") }
rulesets-details-path = { COPY(path, "rulesets.pathPrefix") }
rulesets-details-path-input =
    .placeholder = { COPY(path, "rulesets.pathPrefixPlaceholder") }
rulesets-details-path-input-invalid = { COPY(path, "rulesets.pathPrefixInvalid") }
rulesets-details-scope = { COPY(path, "rulesets.scope") }
rulesets-details-scope-input =
    .placeholder = { COPY(path, "rulesets.scopePlaceholder") }
rulesets-details-scope-input-invalid = { COPY(path, "rulesets.scopeInvalid") }
""",
            path=legacy_path,
        )
        + [
            # Replace "%1$S" with "{ DATETIME($date, dateStyle: "long") }"
            FTL.Message(
                FTL.Identifier("rulesets-update-last"),
                value=REPLACE(
                    legacy_path,
                    "rulesets.lastUpdated",
                    {
                        "%1$S": FTL.FunctionReference(
                            FTL.Identifier("DATETIME"),
                            arguments=FTL.CallArguments(
                                positional=[
                                    FTL.VariableReference(FTL.Identifier("date"))
                                ],
                                named=[
                                    FTL.NamedArgument(
                                        FTL.Identifier("dateStyle"),
                                        value=FTL.StringLiteral("long"),
                                    )
                                ],
                            ),
                        )
                    },
                ),
            ),
        ],
    )
