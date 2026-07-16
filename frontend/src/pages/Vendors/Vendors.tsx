import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import VendorsList from "./VendorsList";

export default function Vendors() {
  return (
    <>
      <PageMeta
        title="Daftar Vendor"
        description="Kelola mitra, penyedia barang, dan vendor pihak ketiga"
      />
      <PageBreadcrumb pageTitle="Kelola Vendor" />
      <div className="space-y-6">
        <ComponentCard title="Daftar Mitra / Vendor">
          <VendorsList />
        </ComponentCard>
      </div>
    </>
  );
}
