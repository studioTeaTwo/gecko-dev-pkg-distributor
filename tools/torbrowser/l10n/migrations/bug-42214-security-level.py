from fluent.migrate.helpers import transforms_from


def migrate(ctx):
    ctx.add_transforms(
        "base-browser.ftl",
        "base-browser.ftl",
        transforms_from(
            """
security-level-panel-level-standard = { COPY(path, "security_level_standard") }
security-level-panel-level-safer = { COPY(path, "security_level_safer") }
security-level-panel-level-safest = { COPY(path, "security_level_safest") }
security-level-panel-learn-more-link = { COPY(path, "security_level_learn_more") }
security-level-panel-open-settings-button = { COPY(path, "security_level_open_settings") }

security-level-preferences-heading = { COPY(path, "security_level") }
security-level-preferences-overview = { COPY(path, "security_level_overview") }
security-level-preferences-learn-more-link = { COPY(path, "security_level_learn_more") }
security-level-preferences-level-standard =
    .label = { COPY(path, "security_level_standard") }
security-level-preferences-level-safer =
    .label = { COPY(path, "security_level_safer") }
security-level-preferences-level-safest =
    .label = { COPY(path, "security_level_safest") }

security-level-summary-standard = { COPY(path, "security_level_standard_summary") }
security-level-summary-safer = { COPY(path, "security_level_safer_summary") }
security-level-summary-safest = { COPY(path, "security_level_safest_summary") }


security-level-preferences-bullet-https-only-javascript = { COPY(path, "security_level_js_https_only") }
security-level-preferences-bullet-limit-font-and-symbols = { COPY(path, "security_level_limit_typography") }
security-level-preferences-bullet-limit-media = { COPY(path, "security_level_limit_media") }
security-level-preferences-bullet-disabled-javascript = { COPY(path, "security_level_js_disabled") }
security-level-preferences-bullet-limit-font-and-symbols-and-images = { COPY(path, "security_level_limit_typography_svg") }

security-level-panel-custom-badge = { COPY(path, "security_level_custom") }
security-level-preferences-custom-heading = { COPY(path, "security_level_custom_heading") }
security-level-summary-custom = { COPY(path, "security_level_custom_summary") }
""",
            path="securityLevel.properties",
        ),
    )
