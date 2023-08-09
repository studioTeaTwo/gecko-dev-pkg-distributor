# Tor browser manual link shown in the menu bar.
# Uses Title case.
menu-open-tor-manual =
    .label = Tor Browser Manual
    .accesskey = M
# Tor browser manual link shown in the application menu (aka: hamburger menu).
# Uses Sentence case.
appmenu-open-tor-manual =
    .label = Tor Browser manual
    .accesskey = m

## Tor Browser home page.

tor-browser-home-heading-stable = Explore. Privately.
tor-browser-home-heading-testing = Test. Thoroughly.

# Only shown when underlying Tor process was not started by Tor Browser.
# "Tails" refers to the operating system, and should be translated as a brand name.
# <a data-l10n-name="tor-check-link"> should contain the link text and close with </a>.
tor-browser-home-tor-check-warning = Your connection to Tor is not being managed by Tor Browser. Some operating systems (like Tails) will manage this for you, or you could have set up a custom configuration. <a data-l10n-name="tor-check-link">Test your connection</a>

tor-browser-home-duck-duck-go-input =
    .placeholder = Search with DuckDuckGo
# Toggle to switch from DuckDuckGo's plain ".com" domain to its ".onion" domain.
tor-browser-home-onionize-toggle =
    .label = Onionize
    .title = Search using the onion site

# Update message.
# <a data-l10n-name="update-link"> should contain the link text and close with </a>.
# $version (String) - The new tor browser version.
tor-browser-home-message-updated = Tor Browser has been updated to { $version }. <a data-l10n-name="update-link">See what’s new</a>

tor-browser-home-message-introduction = You’re ready for the world’s most private browsing experience.

tor-browser-home-message-donate = Tor is free to use because of donations from people like you. <a data-l10n-name="donate-link">Donate now</a>

tor-browser-home-message-news = Get the latest news from Tor straight to your inbox. <a data-l10n-name="news-link">Sign up for Tor news</a>

tor-browser-home-message-testing = This is an unstable version of Tor Browser for testing new features. <a data-l10n-name="learn-more-link">Learn more</a>

##

# Shown in Home settings, corresponds to the default about:tor home page.
home-mode-choice-tor =
    .label = Tor Browser Home

## Tor connection settings.

# "Connection" refers to the Tor Browser's connection to the Tor network.
tor-connection-settings-heading = Connection
# The tooltip text for the "Connection" settings, shown in the preferences side bar.
# Likely should just be "{ tor-connection-settings-heading }", which will match the displayed text exactly.
tor-connection-settings-category =
    .tooltiptext = { tor-connection-settings-heading }
# -brand-short-name refers to 'Tor Browser', localized.
tor-connection-overview = { -brand-short-name } routes your traffic over the Tor Network, run by thousands of volunteers around the world.
tor-connection-browser-learn-more-link = Learn more
tor-connection-quickstart-heading = Quickstart
# -brand-short-name refers to 'Tor Browser', localized.
tor-connection-quickstart-description = Quickstart connects { -brand-short-name } to the Tor Network automatically when launched, based on your last used connection settings.
tor-connection-quickstart-checkbox =
    .label = Always connect automatically

# Prefix before the internet connection status.
# "Internet" is not a proper noun, but is capitalized because it is the start of a sentence.
tor-connection-internet-status-label = Internet:
# Button to test the internet connection.
# Here "Test" is a verb, as in "test the internet connection".
# Uses sentence case in English (US).
tor-connection-internet-status-test-button = Test
# Shown when testing the internet status.
# Uses sentence case in English (US).
tor-connection-internet-status-testing = Testing…
# Shown when the user is connected to the internet.
# Uses sentence case in English (US).
tor-connection-internet-status-online = Online
# Shown when the user is not connected to the internet.
# Uses sentence case in English (US).
tor-connection-internet-status-offline = Offline

# Prefix before the Tor network connection status.
# Uses sentence case in English (US).
tor-connection-network-status-label = Tor network:
# Shown when the user is connected to the Tor network.
# Uses sentence case in English (US).
tor-connection-network-status-connected = Connected
# Shown when the user is not connected to the Tor network.
# Uses sentence case in English (US).
tor-connection-network-status-not-connected = Not connected
# Shown when the user's Tor connection may be blocked.
# Uses sentence case in English (US).
tor-connection-network-status-blocked = Potentially blocked
# Button shown when we are not yet connected to the Tor network.
# It will open a page to start connecting to the Tor network.
# Uses sentence case in English (US).
tor-connection-network-status-connect-button = Connect

## Tor Bridges Settings.

tor-bridges-heading = Bridges
tor-bridges-overview = Bridges help you securely access the Tor Network in places where Tor is blocked. Depending on where you are, one bridge may work better than another.
tor-bridges-learn-more-link = Learn more

# Toggle button for enabling and disabling the use of bridges.
tor-bridges-use-bridges =
    .label = Use bridges

tor-bridges-none-added = No bridges added
tor-bridges-your-bridges = Your bridges
tor-bridges-source-user = Added by you
tor-bridges-source-built-in = Built-in
tor-bridges-source-requested = Requested from Tor
# Here "Bridge pass" is a noun: a bridge pass gives users access to some tor bridges.
# So "pass" is referring to something that gives permission or access. Similar to "token", "permit" or "voucher", but for permanent use rather than one-time.
# This is shown when the user is getting their bridges from Lox.
tor-bridges-source-lox = Bridge pass
# The "..." menu button for all current bridges.
tor-bridges-options-button =
    .title = All bridges
# Shown in the "..." menu for all bridges when the user can generate a QR code for all of their bridges.
tor-bridges-menu-item-qr-all-bridge-addresses = Show QR code
    .accesskey = Q
# Shown in the "..." menu for all bridges when the user can copy all of their bridges.
tor-bridges-menu-item-copy-all-bridge-addresses = Copy bridge addresses
    .accesskey = C
# Only shown in the "..." menu for bridges added by the user.
tor-bridges-menu-item-edit-all-bridges = Edit bridges
    .accesskey = E
# Shown in the "..." menu for all current bridges.
tor-bridges-menu-item-remove-all-bridges = Remove all bridges
    .accesskey = R

# Shown when one of the built-in bridges is in use.
tor-bridges-built-in-status-connected = Connected
# "obfs4" is a technical name, and likely should not be translated.
tor-bridges-built-in-obfs4-name = obfs4
tor-bridges-built-in-obfs4-description = Makes your Tor traffic look like random data. May not work in heavily censored regions.
# "Snowflake" is a proper noun for a type of Tor bridge, and likely should not be translated.
tor-bridges-built-in-snowflake-name = Snowflake
# "Snowflake" is a proper noun for a type of Tor bridge, and likely should not be translated.
tor-bridges-built-in-snowflake-description = Routes your connection through Snowflake proxies to make it look like you’re placing a video call, for example.
# "meek-azure" is a technical name, and likely should not be translated.
tor-bridges-built-in-meek-azure-name = meek-azure
tor-bridges-built-in-meek-azure-description = Makes it look like you’re connected to a Microsoft website, instead of using Tor. May work in heavily censored regions, but is usually very slow.

# Shown at the start of a Tor bridge line.
# $type (String) - The Tor bridge type ("snowflake", "obfs4", "meek-azure").
tor-bridges-type-prefix = { $type } bridge:
# Shown at the start of a Tor bridge line, when the transport type is unknown (or "vanilla").
tor-bridges-type-prefix-generic = Tor bridge:
# Used for an image of a bridge emoji. Each bridge address can be hashed into four emojis shown to the user (bridgemoji feature). This string corresponds to a *single* such emoji. The "title" should just be emojiName. The "alt" should let screen readers know that the image is of a *single* emoji, as well as its name.
# $emojiName (String) - The name of the emoji, already localized.
tor-bridges-emoji-image =
    .alt = Emoji: { $emojiName }
    .title = { $emojiName }
# The emoji name to show on hover when a bridge emoji's name is unknown.
tor-bridges-emoji-unknown = Unknown
# Shown when the bridge has been used for the most recent Tor circuit, i.e. the most recent bridge we have connected to.
tor-bridges-status-connected = Connected
# Used when the bridge has no status, i.e. the *absence* of a status to report to the user. This is only visibly shown when the status cell has keyboard focus.
tor-bridges-status-none = No status
# The "..." menu button for an individual bridge row.
tor-bridges-individual-bridge-options-button =
    .title = Bridge options
# Shown in the "..." menu for an individual bridge. Shows the QR code for this one bridge.
tor-bridges-menu-item-qr-address = Show QR code
    .accesskey = Q
# Shown in the "..." menu for an individual bridge. Copies the single bridge address to clipboard.
tor-bridges-menu-item-copy-address = Copy bridge address
    .accesskey = C
# Shown in the "..." menu for an individual bridge. Removes this one bridge.
tor-bridges-menu-item-remove-bridge = Remove bridge
    .accesskey = R

# Text shown just before a description of the most recent change to the list of user's bridges. Some white space will separate this text from the change description.
# This text is not visible, but is instead used for screen reader users.
# E.g. in English this could be "Recent update: One of your Tor bridges has been removed."
tor-bridges-update-area-intro = Recent update:
# Update text for screen reader users when only one of their bridges has been removed.
tor-bridges-update-removed-one-bridge = One of your Tor bridges has been removed.
# Update text for screen reader users when all of their bridges have been removed.
tor-bridges-update-removed-all-bridges = All of your Tor bridges have been removed.
# Update text for screen reader users when their bridges have changed in some arbitrary way.
tor-bridges-update-changed-bridges = Your Tor bridges have changed.

# Shown for requested bridges and bridges added by the user.
tor-bridges-share-heading = Help others connect
tor-bridges-share-description = Share your bridges with trusted contacts.
tor-bridges-copy-addresses-button = Copy addresses
tor-bridges-qr-addresses-button =
    .title = Show QR code

# Shown when using a "bridge pass", i.e. using Lox.
# Here "bridge pass" is a noun: a bridge pass gives users access to some tor bridges.
# So "pass" is referring to something that gives permission or access. Similar to "token", "permit" or "voucher", but for permanent use rather than one-time.
# Here "bridge bot" refers to a service that automatically gives out bridges for the user to use, i.e. the Lox authority.
tor-bridges-lox-description = With a bridge pass, the bridge bot will send you new bridges when your bridges get blocked. If your bridges don’t get blocked, you’ll unlock invites that let you share bridges with trusted contacts.
# The number of days until the user's "bridge pass" is upgraded.
# $numDays (Number) - The number of days until the next upgrade, an integer (1 or higher).
# The "[one]" and "[other]" are special Fluent syntax to mark plural categories that depend on the value of "$numDays". You can use any number of plural categories that work for your locale: "[zero]", "[one]", "[two]", "[few]", "[many]" and/or "[other]". The "*" marks a category as default, and is required.
# See https://projectfluent.org/fluent/guide/selectors.html .
# So in English, the first form will be used if $numDays is "1" (singular) and the second form will be used if $numDays is anything else (plural).
tor-bridges-lox-days-until-unlock =
  { $numDays ->
     [one] { $numDays } day until you unlock:
    *[other] { $numDays } days until you unlock:
  }
# This is shown as a list item after "N days until you unlock:" when the user will gain two more bridges in the future.
# Here "bridge bot" refers to a service that automatically gives out bridges for the user to use, i.e. the Lox authority.
tor-bridges-lox-unlock-two-bridges = +2 bridges from the bridge bot
# This is shown as a list item after "N days until you unlock:" when the user will gain access to invites for the first time.
# Here "invites" is a noun, short for "invitations".
tor-bridges-lox-unlock-first-invites = Invites for your trusted contacts
# This is shown as a list item after "N days until you unlock:" when the user already has invites.
# Here "invites" is a noun, short for "invitations".
tor-bridges-lox-unlock-more-invites = More invites for your trusted contacts
# Here "invite" is a noun, short for "invitation".
# $numInvites (Number) - The number of invites remaining, an integer (0 or higher).
# The "[one]" and "[other]" are special Fluent syntax to mark plural categories that depend on the value of "$numInvites". You can use any number of plural categories that work for your locale: "[zero]", "[one]", "[two]", "[few]", "[many]" and/or "[other]". The "*" marks a category as default, and is required.
# See https://projectfluent.org/fluent/guide/selectors.html .
# So in English, the first form will be used if $numInvites is "1" (singular) and the second form will be used if $numInvites is anything else (plural).
tor-bridges-lox-remaining-invites =
  { $numInvites ->
     [one] { $numInvites } invite remaining
    *[other] { $numInvites } invites remaining
  }
# Here "invites" is a noun, short for "invitations".
tor-bridges-lox-show-invites-button = Show invites

# Shown when the user's "bridge pass" has been upgraded.
# Here "bridge pass" is a noun: a bridge pass gives users access to some tor bridges.
# So "pass" is referring to something that gives permission or access. Similar to "token", "permit" or "voucher", but for permanent use rather than one-time.
tor-bridges-lox-upgrade = Your bridge pass has been upgraded!
# Shown when the user's bridges accessed through "bridge pass" have been blocked.
tor-bridges-lox-blocked = Your blocked bridges have been replaced
# Shown *after* the user has had their blocked bridges replaced.
# Here "bridge bot" refers to a service that automatically gives out bridges for the user to use, i.e. the Lox authority.
tor-bridges-lox-new-bridges = New bridges from the bridge bot
# Shown *after* the user has gained two more bridges.
# Here "bridge bot" refers to a service that automatically gives out bridges for the user to use, i.e. the Lox authority.
tor-bridges-lox-gained-two-bridges = +2 bridges from the bridge bot
# Shown *after* a user's "bridge pass" has changed.
# Here "invite" is a noun, short for "invitation".
# $numInvites (Number) - The number of invites remaining, an integer (0 or higher).
# The "[one]" and "[other]" are special Fluent syntax to mark plural categories that depend on the value of "$numInvites". You can use any number of plural categories that work for your locale: "[zero]", "[one]", "[two]", "[few]", "[many]" and/or "[other]". The "*" marks a category as default, and is required.
# See https://projectfluent.org/fluent/guide/selectors.html .
# So in English, the first form will be used if $numInvites is "1" (singular) and the second form will be used if $numInvites is anything else (plural).
tor-bridges-lox-new-invites =
  { $numInvites ->
     [one] You now have { $numInvites } remaining invite for your trusted contacts
    *[other] You now have { $numInvites } remaining invites for your trusted contacts
  }
# Button for the user to acknowledge a change in their "bridge pass".
tor-bridges-lox-got-it-button = Got it


# Shown as a heading when the user has no current bridges.
tor-bridges-add-bridges-heading = Add bridges
# Shown as a heading when the user has existing bridges that can be replaced.
tor-bridges-replace-bridges-heading = Replace your bridges

# -brand-short-name refers to 'Tor Browser', localized.
tor-bridges-select-built-in-description = Choose from one of { -brand-short-name }’s built-in bridges
tor-bridges-select-built-in-button = Select a built-in bridge…

tor-bridges-add-addresses-description = Enter bridge addresses you already know
# Shown when the user has no current bridges.
# Opens a dialog where the user can provide a new bridge address or share code.
tor-bridges-add-new-button = Add new bridges…
# Shown when the user has existing bridges.
# Opens a dialog where the user can provide a new bridge address or share code to replace their current bridges.
tor-bridges-replace-button = Replace bridges…

tor-bridges-find-more-heading = Find more bridges
# "Tor Project" is the organisation name.
tor-bridges-find-more-description = Since many bridge addresses aren’t public, you may need to request some from the Tor Project.

# "Telegram" is the common brand name of the Telegram Messenger application
tor-bridges-provider-telegram-name = Telegram
# Here "Message" is a verb, short for "Send a message to". This is an instruction to send a message to the given Telegram Messenger user to receive a new bridge.
# $telegramUserName (String) - The Telegram Messenger user name that should receive messages. Should be wrapped in '<a data-l10n-name="user">' and '</a>'.
# E.g. in English, "Message GetBridgesBot".
tor-bridges-provider-telegram-instruction = Message <a data-l10n-name="user">{ $telegramUserName }</a>

# "Web" is the proper noun for the "World Wide Web".
tor-bridges-provider-web-name = Web
# Instructions to visit the given website.
# $url (String) - The URL for Tor Project bridges. Should be wrapped in '<a data-l10n-name"url">' and '</a>'.
tor-bridges-provider-web-instruction = Visit <a data-l10n-name="url">{ $url }</a>

# "Gmail" is the Google brand name. "Riseup" refers to the Riseup organisation at riseup.net.
tor-bridges-provider-email-name = Gmail or Riseup
# Here "Email" is a verb, short for "Send an email to". This is an instruction to send an email to the given address to receive a new bridge.
# $address (String) - The email address that should receive the email.
# E.g. in English, "Email bridges@torproject.org".
tor-bridges-provider-email-instruction = Email { $address }

tor-bridges-request-from-browser = You can also get bridges from the bridge bot without leaving { -brand-short-name }.
tor-bridges-request-button = Request bridges…

## Warning dialog when removing all bridges.

remove-all-bridges-warning-title = Remove all bridges?
remove-all-bridges-warning-description = If these bridges were received from torproject.org or added manually, this action cannot be undone
remove-all-bridges-warning-remove-button = Remove

## Bridge QR code dialog.

bridge-qr-dialog-title =
    .title = Scan the QR code

## Common button used in bridge dialogs.

bridge-dialog-button-connect = Connect
bridge-dialog-button-accept = OK
bridge-dialog-button-submit = Submit

## User provided bridge dialog.

# Used when the user is editing their existing bridge addresses.
user-provide-bridge-dialog-edit-title =
    .title = Edit your bridges
# Used when the user has no existing bridges.
user-provide-bridge-dialog-add-title =
    .title = Add new bridges
# Used when the user is replacing their existing bridges with new ones.
user-provide-bridge-dialog-replace-title =
    .title = Replace your bridges
# Description shown when adding new bridges, replacing existing bridges, or editing existing bridges.
user-provide-bridge-dialog-description = Use bridges provided by a trusted organisation or someone you know.
# "Learn more" link shown in the "Add new bridges"/"Replace your bridges" dialog.
user-provide-bridge-dialog-learn-more = Learn more
# Short accessible name for the bridge addresses text area.
user-provide-bridge-dialog-textarea-addresses-label = Bridge addresses
# Here "invite" is a noun, short for "invitation".
# Short accessible name for text area when it can accept either bridge address or a single "bridge pass" invite.
user-provide-bridge-dialog-textarea-addresses-or-invite-label = Bridge addresses or invite
# Placeholder shown when adding new bridge addresses.
user-provide-bridge-dialog-textarea-addresses =
    .placeholder = Paste your bridge addresses here
# Placeholder shown when the user can add new bridge addresses or a single "bridge pass" invite.
# Here "bridge pass invite" is a noun: a bridge pass invite can be shared with other users to give them their own bridge pass, so they can get access to tor bridges.
# So "pass" is referring to something that gives permission or access. Similar to "token", "permit" or "voucher", but for permanent use rather than one-time.
# And "invite" is simply short for "invitation".
# NOTE: "invite" is singular, whilst "addresses" is plural.
user-provide-bridge-dialog-textarea-addresses-or-invite =
    .placeholder = Paste your bridge addresses or a bridge pass invite here
# Error shown when one of the address lines is invalid.
# $line (Number) - The line number for the invalid address.
user-provide-bridge-dialog-address-error = Incorrectly formatted bridge address on line { $line }.
# Error shown when the user has entered more than one "bridge pass" invite.
# Here "invite" is a noun, short for "invitation".
user-provide-bridge-dialog-multiple-invites-error = Cannot include more than one invite.
# Error shown when the user has mixed their invite with addresses.
# Here "invite" is a noun, short for "invitation".
user-provide-bridge-dialog-mixed-error = Cannot mix bridge addresses with an invite.
# Error shown when the user has entered an invite when it is not supported.
# Here "bridge pass invite" is a noun: a bridge pass invite can be shared with other users to give them their own bridge pass, so they can get access to tor bridges.
# So "pass" is referring to something that gives permission or access. Similar to "token", "permit" or "voucher", but for permanent use rather than one-time.
# And "invite" is simply short for "invitation".
user-provide-bridge-dialog-invite-not-allowed-error = Cannot include a bridge pass invite.
# Error shown when the invite was not accepted by the server.
user-provide-bridge-dialog-bad-invite-error = Invite was not accepted. Try a different one.
# Error shown when the "bridge pass" server does not respond.
# Here "bridge pass" is a noun: a bridge pass gives users access to some tor bridges.
# So "pass" is referring to something that gives permission or access. Similar to "token", "permit" or "voucher", but for permanent use rather than one-time.
user-provide-bridge-dialog-no-server-error = Unable to connect to bridge pass server.
# Generic error when an invite failed.
# Here "invite" is a noun, short for "invitation".
user-provide-bridge-dialog-generic-invite-error = Failed to redeem invite.

# Here "bridge pass" is a noun: a bridge pass gives users access to some tor bridges.
# So "pass" is referring to something that gives permission or access. Similar to "token", "permit" or "voucher", but for permanent use rather than one-time.
user-provide-bridge-dialog-connecting = Connecting to bridge pass server…

# Shown after the user has entered a "bridge pass" invite.
user-provide-bridge-dialog-result-invite = The following bridges were shared with you.
# Shown after the user has entered bridge addresses.
user-provide-bridge-dialog-result-addresses = The following bridges were entered by you.
user-provide-bridge-dialog-next-button =
    .label = Next

## Built-in bridges dialog.

built-in-dialog-title =
    .title = Select a Built-In Bridge
# -brand-short-name refers to 'Tor Browser', localized.
built-in-dialog-introduction = { -brand-short-name } includes some specific types of bridges known as “pluggable transports”, which can help conceal the fact you’re using Tor.
# "obfs4" is a technical name, and likely should not be translated.
built-in-dialog-obfs4-radio-option =
    .label = obfs4
# "Snowflake" is a proper noun for a type of Tor bridge, and likely should not be translated.
built-in-dialog-snowflake-radio-option =
    .label = Snowflake
# "meek-azure" is a technical name, and likely should not be translated.
built-in-dialog-meek-azure-radio-option =
    .label = meek-azure
# Label attached to the built-in bridge option that is already in use.
# The "aria-label" should use the same text, but include some ending punctuation to separate it from the sentence that follows. This is used for screen reader users.
built-in-dialog-current-bridge-label = Current bridge
    .aria-label = Current bridge.

request-bridge-dialog-title =
    .title = Request Bridge
request-bridge-dialog-top-wait = Contacting BridgeDB. Please Wait.
request-bridge-dialog-top-solve = Solve the CAPTCHA to request a bridge.
request-bridge-dialog-captcha-input =
    .placeholder = Enter the characters from the image
request-bridge-dialog-captcha-failed = The solution is not correct. Please try again.

## Tor advanced settings.

tor-advanced-settings-heading = Advanced
tor-advanced-settings-description = Configure how { -brand-short-name } connects to the internet.
# Button that opens the advanced connection settings dialog.
# Uses sentence case in English (US).
tor-advanced-settings-button = Settings…
# "log" is a noun, referring to the recorded text output of the Tor process.
tor-view-log-description = View the Tor log.
# "log" is a noun, referring to the recorded text output of the Tor process.
# Uses sentence case in English (US).
tor-view-log-button = View log…

## Tor log dialog.

# "log" is a noun, referring to the recorded text output of the Tor process.
tor-log-dialog-title =
    .title = Tor log
# "log" is a noun, referring to the recorded text output of the Tor process.
tor-log-dialog-copy-button =
    .label = Copy Tor log to clipboard
# Button text changes for a short time after activating the button.
tor-log-dialog-copy-button-copied =
    .label = Copied!

## Tor advanced connection settings dialog.

tor-advanced-dialog-title =
    .title = Connection settings
tor-advanced-dialog-introduction = Configure how { -brand-short-name } connects to the internet.
tor-advanced-dialog-proxy-checkbox =
    .label = I use a proxy to connect to the internet
tor-advanced-dialog-proxy-type-selector-label = Proxy type
# SOCKS4 is a technical name, and should likely not be translated.
tor-advanced-dialog-proxy-socks4-menuitem =
    .label = SOCKS4
# SOCKS5 is a technical name, and should likely not be translated.
tor-advanced-dialog-proxy-socks5-menuitem =
    .label = SOCKS5
# HTTP and HTTPS are technical names, and should likely not be translated.
# The "/" refers to "HTTP or HTTPS" and can be translated.
tor-advanced-dialog-proxy-http-menuitem =
    .label = HTTP/HTTPS
# "address" is a noun, referring to an network IP address.
tor-advanced-dialog-proxy-address-input-label = Address
tor-advanced-dialog-proxy-address-input =
    .placeholder = IP address or hostname
tor-advanced-dialog-proxy-port-input-label = Port
tor-advanced-dialog-proxy-username-input-label = Username
tor-advanced-dialog-proxy-username-input =
    .placeholder = Optional
tor-advanced-dialog-proxy-password-input-label = Password
tor-advanced-dialog-proxy-password-input =
    .placeholder = Optional
tor-advanced-dialog-firewall-checkbox =
    .label = This computer goes through a firewall that only allows connections to certain ports
tor-advanced-dialog-firewall-ports-input-label = Allowed ports
tor-advanced-dialog-firewall-ports-input =
    .placeholder = Comma-separated values

## About Tor Browser dialog.

# '<label data-l10n-name="project-link">' and '</label>' should wrap the link text for the Tor Project, and will link to the Tor Project web page.
# -brand-short-name refers to 'Tor Browser', localized.
# -vendor-short-name refers to 'Tor Project', localized.
about-dialog-tor-project =  { -brand-short-name } is developed by <label data-l10n-name="project-link">the { -vendor-short-name }</label>, a nonprofit working to defend your privacy and freedom online.

# '<label data-l10n-name="donate-link">' and '</label>' should wrap the link text for donating to Tor Project, and will link to the Tor Project donation page.
# '<label data-l10n-name="community-link">' and '</label>' should wrap the link text for getting involved with Tor Project, and will link to the Tor Project community page.
about-dialog-help-out = Want to help? <label data-l10n-name="donate-link">Donate</label> or <label data-l10n-name="community-link">get involved</label>!

# Link text for the Tor Project support page.
about-dialog-questions-link = Questions?
# Link text for the Tor Project page for Tor Network relay operators.
about-dialog-grow-tor-network-link = Help the Tor Network Grow!
# Link text for the Tor Browser license page (about:license).
about-dialog-browser-license-link = Licensing Information

## New tor circuit.

# Shown in the File menu.
# Uses title case for English (US).
menu-new-tor-circuit =
    .label = New Tor Circuit for this Site
    .accesskey = C

# Shown in the application menu (hamburger menu).
# Uses sentence case for English (US).
appmenuitem-new-tor-circuit =
    .label = New Tor circuit for this site

# Toolbar button to trigger a new circuit, available through toolbar customization.
# Uses sentence case for English (US).
# ".label" is the accessible name, and is visible in the overflow menu and when
# customizing the toolbar.
# ".tooltiptext" will be identical to the label.
toolbar-new-tor-circuit =
    .label = New Tor circuit for this site
    .tooltiptext = { toolbar-new-tor-circuit.label }

## Tor circuit URL bar button.

# The tooltip also acts as the accessible name.
tor-circuit-urlbar-button =
    .tooltiptext = Tor Circuit

## Tor circuit panel.

# $host (String) - The host name shown in the URL bar, potentially shortened.
tor-circuit-panel-heading = Circuit for { $host }
# Shown when the current address is a ".tor.onion" alias.
# $alias (String) - The alias onion address. This should be wrapped in '<a data-l10n-name="alias-link">' and '</a>', which will link to the corresponding address.
tor-circuit-panel-alias = Connected to <a data-l10n-name="alias-link">{ $alias }</a>

# Text just before the list of circuit nodes.
tor-circuit-panel-node-list-introduction = Tor Circuit
# First node in the list of circuit nodes. Refers to Tor Browser.
tor-circuit-panel-node-browser = This browser
# Represents a number of unknown relays that complete a connection to an ".onion" site.
tor-circuit-panel-node-onion-relays = Onion site relays
# Represents the bridge node used to connect to the Tor network.
# $bridge-type (String) - The name for the type of bridge used: meek, obfs4, snowflake, etc.
tor-circuit-panel-node-typed-bridge = Bridge: { $bridge-type }
# Represents the bridge node used to connect to the Tor network when the bridge type is unknown.
tor-circuit-panel-node-bridge = Bridge
# Represents the initial guard node used for a tor circuit.
# $region (String) - The region name for the guard node, already localized.
tor-circuit-panel-node-region-guard = { $region } (guard)
# Represents a circuit node with an unknown regional location.
tor-circuit-panel-node-unknown-region = Unknown region

# Uses sentence case for English (US).
tor-circuit-panel-new-button = New Tor circuit for this site
# Shown when the first node in the circuit is a guard node, rather than a bridge.
tor-circuit-panel-new-button-description-guard = Your guard node may not change
# Shown when the first node in the circuit is a bridge node.
tor-circuit-panel-new-button-description-bridge = Your bridge may not change

## This dialog is shown when copying a suspected cryptocurrency address from a plain HTTP website.

crypto-safety-prompt-title = Cryptocurrency address copied from an insecure website
# $address (String) - The cryptocurrency address, possibly truncated.
# $host (String) - The website host the address was copied from.
crypto-safety-prompt-body = The copied text ({ $address }) appears to be a cryptocurrency address. Since the connection to { $host } is not secure, the address may have been modified and should not be trusted. You can try establishing a secure connection by reconnecting with a new circuit.
crypto-safety-prompt-reload-button = Reload Tab with a New Circuit
crypto-safety-prompt-dismiss-button = Dismiss Warning

## Downloads warning.
## Shown in downloads panel, about:downloads and Library window.

# "Tails" is the brand name for the Tails operating system and should be localized appropriately.
downloads-tor-warning-message-bar =
    .heading = Be careful opening downloads
    .message = Some files may connect to the internet when opened without using Tor. To be safe, open the files while offline or use a portable operating system like Tails.
# This will be a link to the Tails operating system website.
# "Tails" is the brand name for the Tails operating system and should be localized appropriately.
downloads-tor-warning-tails-link= Learn more about Tails
# Button to dismiss the warning forever.
downloads-tor-warning-dismiss-button = Got it

## Initial warning page in about:rulesets. In Tor Browser, each ruleset is a set of rules for converting a ".tor.onion" address to a normal ".onion" address (used by SecureDrop). The feature is taken from the discontinued "HTTPS Everywhere".

rulesets-warning-heading = Proceed with Caution
rulesets-warning-description = Adding or modifying rulesets can cause attackers to hijack your browser. Proceed only if you know what you are doing.
rulesets-warning-checkbox = Warn me when I attempt to access these preferences
rulesets-warning-continue-button = Accept the Risk and Continue

## Side panel in about:rulesets. In Tor Browser, each ruleset is a set of rules for converting a ".tor.onion" address to a normal ".onion" address (used by SecureDrop). The feature is taken from the discontinued "HTTPS Everywhere".

rulesets-side-panel-heading = Rulesets
rulesets-side-panel-no-rules = No rulesets found
# -brand-short-name refers to 'Tor Browser', localized.
rulesets-side-panel-no-rules-description = When you save a ruleset in { -brand-short-name }, it will show up here.

## Ruleset update date in about:rulesets.

# $date (Date) - The update date. The DATETIME function will format the $date according to the locale, using a "long" style. E.g. "January 1, 2000" for English (US), "١ يناير ٢٠٠٠" for Arabic, "2000년 1월 1일" in Korean, and "1 января 2000 г." in Russian.
rulesets-update-last = Last updated { DATETIME($date, dateStyle: "long") }
rulesets-update-never = Never updated, or last update failed
# Shown when the ruleset is disabled.
rulesets-update-rule-disabled = Disabled

## Ruleset details in about:rulesets. In Tor Browser, each ruleset is a set of rules for converting a ".tor.onion" address to a normal ".onion" address (used by SecureDrop). The feature is taken from the discontinued "HTTPS Everywhere".

rulesets-details-edit-button = Edit
rulesets-details-enable-checkbox = Enable this ruleset
rulesets-details-update-button = Check for Updates
rulesets-details-save-button = Save
rulesets-details-cancel-button = Cancel
# "JWK" refers to "JSON Web Key" and likely should not be translated.
rulesets-details-jwk = JWK
# "JWK" refers to "JSON Web Key" and likely should not be translated.
rulesets-details-jwk-input =
    .placeholder = The key used to sign this ruleset in the JWK (JSON Web Key) format
# "JWK" refers to "JSON Web Key" and likely should not be translated.
rulesets-details-jwk-input-invalid = The JWK could not be parsed, or it is not a valid key
# "Path" refers to the URL domain this rule applies to.
rulesets-details-path = Path Prefix
rulesets-details-path-input =
    .placeholder = URL prefix that contains the files needed by the ruleset
# "HTTP(S)" refers to "HTTP or HTTPS".
rulesets-details-path-input-invalid = The path prefix is not a valid HTTP(S) URL
# "Scope" refers to the breadth of URLs this rule applies to (as a regular expression).
rulesets-details-scope = Scope
# "Regular expression" refers to the computing term for a special pattern used for matching: https://en.wikipedia.org/wiki/Regular_expression.
rulesets-details-scope-input =
    .placeholder = Regular expression for the scope of the rules
# "Regular expression" refers to the computing term for a special pattern used for matching: https://en.wikipedia.org/wiki/Regular_expression.
rulesets-details-scope-input-invalid = The scope could not be parsed as a regular expression

## Onion site error page.
## "Onion site" is an abbreviation of "onion website": a website whose domain URL ends in ".onion", which is reachable through the Tor network.

onion-neterror-page-title = Problem loading onion site
onion-neterror-authorization-title = Authentication required
onion-neterror-not-found-header = Onion site not found
onion-neterror-not-found-description = The most likely cause is that the onion site is offline. Contact the onion site administrator.
onion-neterror-unreachable-header = Onion site cannot be reached
onion-neterror-unreachable-description = The onion site is unreachable due an internal error.
onion-neterror-disconnected-header = Onion site has disconnected
onion-neterror-disconnected-description = The most likely cause is that the onion site is offline. Contact the onion site administrator.
onion-neterror-connection-failed-header = Unable to connect to onion site
onion-neterror-connection-failed-description = The onion site is busy or the Tor network is overloaded. Try again later.
onion-neterror-missing-authentication-header = Onion site requires authentication
onion-neterror-missing-authentication-description = Access to the onion site requires a key but none was provided.
onion-neterror-incorrect-authentication-header = Onion site authentication failed
onion-neterror-incorrect-authetication-description = The provided key is incorrect or has been revoked. Contact the onion site administrator.
onion-neterror-invalid-address-header = Invalid onion site address
onion-neterror-invalid-address-description = The provided onion site address is invalid. Please check that you entered it correctly.
# "Circuit" refers to a Tor network circuit.
onion-neterror-timed-out-header = Onion site circuit creation timed out
onion-neterror-timed-out-description = Failed to connect to the onion site, possibly due to a poor network connection.

## Onion site authentication prompt.
## "Onion site" is an abbreviation of "onion website": a website whose domain URL ends in ".onion", which is reachable through the Tor network.

# Here "open" is a verb.
onion-site-authentication-urlbar-button =
    .tooltiptext = Open the onion site authentication panel

# $onionsite (String) - The shortened onion address for the current web site, for example "a3jx8k…pbsh7y.onion".
onion-site-authentication-prompt-description = The onion site { $onionsite } is requesting that you authenticate.
onion-site-authentication-prompt-learn-more = Learn more
onion-site-authentication-prompt-key-input =
    .placeholder = Enter your private key for this onion site
onion-site-authentication-prompt-remember-checkbox =
    .label = Remember this key
onion-site-authentication-prompt-ok-button =
    .label = OK
    .accesskey = O
onion-site-authentication-prompt-cancel-button =
    .label = Cancel
    .accesskey = C
# Error message shown when the entered key is the wrong length or the wrong format.
# "base32" and "base64" are technical names for binary-to-text encodings: https://en.wikipedia.org/wiki/Base64
onion-site-authentication-prompt-invalid-key = Please enter a valid key (52 base32 characters or 44 base64 characters)
onion-site-authentication-prompt-setting-key-failed = Unable to configure Tor with your key

## Page Info window for onion sites.
## "Onion site" is an abbreviation of "onion website": a website whose domain URL ends in ".onion", which is reachable through the Tor network.

# $encryption-type (String) - The name of the encryption algorithm used for the page, for example "TLS_AES_128_GCM_SHA256".
# $encryption-stength (Number) - The number of bits for the encryption key, for example "128" or "256". The "NUMBER" function will format this number to the same locale, and the "useGrouping" option will remove grouping symbols, like thousand separators. Note that the "bit" in "bit keys" refers to a computer "binary digit".
# $encryption-version (String) - The name and version of the encryption, for example "TLS 1.3".
page-info-onion-site-encryption-with-bits = Connection encrypted (Onion site, { $encryption-type }, { NUMBER($encryption-strength, useGrouping: "false") } bit keys, { $encryption-version })
page-info-onion-site-encryption-plain = Connection encrypted (Onion site)

## Onion site authentication preferences.
## "Onion site" is an abbreviation of "onion website": a website whose domain URL ends in ".onion", which is reachable through the Tor network.

onion-site-authentication-preferences-heading = Onion site authentication
onion-site-authentication-preferences-overview = Some onion sites require that you identify yourself with a key (a kind of password) before you can access them.
onion-site-authentication-preferences-learn-more = Learn more
onion-site-authentication-preferences-saved-keys-button = Saved keys…

## Onion site saved keys dialog.
## "Onion site" is an abbreviation of "onion website": a website whose domain URL ends in ".onion", which is reachable through the Tor network.

onion-site-saved-keys-dialog-title =
    .title = Onion site keys

onion-site-saved-keys-dialog-intro = The following onion site keys are stored on your computer.
onion-site-saved-keys-dialog-table-header-site =
    .label = Onion site
# "Key" is a noun, for an access key.
onion-site-saved-keys-dialog-table-header-key =
    .label = Key
onion-site-saved-keys-dialog-remove-button = Remove
onion-site-saved-keys-dialog-remove-all-button = Remove all
onion-site-saved-keys-dialog-fetch-keys-error-message = Unable to retrieve keys from Tor
onion-site-saved-keys-dialog-remove-keys-error-message = Unable to remove key
