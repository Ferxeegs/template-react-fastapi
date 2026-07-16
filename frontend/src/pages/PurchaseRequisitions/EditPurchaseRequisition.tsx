import { useNavigate, useParams } from "react-router";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import PrForm from "./PrForm";

export default function EditPurchaseRequisition() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <>
      <PageMeta
        title="Edit Permintaan Pembelian"
        description="Edit draft pengajuan pengadaan"
      />
      <PageBreadcrumb pageTitle="Edit PR" />
      <div className="space-y-6">
        <ComponentCard title="Edit Pengajuan Pengadaan">
          <PrForm
            mode="edit"
            prId={id}
            title="Edit Draft PR"
            backTo={`/purchase-requisitions/${id}`}
            onSaved={(pr) => navigate(`/purchase-requisitions/${pr.id}`)}
          />
        </ComponentCard>
      </div>
    </>
  );
}
