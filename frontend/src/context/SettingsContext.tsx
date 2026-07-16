import { createContext, useContext, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { settingAPI, getBaseUrl } from '../utils/api';

interface SettingsData {
  general: {
    site_name?: string;
    site_tagline?: string;
    site_description?: string;
    company_name?: string;
    company_email?: string;
    company_phone?: string;
    company_address?: string;
    copyright_text?: string;
  };
  appearance: {
    site_logo?: string;
    site_logo_dark?: string;
    brand_logo_square?: string;
    brand_logo_square_dark?: string;
    site_favicon?: string;
  };
}

interface SettingsContextType {
  settings: SettingsData | null;
  isLoading: boolean;
  getLogoUrl: (dark?: boolean) => string;
  getBrandLogoSquareUrl: (dark?: boolean) => string;
  getFaviconUrl: () => string;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider = ({ children }: SettingsProviderProps) => {
  const normalizeSettings = (
    generalRaw?: Record<string, unknown>,
    appearanceRaw?: Record<string, unknown>,
  ): SettingsData => {
    const generalData: Record<string, string> = {};
    Object.entries(generalRaw || {}).forEach(([key, value]) => {
      generalData[key] = value !== null && value !== undefined ? String(value) : '';
    });

    const appearanceData: Record<string, string | null> = {};
    Object.entries(appearanceRaw || {}).forEach(([key, value]) => {
      appearanceData[key] = value !== null && value !== undefined ? String(value) : null;
    });

    return {
      general: generalData,
      appearance: appearanceData,
    };
  };

  const settingsQuery = useQuery({
    queryKey: ['settings', 'general-appearance'],
    queryFn: async (): Promise<SettingsData> => {
      const [generalResponse, appearanceResponse] = await Promise.all([
        settingAPI.getByGroup('general'),
        settingAPI.getByGroup('appearance'),
      ]);

      return normalizeSettings(
        generalResponse.success ? (generalResponse.data as Record<string, unknown>) : undefined,
        appearanceResponse.success ? (appearanceResponse.data as Record<string, unknown>) : undefined,
      );
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });

  const settings = settingsQuery.data ?? null;
  const isCacheEmpty = Boolean(settings && !settings.general?.site_name);
  const isLoading =
    Boolean(!settings || isCacheEmpty) &&
    Boolean(settingsQuery.isPending || settingsQuery.isLoading || settingsQuery.isFetching);

  const getLogoUrl = (dark = false): string => {
    if (!settings) return "";

    const logoUrl = dark
      ? settings.appearance.site_logo_dark
      : settings.appearance.site_logo;

    if (!logoUrl || logoUrl.trim() === '') return dark ? '/images/logo/logo-dark.svg' : '/images/logo/logo.svg';

    // If URL is already absolute, return as is
    if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
      return logoUrl;
    }

    // Otherwise, prepend base URL
    return `${getBaseUrl()}${logoUrl}`;
  };

  const getBrandLogoSquareUrl = (dark = false): string => {
    const logoUrl = dark
      ? settings?.appearance.brand_logo_square_dark
      : settings?.appearance.brand_logo_square;
    if (!logoUrl || logoUrl.trim() === '') return dark ? '/images/logo/logo-icon-dark.svg' : '/images/logo/logo-icon.svg';
    if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
      return logoUrl;
    }

    return `${getBaseUrl()}${logoUrl}`;
  };

  const getFaviconUrl = (): string => {
    if (!settings) return "";
    if (!settings.appearance.site_favicon || settings.appearance.site_favicon.trim() === '') return "/favicon.png";

    const faviconUrl = settings.appearance.site_favicon;
    if (faviconUrl.startsWith('http://') || faviconUrl.startsWith('https://')) {
      return faviconUrl;
    }

    return `${getBaseUrl()}${faviconUrl}`;
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        isLoading,
        getLogoUrl,
        getBrandLogoSquareUrl,
        getFaviconUrl,
        refreshSettings: async () => {
          await settingsQuery.refetch();
        },
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

