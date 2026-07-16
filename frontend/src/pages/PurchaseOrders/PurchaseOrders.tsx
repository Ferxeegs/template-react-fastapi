import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import PurchaseOrdersList from "./PurchaseOrdersList";

export default function PurchaseOrders() {
  return (
    <>
      <PageMeta
        title="Purchase Order"
        description="Kelola purchase order hasil approval PR"
      />
      <PageBreadcrumb pageTitle="Purchase Order (PO)" />
      <div className="space-y-6">
        <ComponentCard title="Daftar Purchase Order">
          <PurchaseOrdersList />
        </ComponentCard>
      </div>
    </>
  );
}
