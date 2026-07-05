import { ConfigProvider, type ThemeConfig } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import type { PropsWithChildren } from 'react';

interface AntLocaleProviderProps {
  theme: ThemeConfig;
}

export function AntLocaleProvider({ theme, children }: PropsWithChildren<AntLocaleProviderProps>) {
  return (
    <ConfigProvider theme={theme} locale={ruRU}>
      {children}
    </ConfigProvider>
  );
}
