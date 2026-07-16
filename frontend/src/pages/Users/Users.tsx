import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import UsersList from "./UsersList";

export default function Users() {
  return (
    <>
      <PageMeta
        title="Users"
        description="Manage all users in the system"
      />
      <PageBreadcrumb pageTitle="Users" />
      <div className="space-y-6">
        <ComponentCard title="Daftar Users">
          <UsersList />
        </ComponentCard>
      </div>
    </>
  );
}

