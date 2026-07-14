import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { ru } from './ru';

/**
 * Централизованная i18n-структура.
 * ru — основной язык; для казахской локализации добавьте ресурс kk
 * с теми же ключами и переключатель в настройках.
 */
i18n.use(initReactI18next).init({
  resources: {
    ru: { translation: ru },
  },
  lng: localStorage.getItem('ef_lang') ?? 'ru',
  fallbackLng: 'ru',
  interpolation: { escapeValue: false },
});

export default i18n;
