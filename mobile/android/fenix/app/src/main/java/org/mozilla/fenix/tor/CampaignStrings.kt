package org.mozilla.fenix.tor

import java.util.Locale

object CampaignStrings {

    val HeaderKey = "key_header"
    val BodyKey = "key_body"
    val CTAKey = "key_cta"
    val DismissKey = "key_dismiss"
    val CloseKey = "key_close"

    private val translations: HashMap<String, HashMap<String, String>> = hashMapOf(
        "en" to hashMapOf(
            HeaderKey to "We’d love your feedback",
            BodyKey to "Help us improve Tor Browser by completing this 10-minute survey.",
            CTAKey to "Launch the survey",
            DismissKey to "Dismiss",
            CloseKey to "Close",
        ),
        "es" to hashMapOf(
            HeaderKey to "Danos tu opinión",
            BodyKey to "Ayúdanos a mejorar el Navegador Tor completando esta encuesta de 10 minutos.",
            CTAKey to "Iniciar la encuesta",
            DismissKey to "Descartar",
            CloseKey to "Cerrar",
        ),
        "ru" to hashMapOf(
            HeaderKey to "Мы будем рады вашим отзывам",
            BodyKey to "Помогите нам улучшить браузер Tor, пройдя 10-минутный опрос.",
            CTAKey to "Начать опрос",
            DismissKey to "Отклонить",
            CloseKey to "Закрыть",
        ),
        "fr" to hashMapOf(
            HeaderKey to "Nous serions ravis d’avoir votre avis !",
            BodyKey to "Aidez-nous à améliorer le navigateur Tor en répondant à cette enquête de 10 minutes.",
            CTAKey to "Lancer l'enquête",
            DismissKey to "Ignorer",
            CloseKey to "Fermer",
        ),
        "pt" to hashMapOf(
            HeaderKey to "Adoraríamos ouvir sua opinião",
            BodyKey to "Ajude-nos a melhorar o Navegador Tor respondendo a esta pesquisa de 10 minutos.",
            CTAKey to "Iniciar a pesquisa",
            DismissKey to "Dispensar",
            CloseKey to "Fechar"
        ),
    )

    fun getLocale(): String {
        val locale = Locale.getDefault().getLanguage()
        if (translations.containsKey(locale)) {
            return locale
        }
        return "en"
    }


    fun get(key: String): String {
        val localeStrings = translations.get(getLocale())
        if (localeStrings == null) {
            return ""
        }
        return localeStrings.get(key) ?: ""
    }
}
