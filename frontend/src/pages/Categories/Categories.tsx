import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import CategoriesList from "./CategoriesList";

export default function Categories() {
  return (
    <>
      <PageMeta
        title="Kategori Produk"
        description="Kelola kategori produk untuk klasifikasi inventaris"
      />
      <PageBreadcrumb pageTitle="Kategori Produk" />
      <div className="space-y-6">
        <ComponentCard title="Daftar Kategori">
          <CategoriesList />
        </ComponentCard>
      </div>
    </>
  );
}
