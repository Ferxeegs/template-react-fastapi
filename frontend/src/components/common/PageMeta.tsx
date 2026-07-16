import { HelmetProvider, Helmet } from "react-helmet-async";
import { useEffect } from "react";
import { useLocation } from "react-router";
import { useSettings } from "../../context/SettingsContext";

const PageMeta = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => {
  const { settings } = useSettings();
  const location = useLocation();
  const siteName = settings?.general?.site_name || "Aplikasi";
  const fullTitle = `${title} | ${siteName}`;

  // Ensure title updates when route or settings change
  useEffect(() => {
    document.title = fullTitle;
  }, [fullTitle, title, siteName, location.pathname]);

  return (
    <Helmet key={`${title}-${siteName}-${location.pathname}`}>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
    </Helmet>
  );
};

export const AppWrapper = ({ children }: { children: React.ReactNode }) => (
  <HelmetProvider>{children}</HelmetProvider>
);

export default PageMeta;
