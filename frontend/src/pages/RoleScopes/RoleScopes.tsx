import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import RoleScopesList from "./RoleScopesList";

export default function RoleScopes() {
  return (
    <>
      <PageMeta
        title="Scope Akses Role"
        description="Kelola batasan cakupan unit kerja / departemen untuk masing-masing role user"
      />
      <PageBreadcrumb pageTitle="Scope Akses Role" />
      <div className="space-y-6">
        <ComponentCard title="Daftar Hak Akses Role (Scope)">
          <RoleScopesList />
        </ComponentCard>
      </div>
    </>
  );
}
