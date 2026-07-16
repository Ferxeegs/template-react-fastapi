import { useEffect } from 'react';
import { useSettings } from '../../context/SettingsContext';

/**
 * Component untuk mengupdate favicon secara dinamis berdasarkan settings
 */
export default function FaviconUpdater() {
  const { getFaviconUrl, isLoading } = useSettings();

  useEffect(() => {
    const placeholderFavicon =
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#E5E7EB"/></svg>`,
      );
    const faviconUrl = getFaviconUrl();
    
    const updateFavicon = (url: string) => {
      let existingFavicon = document.querySelector('link[rel="icon"]');
      if (!existingFavicon) {
        existingFavicon = document.createElement('link');
        (existingFavicon as HTMLLinkElement).rel = 'icon';
        document.head.appendChild(existingFavicon);
      }
      (existingFavicon as HTMLLinkElement).type = 'image/png';
      (existingFavicon as HTMLLinkElement).href = url;
    };

    if (isLoading) {
      updateFavicon(placeholderFavicon);
      return;
    }

    if (!faviconUrl) {
      updateFavicon(placeholderFavicon);
      return;
    }

    // Tampilkan placeholder sementara favicon custom masih dimuat
    updateFavicon(placeholderFavicon);
    const img = new Image();
    img.onload = () => updateFavicon(faviconUrl);
    img.onerror = () => updateFavicon(placeholderFavicon);
    img.src = faviconUrl;

  }, [getFaviconUrl, isLoading]);

  return null;
}

