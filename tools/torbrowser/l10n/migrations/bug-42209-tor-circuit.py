import fluent.syntax.ast as FTL
from fluent.migrate.helpers import VARIABLE_REFERENCE, transforms_from
from fluent.migrate.transforms import CONCAT, REPLACE


def migrate(ctx):
    legacy_dtd = "torbutton.dtd"
    legacy_properties = "torbutton.properties"
    ctx.add_transforms(
        "tor-browser.ftl",
        "tor-browser.ftl",
        transforms_from(
            """
menu-new-tor-circuit =
    .label = { COPY(dtd_path, "torbutton.context_menu.new_circuit") }
    .accesskey = { COPY(dtd_path, "torbutton.context_menu.new_circuit_key") }
appmenuitem-new-tor-circuit =
    .label = { COPY(dtd_path, "torbutton.context_menu.new_circuit_sentence_case") }
toolbar-new-tor-circuit =
    .label = { COPY(dtd_path, "torbutton.context_menu.new_circuit_sentence_case") }
    .tooltiptext = { toolbar-new-tor-circuit.label }

tor-circuit-urlbar-button =
    .tooltiptext = { COPY(dtd_path, "torbutton.circuit_display.title") }

tor-circuit-panel-node-list-introduction = { COPY(dtd_path, "torbutton.circuit_display.title") }
tor-circuit-panel-node-browser = { COPY(path, "torbutton.circuit_display.this_browser") }
tor-circuit-panel-node-onion-relays = { COPY(path, "torbutton.circuit_display.onion-site-relays") }
tor-circuit-panel-node-bridge = { COPY(path, "torbutton.circuit_display.tor_bridge") }
tor-circuit-panel-node-unknown-region = { COPY(path, "torbutton.circuit_display.unknown_region") }

tor-circuit-panel-new-button = { COPY(dtd_path, "torbutton.context_menu.new_circuit_sentence_case") }
tor-circuit-panel-new-button-description-guard = { COPY(path, "torbutton.circuit_display.new-circuit-guard-description") }
tor-circuit-panel-new-button-description-bridge = { COPY(path, "torbutton.circuit_display.new-circuit-bridge-description") }
""",
            dtd_path=legacy_dtd,
            path=legacy_properties,
        )
        + [
            # Replace "%S" with "{ $host }"
            FTL.Message(
                id=FTL.Identifier("tor-circuit-panel-heading"),
                value=REPLACE(
                    legacy_properties,
                    "torbutton.circuit_display.heading",
                    {"%1$S": VARIABLE_REFERENCE("host")},
                ),
            ),
            # Replace "%S" with "<a data-l10n-name="alias-link">{ $alias }</a>"
            FTL.Message(
                id=FTL.Identifier("tor-circuit-panel-alias"),
                value=REPLACE(
                    legacy_properties,
                    "torbutton.circuit_display.connected-to-alias",
                    {
                        "%1$S": CONCAT(
                            FTL.TextElement('<a data-l10n-name="alias-link">'),
                            VARIABLE_REFERENCE("alias"),
                            FTL.TextElement("</a>"),
                        )
                    },
                ),
            ),
            # Replace "%S" with "{ $region }"
            FTL.Message(
                id=FTL.Identifier("tor-circuit-panel-node-region-guard"),
                value=REPLACE(
                    legacy_properties,
                    "torbutton.circuit_display.region-guard-node",
                    {"%1$S": VARIABLE_REFERENCE("region")},
                ),
            ),
            # Replace "%S" with "{ $bridge-type }"
            FTL.Message(
                id=FTL.Identifier("tor-circuit-panel-node-typed-bridge"),
                value=REPLACE(
                    legacy_properties,
                    "torbutton.circuit_display.tor_typed_bridge",
                    {"%1$S": VARIABLE_REFERENCE("bridge-type")},
                ),
            ),
        ],
    )
