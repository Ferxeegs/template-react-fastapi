import { useNavigate } from "react-router";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import PrForm from "./PrForm";

export default function CreatePurchaseRequisition() {
  const navigate = useNavigate();

  return (
    <>
      <PageMeta
        title="Buat Permintaan Pembelian"
        description="Buat draft pengajuan pengadaan baru atau muat dari PR sebelumnya"
      />
      <PageBreadcrumb pageTitle="Buat Pengajuan" />
      <div className="space-y-6">
        <ComponentCard title="Form Pengajuan Pengadaan">
          <PrForm
            mode="create"
            title="Buat Pengajuan Baru"
            backTo="/purchase-requisitions"
            onSaved={(pr) => navigate(`/purchase-requisitions/${pr.id}`)}
          />
        </ComponentCard>
      </div>
    </>
  );
}
