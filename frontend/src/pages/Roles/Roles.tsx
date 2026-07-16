import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import RolesList from "./RolesList";

export default function Roles() {
  return (
    <>
      <PageMeta
        title="Roles"
        description="Manage all roles in the system"
      />
      <PageBreadcrumb pageTitle="Roles" />
      <div className="space-y-6">
        <ComponentCard title="Daftar Roles">
          <RolesList />
        </ComponentCard>
      </div>
    </>
  );
}

