import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import PurchaseRequisitionsList from "./PurchaseRequisitionsList";

export default function PurchaseRequisitions() {
  return (
    <>
      <PageMeta
        title="Permintaan Pembelian"
        description="Kelola pengajuan pengadaan barang dan jasa"
      />
      <PageBreadcrumb pageTitle="Permintaan Pembelian (PR)" />
      <div className="space-y-6">
        <ComponentCard title="Daftar Pengajuan Pengadaan">
          <PurchaseRequisitionsList />
        </ComponentCard>
      </div>
    </>
  );
}
