import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import SettingsForm from "./SettingsForm";

export default function Settings() {
  return (
    <>
      <PageMeta
        title="Settings"
        description="Manage application settings"
      />
      <PageBreadcrumb pageTitle="Settings" />
      <div className="space-y-6">
        <SettingsForm />
      </div>
    </>
  );
}

