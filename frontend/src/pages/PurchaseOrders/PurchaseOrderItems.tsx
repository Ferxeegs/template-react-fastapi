import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import PurchaseOrderItemsList from "../PurchaseOrders/PurchaseOrderItemsList";

export default function PurchaseOrderItems() {
  return (
    <>
      <PageMeta
        title="Item Purchase Order"
        description="Daftar item pada purchase order"
      />
      <PageBreadcrumb pageTitle="Item Purchase Order (PO)" />
      <div className="space-y-6">
        <ComponentCard title="Daftar Item PO">
          <PurchaseOrderItemsList />
        </ComponentCard>
      </div>
    </>
  );
}
