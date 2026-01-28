import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';

i18n
    .use(initReactI18next)
    .init({
        resources: {
            en: {
                translation: en
            }
        },
        lng: 'en', // Default language
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false // React already handles XSS
        }
    });

export default i18n;

/**
 * Changes the current language of the i18n instance.
 * Called when locale is received from the extension host.
 */
export function setLocale(locale: string) {
    // Map VS Code locale codes to i18n language codes
    // VS Code uses formats like 'en', 'pt-br', 'zh-cn', 'es'
    const languageCode = locale.split('-')[0].toLowerCase();

    // Only change if we have resources for this language, otherwise fallback works
    if (i18n.hasResourceBundle(languageCode, 'translation')) {
        i18n.changeLanguage(languageCode);
    } else {
        // For regional variants like 'pt-br', try the full code
        if (i18n.hasResourceBundle(locale.toLowerCase(), 'translation')) {
            i18n.changeLanguage(locale.toLowerCase());
        }
        // Otherwise let fallbackLng handle it
    }
}
