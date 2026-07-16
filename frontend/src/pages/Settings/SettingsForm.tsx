import { useState, useEffect, FormEvent } from "react";
import { settingAPI, mediaAPI, getBaseUrl } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import ComponentCard from "../../components/common/ComponentCard";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import { TrashBinIcon } from "../../icons";

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
  order: {
    monthly_quota?: string;
    price_per_item?: string;
  };
}

export default function SettingsForm() {
  const { hasPermission } = useAuth();
  const canUpdateSettings = hasPermission("update_setting");
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<SettingsData>({
    general: {},
    appearance: {},
    order: {},
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoDarkFile, setLogoDarkFile] = useState<File | null>(null);
  const [logoDarkPreview, setLogoDarkPreview] = useState<string | null>(null);
  const [brandLogoSquareFile, setBrandLogoSquareFile] = useState<File | null>(null);
  const [brandLogoSquarePreview, setBrandLogoSquarePreview] = useState<string | null>(null);
  const [brandLogoSquareDarkFile, setBrandLogoSquareDarkFile] = useState<File | null>(null);
  const [brandLogoSquareDarkPreview, setBrandLogoSquareDarkPreview] = useState<string | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch general settings
      const generalResponse = await settingAPI.getByGroup("general");
      const appearanceResponse = await settingAPI.getByGroup("appearance");
      const orderResponse = await settingAPI.getByGroup("order");

      if (generalResponse.success && generalResponse.data) {
        // Convert payload values to strings if needed
        const generalData: Record<string, string> = {};
        Object.entries(generalResponse.data || {}).forEach(([key, value]) => {
          // Payload dari backend sudah di-parse oleh Prisma, jadi langsung bisa digunakan
          // Tapi pastikan value adalah string untuk input fields
          generalData[key] = value !== null && value !== undefined ? String(value) : "";
        });
        setSettings((prev) => ({
          ...prev,
          general: generalData,
        }));
      }

      if (appearanceResponse.success && appearanceResponse.data) {
        // Convert payload values to strings if needed
        const appearanceData: Record<string, string | null> = {};
        Object.entries(appearanceResponse.data || {}).forEach(([key, value]) => {
          appearanceData[key] = value !== null && value !== undefined ? String(value) : null;
        });
        setSettings((prev) => ({
          ...prev,
          appearance: appearanceData,
        }));

        // Set preview untuk logo dan logo dark jika ada
        if (appearanceData.site_logo) {
          const logoUrl = String(appearanceData.site_logo);
          setLogoPreview(logoUrl.startsWith('http') ? logoUrl : `${getBaseUrl()}${logoUrl}`);
        }
        if (appearanceData.site_logo_dark) {
          const logoDarkUrl = String(appearanceData.site_logo_dark);
          setLogoDarkPreview(logoDarkUrl.startsWith('http') ? logoDarkUrl : `${getBaseUrl()}${logoDarkUrl}`);
        }
        if (appearanceData.brand_logo_square) {
          const brandLogoSquareUrl = String(appearanceData.brand_logo_square);
          setBrandLogoSquarePreview(brandLogoSquareUrl.startsWith('http') ? brandLogoSquareUrl : `${getBaseUrl()}${brandLogoSquareUrl}`);
        }
        if (appearanceData.brand_logo_square_dark) {
          const brandLogoSquareDarkUrl = String(appearanceData.brand_logo_square_dark);
          setBrandLogoSquareDarkPreview(brandLogoSquareDarkUrl.startsWith('http') ? brandLogoSquareDarkUrl : `${getBaseUrl()}${brandLogoSquareDarkUrl}`);
        }
        if (appearanceData.site_favicon) {
          const faviconUrl = String(appearanceData.site_favicon);
          setFaviconPreview(faviconUrl.startsWith('http') ? faviconUrl : `${getBaseUrl()}${faviconUrl}`);
        }
      }

      if (orderResponse.success && orderResponse.data) {
        // Convert payload values to strings if needed
        const orderData: Record<string, string> = {};
        Object.entries(orderResponse.data || {}).forEach(([key, value]) => {
          orderData[key] = value !== null && value !== undefined ? String(value) : "";
        });
        setSettings((prev) => ({
          ...prev,
          order: orderData,
        }));
      }
    } catch (err: any) {
      const message = "Gagal mengambil settings. Silakan coba lagi.";
      setError(message);
      console.error("Fetch settings error:", err);
      showErrorToast(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    group: "general" | "appearance" | "order",
    name: string,
    value: string
  ) => {
    setSettings((prev) => ({
      ...prev,
      [group]: {
        ...prev[group],
        [name]: value,
      },
    }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoDarkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoDarkFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoDarkPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteLogo = async () => {
    if (!settings.appearance.site_logo) return;

    try {
      // Hapus file dari filesystem
      await mediaAPI.deleteFileByUrl(settings.appearance.site_logo);
      
      // Update setting menjadi empty string
      await settingAPI.update("appearance", "site_logo", { payload: "" });
      
      // Clear preview dan state
      setLogoPreview(null);
      setLogoFile(null);
      setSettings((prev) => ({
        ...prev,
        appearance: {
          ...prev.appearance,
          site_logo: "",
        },
      }));
      
      showSuccessToast("Site logo berhasil dihapus!");
    } catch (err: any) {
      const message = "Gagal menghapus logo. Silakan coba lagi.";
      setError(message);
      console.error("Delete logo error:", err);
      showErrorToast(message);
    }
  };

  const handleDeleteLogoDark = async () => {
    if (!settings.appearance.site_logo_dark) return;

    try {
      // Hapus file dari filesystem
      await mediaAPI.deleteFileByUrl(settings.appearance.site_logo_dark);
      
      // Update setting menjadi empty string
      await settingAPI.update("appearance", "site_logo_dark", { payload: "" });
      
      // Clear preview dan state
      setLogoDarkPreview(null);
      setLogoDarkFile(null);
      setSettings((prev) => ({
        ...prev,
        appearance: {
          ...prev.appearance,
          site_logo_dark: "",
        },
      }));
      
      showSuccessToast("Site logo dark berhasil dihapus!");
    } catch (err: any) {
      const message = "Gagal menghapus logo dark. Silakan coba lagi.";
      setError(message);
      console.error("Delete logo dark error:", err);
      showErrorToast(message);
    }
  };

  const handleBrandLogoSquareChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBrandLogoSquareFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBrandLogoSquarePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFaviconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFaviconFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFaviconPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteBrandLogoSquare = async () => {
    if (!settings.appearance.brand_logo_square) return;

    try {
      await mediaAPI.deleteFileByUrl(settings.appearance.brand_logo_square);
      await settingAPI.update("appearance", "brand_logo_square", { payload: "" });
      setBrandLogoSquarePreview(null);
      setBrandLogoSquareFile(null);
      setSettings((prev) => ({
        ...prev,
        appearance: {
          ...prev.appearance,
          brand_logo_square: "",
        },
      }));
      showSuccessToast("Brand logo square berhasil dihapus!");
    } catch (err: any) {
      const message = "Gagal menghapus brand logo square. Silakan coba lagi.";
      setError(message);
      console.error("Delete brand logo square error:", err);
      showErrorToast(message);
    }
  };

  const handleBrandLogoSquareDarkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBrandLogoSquareDarkFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBrandLogoSquareDarkPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteBrandLogoSquareDark = async () => {
    if (!settings.appearance.brand_logo_square_dark) return;

    try {
      await mediaAPI.deleteFileByUrl(settings.appearance.brand_logo_square_dark);
      await settingAPI.update("appearance", "brand_logo_square_dark", { payload: "" });
      setBrandLogoSquareDarkPreview(null);
      setBrandLogoSquareDarkFile(null);
      setSettings((prev) => ({
        ...prev,
        appearance: {
          ...prev.appearance,
          brand_logo_square_dark: "",
        },
      }));
      showSuccessToast("Brand logo square dark berhasil dihapus!");
    } catch (err: any) {
      const message = "Gagal menghapus brand logo square dark. Silakan coba lagi.";
      setError(message);
      console.error("Delete brand logo square dark error:", err);
      showErrorToast(message);
    }
  };

  const handleDeleteFavicon = async () => {
    if (!settings.appearance.site_favicon) return;

    try {
      await mediaAPI.deleteFileByUrl(settings.appearance.site_favicon);
      await settingAPI.update("appearance", "site_favicon", { payload: "" });
      setFaviconPreview(null);
      setFaviconFile(null);
      setSettings((prev) => ({
        ...prev,
        appearance: {
          ...prev.appearance,
          site_favicon: "",
        },
      }));
      showSuccessToast("Site favicon berhasil dihapus!");
    } catch (err: any) {
      const message = "Gagal menghapus favicon. Silakan coba lagi.";
      setError(message);
      console.error("Delete favicon error:", err);
      showErrorToast(message);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const settingsToUpdate: Array<{
        group: string;
        name: string;
        payload: any;
      }> = [];

      // Upload site logo jika ada file baru
      if (logoFile) {
        const logoResponse = await mediaAPI.uploadMedia(
          logoFile,
          "Setting",
          "appearance",
          "site_logo"
        );

        if (logoResponse.success && logoResponse.data) {
          // Simpan URL dari response (format: /uploads/settings/site_logo-xxx.png)
          settingsToUpdate.push({
            group: "appearance",
            name: "site_logo",
            payload: (logoResponse.data as any).url, // URL sudah dalam format /uploads/settings/...
          });
        }
      } else if (settings.appearance.site_logo) {
        // Keep existing logo (URL sudah dalam format yang benar)
        settingsToUpdate.push({
          group: "appearance",
          name: "site_logo",
          payload: settings.appearance.site_logo,
        });
      }

      // Upload site logo dark jika ada file baru
      if (logoDarkFile) {
        const logoDarkResponse = await mediaAPI.uploadMedia(
          logoDarkFile,
          "Setting",
          "appearance",
          "site_logo_dark"
        );

        if (logoDarkResponse.success && logoDarkResponse.data) {
          // Simpan URL dari response (format: /uploads/settings/site_logo_dark-xxx.png)
          settingsToUpdate.push({
            group: "appearance",
            name: "site_logo_dark",
            payload: (logoDarkResponse.data as any).url, // URL sudah dalam format /uploads/settings/...
          });
        }
      } else if (settings.appearance.site_logo_dark) {
        // Keep existing logo dark (URL sudah dalam format yang benar)
        settingsToUpdate.push({
          group: "appearance",
          name: "site_logo_dark",
          payload: settings.appearance.site_logo_dark,
        });
      }

      // Upload brand logo square jika ada file baru
      if (brandLogoSquareFile) {
        const brandLogoSquareResponse = await mediaAPI.uploadMedia(
          brandLogoSquareFile,
          "Setting",
          "appearance",
          "brand_logo_square"
        );
        if (brandLogoSquareResponse.success && brandLogoSquareResponse.data) {
          settingsToUpdate.push({
            group: "appearance",
            name: "brand_logo_square",
            payload: (brandLogoSquareResponse.data as any).url,
          });
        }
      } else if (settings.appearance.brand_logo_square) {
        settingsToUpdate.push({
          group: "appearance",
          name: "brand_logo_square",
          payload: settings.appearance.brand_logo_square,
        });
      }

      // Upload brand logo square dark jika ada file baru
      if (brandLogoSquareDarkFile) {
        const brandLogoSquareDarkResponse = await mediaAPI.uploadMedia(
          brandLogoSquareDarkFile,
          "Setting",
          "appearance",
          "brand_logo_square_dark"
        );
        if (brandLogoSquareDarkResponse.success && brandLogoSquareDarkResponse.data) {
          settingsToUpdate.push({
            group: "appearance",
            name: "brand_logo_square_dark",
            payload: (brandLogoSquareDarkResponse.data as any).url,
          });
        }
      } else if (settings.appearance.brand_logo_square_dark) {
        settingsToUpdate.push({
          group: "appearance",
          name: "brand_logo_square_dark",
          payload: settings.appearance.brand_logo_square_dark,
        });
      }

      // Upload site favicon jika ada file baru
      if (faviconFile) {
        const faviconResponse = await mediaAPI.uploadMedia(
          faviconFile,
          "Setting",
          "appearance",
          "site_favicon"
        );
        if (faviconResponse.success && faviconResponse.data) {
          settingsToUpdate.push({
            group: "appearance",
            name: "site_favicon",
            payload: (faviconResponse.data as any).url,
          });
        }
      } else if (settings.appearance.site_favicon) {
        settingsToUpdate.push({
          group: "appearance",
          name: "site_favicon",
          payload: settings.appearance.site_favicon,
        });
      }

      // Update general settings - selalu update semua field yang ada di form
      const generalFields = [
        'site_name',
        'site_tagline',
        'site_description',
        'company_name',
        'company_email',
        'company_phone',
        'company_address',
        'copyright_text',
      ];

      generalFields.forEach((name) => {
        const value = settings.general[name as keyof typeof settings.general];
        // Update dengan value yang ada, atau empty string jika tidak ada
        settingsToUpdate.push({
          group: "general",
          name,
          payload: value !== undefined && value !== null ? value : "",
        });
      });

      // Update appearance settings (except site_logo, site_logo_dark, brand_logo_square, and site_favicon which are handled above)
      Object.entries(settings.appearance).forEach(([name, value]) => {
        if (
          name !== "site_logo" &&
          name !== "site_logo_dark" &&
          name !== "brand_logo_square" &&
          name !== "brand_logo_square_dark" &&
          name !== "site_favicon" &&
          value !== undefined &&
          value !== null
        ) {
          settingsToUpdate.push({
            group: "appearance",
            name,
            payload: value,
          });
        }
      });

      // Update order settings
      const orderFields = ['monthly_quota', 'price_per_item'];
      orderFields.forEach((name) => {
        const value = settings.order[name as keyof typeof settings.order];
        // Update dengan value yang ada, atau empty string jika tidak ada
        settingsToUpdate.push({
          group: "order",
          name,
          payload: value !== undefined && value !== null ? value : "",
        });
      });

      // Update all settings
      const response = await settingAPI.updateMultiple(settingsToUpdate);

      if (response.success) {
        showSuccessToast("Settings berhasil disimpan!");
        // Clear file inputs
        setLogoFile(null);
        setLogoDarkFile(null);
        setBrandLogoSquareFile(null);
        setBrandLogoSquareDarkFile(null);
        setFaviconFile(null);
        // Refresh settings
        await fetchSettings();
      } else {
        const message = response.message || "Gagal menyimpan settings";
        setError(message);
        showErrorToast(message);
      }
    } catch (err: any) {
      const message = "Terjadi kesalahan. Silakan coba lagi.";
      setError(message);
      console.error("Save settings error:", err);
      showErrorToast(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <ComponentCard title="Settings">
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500 dark:text-gray-400">Loading...</div>
        </div>
      </ComponentCard>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* General Settings */}
      <ComponentCard title="General Settings" className="mb-6">
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <Label>
                Site Name <span className="text-error-500">*</span>
              </Label>
              <Input
                type="text"
                value={settings.general.site_name || ""}
                onChange={(e) =>
                  handleInputChange("general", "site_name", e.target.value)
                }
                placeholder="Site Name"
                disabled={!canUpdateSettings}
              />
            </div>

            <div>
              <Label>Site Tagline</Label>
              <Input
                type="text"
                value={settings.general.site_tagline || ""}
                onChange={(e) =>
                  handleInputChange("general", "site_tagline", e.target.value)
                }
                placeholder="Site Tagline"
                disabled={!canUpdateSettings}
              />
            </div>

            <div className="md:col-span-2">
              <Label>Site Description</Label>
              <Input
                type="text"
                value={settings.general.site_description || ""}
                onChange={(e) =>
                  handleInputChange("general", "site_description", e.target.value)
                }
                placeholder="Site Description"
                disabled={!canUpdateSettings}
              />
            </div>

            <div>
              <Label>Company Name</Label>
              <Input
                type="text"
                value={settings.general.company_name || ""}
                onChange={(e) =>
                  handleInputChange("general", "company_name", e.target.value)
                }
                placeholder="Company Name"
                disabled={!canUpdateSettings}
              />
            </div>

            <div>
              <Label>Company Email</Label>
              <Input
                type="email"
                value={settings.general.company_email || ""}
                onChange={(e) =>
                  handleInputChange("general", "company_email", e.target.value)
                }
                placeholder="Company Email"
                disabled={!canUpdateSettings}
              />
            </div>

            <div>
              <Label>Company Phone</Label>
              <Input
                type="tel"
                value={settings.general.company_phone || ""}
                onChange={(e) =>
                  handleInputChange("general", "company_phone", e.target.value)
                }
                placeholder="Company Phone"
                disabled={!canUpdateSettings}
              />
            </div>

            <div>
              <Label>Company Address</Label>
              <Input
                type="text"
                value={settings.general.company_address || ""}
                onChange={(e) =>
                  handleInputChange("general", "company_address", e.target.value)
                }
                placeholder="Company Address"
                disabled={!canUpdateSettings}
              />
            </div>

            <div className="md:col-span-2">
              <Label>Copyright Text</Label>
              <Input
                type="text"
                value={settings.general.copyright_text || ""}
                onChange={(e) =>
                  handleInputChange("general", "copyright_text", e.target.value)
                }
                placeholder="Copyright Text"
                disabled={!canUpdateSettings}
              />
            </div>
          </div>
        </div>
      </ComponentCard>

      {/* Appearance Settings */}
      <ComponentCard title="Appearance Settings" className="mb-6">
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
            <div>
              <Label>Site Logo</Label>
              <div className="space-y-2">
                {logoPreview && (
                  <div className="mb-2 flex items-start gap-2">
                    <img
                      src={logoPreview}
                      alt="Site Logo Preview"
                      className="h-16 sm:h-20 object-contain"
                    />
                    <button
                      type="button"
                      onClick={handleDeleteLogo}
                      disabled={!canUpdateSettings}
                      className="p-2 sm:p-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                      title="Hapus logo"
                    >
                      <TrashBinIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  disabled={!canUpdateSettings}
                  className="h-11 w-full rounded-lg border border-gray-300 px-3 sm:px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20 dark:bg-gray-900 dark:text-white/90 dark:border-gray-700 dark:focus:border-brand-800 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Format: JPG, PNG, SVG. Maksimal 2MB
                </p>
              </div>
            </div>

            <div>
              <Label>Site Logo Dark</Label>
              <div className="space-y-2">
                {logoDarkPreview && (
                  <div className="mb-2 flex items-start gap-2">
                    <img
                      src={logoDarkPreview}
                      alt="Site Logo Dark Preview"
                      className="h-20 object-contain"
                    />
                    <button
                      type="button"
                      onClick={handleDeleteLogoDark}
                      disabled={!canUpdateSettings}
                      className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Hapus logo dark"
                    >
                      <TrashBinIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoDarkChange}
                  disabled={!canUpdateSettings}
                  className="h-11 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20 dark:bg-gray-900 dark:text-white/90 dark:border-gray-700 dark:focus:border-brand-800 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Format: JPG, PNG, SVG. Maksimal 2MB
                </p>
              </div>
            </div>

            <div>
              <Label>Brand Logo Square</Label>
              <div className="space-y-2">
                {brandLogoSquarePreview && (
                  <div className="mb-2 flex items-start gap-2">
                    <img
                      src={brandLogoSquarePreview}
                      alt="Brand Logo Square Preview"
                      className="h-20 w-20 object-contain"
                    />
                    <button
                      type="button"
                      onClick={handleDeleteBrandLogoSquare}
                      disabled={!canUpdateSettings}
                      className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Hapus brand logo square"
                    >
                      <TrashBinIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBrandLogoSquareChange}
                  disabled={!canUpdateSettings}
                  className="h-11 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20 dark:bg-gray-900 dark:text-white/90 dark:border-gray-700 dark:focus:border-brand-800 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Format: JPG, PNG, SVG. Maksimal 2MB
                </p>
              </div>
            </div>

            <div>
              <Label>Brand Logo Square Dark</Label>
              <div className="space-y-2">
                {brandLogoSquareDarkPreview && (
                  <div className="mb-2 flex items-start gap-2">
                    <img
                      src={brandLogoSquareDarkPreview}
                      alt="Brand Logo Square Dark Preview"
                      className="h-20 w-20 object-contain"
                    />
                    <button
                      type="button"
                      onClick={handleDeleteBrandLogoSquareDark}
                      disabled={!canUpdateSettings}
                      className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Hapus brand logo square dark"
                    >
                      <TrashBinIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBrandLogoSquareDarkChange}
                  disabled={!canUpdateSettings}
                  className="h-11 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20 dark:bg-gray-900 dark:text-white/90 dark:border-gray-700 dark:focus:border-brand-800 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Format: JPG, PNG, SVG. Maksimal 2MB
                </p>
              </div>
            </div>

            <div>
              <Label>Site Favicon</Label>
              <div className="space-y-2">
                {faviconPreview && (
                  <div className="mb-2 flex items-start gap-2">
                    <img
                      src={faviconPreview}
                      alt="Site Favicon Preview"
                      className="h-16 w-16 object-contain"
                    />
                    <button
                      type="button"
                      onClick={handleDeleteFavicon}
                      disabled={!canUpdateSettings}
                      className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Hapus favicon"
                    >
                      <TrashBinIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFaviconChange}
                  disabled={!canUpdateSettings}
                  className="h-11 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 focus:border-brand-300 focus:ring-brand-500/20 dark:bg-gray-900 dark:text-white/90 dark:border-gray-700 dark:focus:border-brand-800 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Format: ICO, PNG. Maksimal 2MB. Ukuran disarankan 32x32 atau 16x16
                </p>
              </div>
            </div>
          </div>
        </div>
      </ComponentCard>

      {/* Submit Button */}
      {canUpdateSettings && (
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg transition px-5 py-3.5 text-sm bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300 disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation"
          >
            {isSaving ? "Menyimpan..." : "Simpan Settings"}
          </button>
        </div>
      )}
    </form>
  );
}

