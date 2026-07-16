import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import UnitsList from "../Units/UnitsList";

export default function Units() {
  return (
    <>
      <PageMeta
        title="Unit Kerja / Departemen"
        description="Kelola unit kerja, departemen, atau divisi dalam organisasi"
      />
      <PageBreadcrumb pageTitle="Unit Kerja / Departemen" />
      <div className="space-y-6">
        <ComponentCard title="Daftar Units">
          <UnitsList />
        </ComponentCard>
      </div>
    </>
  );
}
