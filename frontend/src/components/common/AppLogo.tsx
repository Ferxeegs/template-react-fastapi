import { useState, useEffect } from "react";
import { useSettings } from "../../context/SettingsContext";
import { useTheme } from "../../context/ThemeContext";

interface AppLogoProps {
  dark?: boolean;
  className?: string;
  isSquare?: boolean;
}

export default function AppLogo({ dark, className = "", isSquare = false }: AppLogoProps) {
  const { getLogoUrl, getBrandLogoSquareUrl, settings, isLoading: isSettingsLoading } = useSettings();
  const { theme } = useTheme();
  const [imageStatus, setImageStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const useDarkLogo = dark ?? theme === "dark";
  const src = isSquare ? getBrandLogoSquareUrl(useDarkLogo) : getLogoUrl(useDarkLogo);

  useEffect(() => {
    if (isSettingsLoading) {
      setImageStatus("idle");
      return;
    }
    if (!src) {
      setImageStatus("idle");
      return;
    }
    let isActive = true;
    const image = new Image();

    setImageStatus("loading");

    image.onload = () => {
      if (!isActive) return;
      setImageStatus("loaded");
    };

    image.onerror = () => {
      if (!isActive) return;
      setImageStatus("error");
    };

    image.src = src;

    if (image.complete) {
      if (image.naturalWidth > 0) {
        setImageStatus("loaded");
      } else {
        setImageStatus("error");
      }
    }

    return () => {
      isActive = false;
      image.onload = null;
      image.onerror = null;
    };
  }, [src, isSettingsLoading]);

  const showSkeleton = isSettingsLoading || imageStatus === "loading";

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {showSkeleton && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/[0.02] dark:bg-white/[0.02] overflow-hidden">
          <div className="w-2/3 h-2/3 max-h-8 max-w-[100px] animate-pulse rounded bg-black/[0.06] dark:bg-white/[0.06]" />
        </div>
      )}

      {src && imageStatus === "loaded" && (
        <img
          key={src}
          src={src}
          alt={settings?.general?.site_name || "Site Logo"}
          className="h-full w-full object-contain transition-opacity duration-300 opacity-100"
        />
      )}
    </div>
  );
}
