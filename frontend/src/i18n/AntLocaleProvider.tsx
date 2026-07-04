import { ConfigProvider, type ThemeConfig } from 'antd';
import enUS from 'antd/locale/en_US';
import kkKZ from 'antd/locale/kk_KZ';
import ruRU from 'antd/locale/ru_RU';
import type { PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';
import type { SupportedLanguage } from './index';

const ANTD_LOCALES: Record<SupportedLanguage, typeof ruRU> = {
  ru: ruRU,
  kk: kkKZ,
  en: enUS,
};

interface AntLocaleProviderProps {
  theme: ThemeConfig;
}

export function AntLocaleProvider({ theme, children }: PropsWithChildren<AntLocaleProviderProps>) {
  const { i18n } = useTranslation();
  const locale = ANTD_LOCALES[(i18n.language as SupportedLanguage) ?? 'ru'] ?? ruRU;

  return (
    <ConfigProvider theme={theme} locale={locale}>
      {children}
    </ConfigProvider>
  );
}
