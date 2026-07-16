import { useState, useEffect, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import Badge from "../../components/ui/badge/Badge";
import { productAPI, vendorAPI, categoryAPI, type Product, type Vendor, type Category } from "../../utils/api";
import { PencilIcon, TrashBinIcon, PlusIcon } from "../../icons";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Modal, ConfirmModal, LoadingModal } from "../../components/ui/modal";
import { Select } from "../../components/ui/Select";
import SearchableSelect from "../../components/form/SearchableSelect";
import { formatNumberToIdrInput, parseIdrInputToNumberString } from "../PurchaseRequisitions/prUtils";

interface TypeOption {
  id: number;
  name: string;
  description: string | null;
}

interface UomOption {
  id: number;
  name: string;
  shortname: string;
}

export default function ProductsList() {
  const { hasPermission } = useAuth();
  const { success: showSuccess, error: showError } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [productTypes, setProductTypes] = useState<TypeOption[]>([]);
  const [uoms, setUoms] = useState<UomOption[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Permissions check
  const canCreate = hasPermission("create_product");
  const canUpdate = hasPermission("update_product");
  const canDelete = hasPermission("delete_product");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [productTypeId, setProductTypeId] = useState<number | null>(null);
  const [uomId, setUomId] = useState<number | null>(null);
  const [price, setPrice] = useState<string>("");
  const [minimumStock, setMinimumStock] = useState<string>("0");
  const [isActive, setIsActive] = useState<boolean>(true);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [categorySearch, setCategorySearch] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const selectedVendor = vendors.find((v) => v.id === vendorId);
  const vendorOptions = useMemo(
    () =>
      vendors.map((v) => ({
        id: v.id,
        label: v.company_name,
        sublabel: v.unit?.name ?? undefined,
      })),
    [vendors]
  );
  const visibleCategories = useMemo(() => {
    const unitId = selectedVendor?.unit_id;
    if (!unitId) return [];
    const q = categorySearch.trim().toLowerCase();
    return categories.filter((c) => {
      if (c.unit_id !== unitId) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q);
    });
  }, [categories, selectedVendor?.unit_id, categorySearch]);

  const unitCategories = useMemo(() => {
    const unitId = selectedVendor?.unit_id;
    if (!unitId) return [];
    return categories.filter((c) => c.unit_id === unitId);
  }, [categories, selectedVendor?.unit_id]);

  const selectedUom = uoms.find((u) => u.id === uomId);
  // const uomSuffix = selectedUom ? ` (${selectedUom.shortname || selectedUom.name})` : "";

  useEffect(() => {
    if (!vendorId) {
      setSelectedCategoryIds([]);
      return;
    }
    const allowed = new Set(unitCategories.map((c) => c.id));
    setSelectedCategoryIds((prev) => prev.filter((id) => allowed.has(id)));
  }, [vendorId, unitCategories]);

  useEffect(() => {
    setCategorySearch("");
  }, [vendorId]);

  const fetchProducts = async (forceLoading = false) => {
    if (forceLoading || products.length === 0) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const response = await productAPI.getAllProducts({
        page,
        limit: 10,
        search: debouncedSearch.trim() || undefined,
      });

      if (response.success && response.data) {
        setProducts(response.data.products);
        if (response.data.pagination) {
          setPagination(response.data.pagination);
        }
      } else {
        setError(response.message || "Gagal mengambil data produk");
      }
    } catch (err: any) {
      setError("Terjadi kesalahan saat mengambil data.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFormOptions = async () => {
    try {
      const [vendorsRes, typesRes, uomsRes, categoriesRes] = await Promise.all([
        vendorAPI.getAllVendors({ all: true }),
        productAPI.getTypes(),
        productAPI.getUoms(),
        categoryAPI.getAllCategories({ all: true })
      ]);
      if (vendorsRes.success && vendorsRes.data) {
        setVendors(vendorsRes.data.vendors);
      }
      if (typesRes.success && typesRes.data) {
        setProductTypes(typesRes.data.product_types);
      }
      if (uomsRes.success && uomsRes.data) {
        setUoms(uomsRes.data.uoms);
      }
      if (categoriesRes.success && categoriesRes.data) {
        setCategories(categoriesRes.data.categories);
      }
    } catch (err) {
      console.error("Gagal mengambil opsi form:", err);
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchProducts(false);
  }, [page, debouncedSearch]);

  // Handle open create modal
  const handleOpenCreate = () => {
    setName("");
    setVendorId("");
    setProductTypeId(null);
    setUomId(null);
    setPrice("");
    setMinimumStock("0");
    setIsActive(true);
    setSelectedCategoryIds([]);
    setCategorySearch("");
    setFormError(null);
    fetchFormOptions();
    setIsCreateOpen(true);
  };

  // Handle open edit modal
  const handleOpenEdit = (product: Product) => {
    setSelectedProduct(product);
    setName(product.name);
    setVendorId(product.vendor_id);
    setProductTypeId(product.product_type_id);
    setUomId(product.uom_id);
    setPrice(product.price ? String(product.price) : "");
    setMinimumStock(
      product.minimum_stock != null && product.minimum_stock !== undefined
        ? String(Number(product.minimum_stock))
        : "0"
    );
    setIsActive(product.is_active);
    setSelectedCategoryIds(product.categories.map((c) => c.id));
    setCategorySearch("");
    setFormError(null);
    fetchFormOptions();
    setIsEditOpen(true);
  };

  // Handle open delete confirmation
  const handleOpenDelete = (product: Product) => {
    setSelectedProduct(product);
    setIsDeleteOpen(true);
  };

  // Create Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim()) {
      setFormError("Nama produk tidak boleh kosong");
      return;
    }
    if (!vendorId) {
      setFormError("Pilih vendor / pemasok terlebih dahulu");
      return;
    }
    if (!productTypeId) {
      setFormError("Pilih tipe produk terlebih dahulu");
      return;
    }
    if (!uomId) {
      setFormError("Pilih satuan ukur (UOM) terlebih dahulu");
      return;
    }
    if (selectedCategoryIds.length === 0) {
      setFormError("Pilih minimal satu kategori produk");
      return;
    }
    if (Number(minimumStock) < 0) {
      setFormError("Minimum stok tidak boleh negatif");
      return;
    }
    setIsSubmitLoading(true);
    try {
      const response = await productAPI.createProduct({
        name: name.trim(),
        vendor_id: vendorId,
        product_type_id: productTypeId,
        uom_id: uomId,
        price: Number(price),
        minimum_stock: Number(minimumStock || 0),
        is_active: isActive,
        category_ids: selectedCategoryIds,
      });

      if (response.success) {
        showSuccess("Produk berhasil ditambahkan!");
        setIsCreateOpen(false);
        fetchProducts(true);
      } else {
        setFormError(response.message || "Gagal menambahkan produk");
      }
    } catch (err: any) {
      setFormError("Terjadi kesalahan koneksi.");
    } finally {
      setIsSubmitLoading(false);
    }
  };

  // Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!selectedProduct) return;
    if (!name.trim()) {
      setFormError("Nama produk tidak boleh kosong");
      return;
    }
    if (!vendorId) {
      setFormError("Pilih vendor / pemasok");
      return;
    }
    if (Number(minimumStock) < 0) {
      setFormError("Minimum stok tidak boleh negatif");
      return;
    }
    setIsSubmitLoading(true);
    try {
      const response = await productAPI.updateProduct(selectedProduct.id, {
        name: name.trim(),
        vendor_id: vendorId,
        product_type_id: productTypeId,
        uom_id: uomId,
        price: Number(price),
        minimum_stock: Number(minimumStock || 0),
        is_active: isActive,
        category_ids: selectedCategoryIds,
      });

      if (response.success) {
        showSuccess("Produk berhasil diperbarui!");
        setIsEditOpen(false);
        fetchProducts(true);
      } else {
        setFormError(response.message || "Gagal memperbarui produk");
      }
    } catch (err: any) {
      setFormError("Terjadi kesalahan koneksi.");
    } finally {
      setIsSubmitLoading(false);
    }
  };

  // Delete Confirm
  const handleDeleteConfirm = async () => {
    if (!selectedProduct) return;
    setIsSubmitLoading(true);
    try {
      const response = await productAPI.deleteProduct(selectedProduct.id);
      if (response.success) {
        showSuccess("Produk berhasil dihapus!");
        setIsDeleteOpen(false);
        fetchProducts(true);
      } else {
        showError(response.message || "Gagal menghapus produk");
      }
    } catch (err: any) {
      showError("Terjadi kesalahan koneksi.");
    } finally {
      setIsSubmitLoading(false);
      setSelectedProduct(null);
    }
  };

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Search and Action Bar */}
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Cari produk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 rounded-lg border border-gray-200 bg-transparent py-2.5 pl-11 pr-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
          />
          <svg
            className="absolute -translate-y-1/2 left-3.5 top-1/2 fill-gray-500 dark:fill-gray-400"
            width="18"
            height="18"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z"
            />
          </svg>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center sm:text-left">
            Total: {pagination.total} produk
          </div>
          {canCreate && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Tambah Produk
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
          {error}
        </div>
      )}

      {/* Mobile Card View */}
      <div className="block md:hidden space-y-3">
        {products.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500 dark:text-gray-400 text-sm text-center">
              {search ? "Tidak ada produk yang ditemukan" : "Belum ada produk"}
            </div>
          </div>
        ) : (
          products.map((product) => (
            <div
              key={product.id}
              className="p-4 bg-white rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-white/90 text-base">
                    {product.name}
                  </h4>
                  <p className="text-sm font-bold text-brand-600 dark:text-brand-400 mt-1">
                    {formatIDR(product.price)} / {product.uom?.shortname || "UOM"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Vendor: {product.vendor?.company_name || "-"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Tipe: {product.product_type?.name || "-"}
                  </p>
                </div>
                <Badge size="sm" color={product.is_active ? "success" : "light"}>
                  {product.is_active ? "Aktif" : "Non-Aktif"}
                </Badge>
              </div>

              {product.categories.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {product.categories.map((c) => (
                    <span
                      key={c.id}
                      className="px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 rounded"
                    >
                      {c.name}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                {canUpdate && (
                  <button
                    onClick={() => handleOpenEdit(product)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <PencilIcon className="w-3.5 h-3.5" />
                    Edit
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => handleOpenDelete(product)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg"
                  >
                    <TrashBinIcon className="w-3.5 h-3.5" />
                    Hapus
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto custom-scrollbar">
          {products.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500 dark:text-gray-400">
                {search ? "Tidak ada produk yang ditemukan" : "Belum ada produk"}
              </div>
            </div>
          ) : (
            <Table className="min-w-[1140px] w-full table-fixed border-collapse">
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50/50 dark:bg-white/[0.02]">
                <TableRow>
                  <TableCell isHeader className="px-5 py-4 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[220px]">
                    Nama Produk
                  </TableCell>
                  <TableCell isHeader className="px-5 py-4 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[180px]">
                    Vendor / Mitra
                  </TableCell>
                  <TableCell isHeader className="px-5 py-4 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[110px]">
                    Tipe
                  </TableCell>
                  <TableCell isHeader className="px-5 py-4 text-right text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[140px]">
                    Harga Satuan
                  </TableCell>
                  <TableCell isHeader className="px-5 py-4 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[90px]">
                    UOM
                  </TableCell>
                  <TableCell isHeader className="px-5 py-4 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[180px]">
                    Kategori
                  </TableCell>
                  <TableCell isHeader className="px-5 py-4 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[110px]">
                    Status
                  </TableCell>
                  <TableCell isHeader className="px-5 py-4 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[110px]">
                    Aksi
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {products.map((product) => (
                  <TableRow key={product.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <TableCell className="px-5 py-4 font-semibold text-gray-800 dark:text-white/90">
                      {product.name}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-left text-sm text-gray-600 dark:text-gray-300 truncate" title={product.vendor?.company_name || ""}>
                      {product.vendor?.company_name || "-"}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      {product.product_type?.name || "-"}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-right text-sm font-bold text-brand-600 dark:text-brand-400">
                      {formatIDR(product.price)}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-center text-sm text-gray-600 dark:text-gray-300">
                      {product.uom?.shortname || "-"}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-left">
                      {product.categories.length === 0 ? (
                        <span className="text-gray-400 text-xs">-</span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-[170px]">
                          {product.categories.map((c) => (
                            <span
                              key={c.id}
                              className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 rounded"
                            >
                              {c.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-center">
                      <Badge size="sm" color={product.is_active ? "success" : "light"}>
                        {product.is_active ? "Aktif" : "Non-Aktif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {canUpdate && (
                          <button
                            onClick={() => handleOpenEdit(product)}
                            className="p-1.5 text-gray-500 hover:text-brand-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                            title="Edit Produk"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleOpenDelete(product)}
                            className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                            title="Hapus Produk"
                          >
                            <TrashBinIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center sm:text-left">
            Menampilkan {((page - 1) * pagination.limit) + 1} - {Math.min(page * pagination.limit, pagination.total)} dari {pagination.total}
          </div>
          <div className="flex gap-2 justify-center sm:justify-end">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-700"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-700"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} className="w-full max-w-lg mx-auto">
        <form onSubmit={handleCreateSubmit} className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">
              Tambah Produk Baru
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Tambahkan produk barang atau jasa baru ke dalam katalog sistem.
            </p>
          </div>

          {formError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Nama Produk / Layanan <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 px-3 py-2 text-sm rounded-lg border border-gray-200 bg-transparent text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                placeholder="Misal: Tepung Terigu, Daging Ayam"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Pilih Vendor / Mitra <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                value={vendorId}
                onChange={setVendorId}
                placeholder="-- Pilih Vendor --"
                options={vendorOptions}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Tipe Produk <span className="text-red-500">*</span>
                </label>
                <Select
                  value={productTypeId || ""}
                  onChange={(v) => setProductTypeId(v === "" ? null : Number(v))}
                  placeholder="-- Pilih Tipe --"
                  allowEmpty
                  emptyLabel="-- Pilih Tipe --"
                  required
                  options={productTypes.map((t) => ({ value: t.id, label: t.name }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Satuan Ukur (UOM) <span className="text-red-500">*</span>
                </label>
                <Select
                  value={uomId || ""}
                  onChange={(v) => setUomId(v === "" ? null : Number(v))}
                  placeholder="-- Pilih Satuan --"
                  allowEmpty
                  emptyLabel="-- Pilih Satuan --"
                  required
                  options={uoms.map((u) => ({
                    value: u.id,
                    label: `${u.name} (${u.shortname})`,
                  }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Harga Satuan (IDR) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formatNumberToIdrInput(price)}
                  onChange={(e) => {
                    const parsed = parseIdrInputToNumberString(e.target.value);
                    setPrice(parsed);
                  }}
                  className="w-full h-11 px-3 py-2 text-sm rounded-lg border border-gray-200 bg-transparent text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                  placeholder="Misal: 150.000"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Minimum Stok
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={minimumStock}
                    onChange={(e) => setMinimumStock(e.target.value)}
                    className={`w-full h-11 pl-3 ${
                      selectedUom ? "pr-12" : "pr-3"
                    } py-2 text-sm rounded-lg border border-gray-200 bg-transparent text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90`}
                    placeholder="0 = tanpa peringatan"
                  />
                  {selectedUom && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">
                        {selectedUom.shortname || selectedUom.name}
                      </span>
                    </div>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                  Peringatan muncul jika stok di bawah nilai ini
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Status Aktif
              </label>
              <Select
                value={isActive ? "true" : "false"}
                onChange={(v) => setIsActive(v === "true")}
                options={[
                  { value: "true", label: "Aktif" },
                  { value: "false", label: "Non-Aktif" },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Kategori Produk <span className="text-red-500">*</span>
                <span className="ml-1 font-normal text-gray-400">(minimal satu)</span>
              </label>
              <div className={`border rounded-lg overflow-hidden ${
                selectedCategoryIds.length === 0
                  ? "border-red-200 dark:border-red-900/40"
                  : "border-gray-200 dark:border-gray-850"
              }`}>
                <div className="p-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.02]">
                  <input
                    type="text"
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    placeholder="Cari kategori..."
                    className="w-full h-9 px-3 text-sm rounded-md border border-gray-200 bg-white text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto p-3 custom-scrollbar">
                  {!vendorId ? (
                    <span className="col-span-2 text-xs text-gray-400 text-center py-2">
                      Pilih vendor terlebih dahulu
                    </span>
                  ) : unitCategories.length === 0 ? (
                    <span className="col-span-2 text-xs text-gray-400 text-center py-2">
                      Belum ada kategori untuk unit vendor ini
                    </span>
                  ) : visibleCategories.length === 0 ? (
                    <span className="col-span-2 text-xs text-gray-400 text-center py-2">
                      Tidak ada kategori yang cocok dengan &quot;{categorySearch.trim()}&quot;
                    </span>
                  ) : (
                    visibleCategories.map((c) => (
                      <label
                        key={c.id}
                        className="flex items-center gap-2.5 p-2 rounded-lg border border-gray-100 hover:bg-gray-50/70 dark:border-gray-800 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCategoryIds.includes(c.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCategoryIds([...selectedCategoryIds, c.id]);
                            } else {
                              setSelectedCategoryIds(selectedCategoryIds.filter((id) => id !== c.id));
                            }
                          }}
                          className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 size-4 dark:border-gray-800"
                        />
                        <span className="text-xs text-gray-700 dark:text-gray-300 truncate select-none">{c.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              {selectedCategoryIds.length > 0 && (
                <p className="mt-1.5 text-[11px] text-gray-400 dark:text-gray-500">
                  {selectedCategoryIds.length} kategori dipilih
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              disabled={isSubmitLoading}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitLoading}
              className="px-4 py-2.5 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-50"
            >
              {isSubmitLoading ? "Menyimpan..." : "Tambah Produk"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} className="w-full max-w-lg mx-auto">
        <form onSubmit={handleEditSubmit} className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">
              Edit Rincian Produk
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Perbarui harga, vendor, atau kategori katalog produk.
            </p>
          </div>

          {formError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Nama Produk / Layanan <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 px-3 py-2 text-sm rounded-lg border border-gray-200 bg-transparent text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                placeholder="Misal: Tepung Terigu, Daging Ayam"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Pilih Vendor / Mitra <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                value={vendorId}
                onChange={setVendorId}
                placeholder="-- Pilih Vendor --"
                options={vendorOptions}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Tipe Produk
                </label>
                <Select
                  value={productTypeId || ""}
                  onChange={(v) => setProductTypeId(v === "" ? null : Number(v))}
                  placeholder="-- Pilih Tipe --"
                  allowEmpty
                  emptyLabel="-- Pilih Tipe --"
                  options={productTypes.map((t) => ({ value: t.id, label: t.name }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Satuan Ukur (UOM)
                </label>
                <Select
                  value={uomId || ""}
                  onChange={(v) => setUomId(v === "" ? null : Number(v))}
                  placeholder="-- Pilih Satuan --"
                  allowEmpty
                  emptyLabel="-- Pilih Satuan --"
                  options={uoms.map((u) => ({
                    value: u.id,
                    label: `${u.name} (${u.shortname})`,
                  }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Harga Satuan (IDR) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formatNumberToIdrInput(price)}
                  onChange={(e) => {
                    const parsed = parseIdrInputToNumberString(e.target.value);
                    setPrice(parsed);
                  }}
                  className="w-full h-11 px-3 py-2 text-sm rounded-lg border border-gray-200 bg-transparent text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                  placeholder="Harga..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Minimum Stok
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={minimumStock}
                    onChange={(e) => setMinimumStock(e.target.value)}
                    className={`w-full h-11 pl-3 ${
                      selectedUom ? "pr-12" : "pr-3"
                    } py-2 text-sm rounded-lg border border-gray-200 bg-transparent text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90`}
                    placeholder="0 = tanpa peringatan"
                  />
                  {selectedUom && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">
                        {selectedUom.shortname || selectedUom.name}
                      </span>
                    </div>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                  Peringatan muncul jika stok di bawah nilai ini
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Status Aktif
              </label>
              <Select
                value={isActive ? "true" : "false"}
                onChange={(v) => setIsActive(v === "true")}
                options={[
                  { value: "true", label: "Aktif" },
                  { value: "false", label: "Non-Aktif" },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Kategori Produk
              </label>
              <div className="border border-gray-200 dark:border-gray-850 rounded-lg overflow-hidden">
                <div className="p-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.02]">
                  <input
                    type="text"
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    placeholder="Cari kategori..."
                    className="w-full h-9 px-3 text-sm rounded-md border border-gray-200 bg-white text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto p-3 custom-scrollbar">
                  {!vendorId ? (
                    <span className="col-span-2 text-xs text-gray-400 text-center py-2">
                      Pilih vendor terlebih dahulu
                    </span>
                  ) : unitCategories.length === 0 ? (
                    <span className="col-span-2 text-xs text-gray-400 text-center py-2">
                      Belum ada kategori untuk unit vendor ini
                    </span>
                  ) : visibleCategories.length === 0 ? (
                    <span className="col-span-2 text-xs text-gray-400 text-center py-2">
                      Tidak ada kategori yang cocok dengan &quot;{categorySearch.trim()}&quot;
                    </span>
                  ) : (
                    visibleCategories.map((c) => (
                      <label
                        key={c.id}
                        className="flex items-center gap-2.5 p-2 rounded-lg border border-gray-100 hover:bg-gray-50/70 dark:border-gray-800 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCategoryIds.includes(c.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCategoryIds([...selectedCategoryIds, c.id]);
                            } else {
                              setSelectedCategoryIds(selectedCategoryIds.filter((id) => id !== c.id));
                            }
                          }}
                          className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 size-4 dark:border-gray-800"
                        />
                        <span className="text-xs text-gray-700 dark:text-gray-300 truncate select-none">{c.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              {selectedCategoryIds.length > 0 && (
                <p className="mt-1.5 text-[11px] text-gray-400 dark:text-gray-500">
                  {selectedCategoryIds.length} kategori dipilih
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              disabled={isSubmitLoading}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitLoading}
              className="px-4 py-2.5 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-50"
            >
              {isSubmitLoading ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Hapus Produk"
        message={`Apakah Anda yakin ingin menghapus produk "${selectedProduct?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        cancelText="Batal"
        confirmButtonColor="danger"
        isLoading={isSubmitLoading}
      />
      <LoadingModal isOpen={isLoading} />
    </div>
  );
}
