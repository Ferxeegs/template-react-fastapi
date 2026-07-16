import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import ProductsList from "./ProductsList";

export default function Products() {
  return (
    <>
      <PageMeta
        title="Daftar Produk & Layanan"
        description="Kelola barang, jasa, harga, dan kategorisasi inventaris"
      />
      <PageBreadcrumb pageTitle="Kelola Produk" />
      <div className="space-y-6">
        <ComponentCard title="Daftar Produk & Layanan">
          <ProductsList />
        </ComponentCard>
      </div>
    </>
  );
}
