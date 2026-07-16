import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import UomsList from "./UomsList";

export default function Uoms() {
  return (
    <>
      <PageMeta
        title="Satuan (UOM)"
        description="Kelola satuan ukur produk seperti pcs, kg, liter, dan lainnya"
      />
      <PageBreadcrumb pageTitle="Satuan (UOM)" />
      <div className="space-y-6">
        <ComponentCard title="Daftar Satuan">
          <UomsList />
        </ComponentCard>
      </div>
    </>
  );
}
