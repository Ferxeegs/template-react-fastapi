import { useState, useEffect, FormEvent } from "react";
import { useParams, useNavigate, Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import { roleAPI } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import { LockIcon, CheckLineIcon, AngleLeftIcon, ChevronUpIcon, ChevronDownIcon } from "../../icons";
import { useToast } from "../../context/ToastContext";

interface Permission {
  id: number;
  name: string;
  guard_name: string;
  created_at: string | null;
  updated_at: string | null;
}

interface RoleData {
  id: number;
  name: string;
  guard_name: string;
  permissions: Array<{
    id: number;
    name: string;
    guard_name: string;
  }>;
  permissions_count: number;
  users_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export default function EditRole() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { success, error: showError } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleData, setRoleData] = useState<RoleData | null>(null);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    guard_name: "",
  });
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "resources" | "pages" | "widgets" | "other">("all");
  const [selectAll, setSelectAll] = useState(false);
  const [collapsedResources, setCollapsedResources] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (id) {
      fetchRoleData();
      fetchAllPermissions();
    }
  }, [id]);

  const fetchRoleData = async () => {
    if (!id) return;

    setIsFetching(true);
    setError(null);

    try {
      const response = await roleAPI.getRoleById(id);
      // console.log("Role response:", response);
      if (response.success && response.data) {
        const role = response.data;
        // console.log("Role data:", role);
        // console.log("Role permissions:", role.permissions);
        // Convert id to number if it's a string (from URL params)
        setRoleData({
          ...role,
          id: Number(role.id)
        } as RoleData);
        setFormData({
          name: role.name || "",
          guard_name: role.guard_name || "",
        });
        const permissionIds = role.permissions ? role.permissions.map((p: any) => Number(p.id)) : [];
        // console.log("Setting selected permission IDs:", permissionIds);
        setSelectedPermissionIds(permissionIds);
      } else {
        setError(response.message || "Gagal mengambil data role");
      }
    } catch (err: any) {
      setError("Terjadi kesalahan saat mengambil data role");
      console.error("Fetch role error:", err);
    } finally {
      setIsFetching(false);
    }
  };

  const fetchAllPermissions = async () => {
    try {
      const response = await roleAPI.getAllPermissions();
      // console.log("Permissions response:", response);
      if (response.success && response.data) {
        const permissions = response.data.permissions || [];
        // console.log("Setting permissions:", permissions);
        setAllPermissions(permissions);
      } else {
        console.error("Failed to fetch permissions:", response.message || response.error);
        setError(response.message || "Gagal mengambil daftar permissions");
      }
    } catch (err: any) {
      console.error("Fetch permissions error:", err);
      setError("Terjadi kesalahan saat mengambil daftar permissions");
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePermissionToggle = (permissionId: number) => {
    setSelectedPermissionIds((prev) => {
      if (prev.includes(permissionId)) {
        return prev.filter((id) => id !== permissionId);
      } else {
        return [...prev, permissionId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedPermissionIds([]);
    } else {
      setSelectedPermissionIds(allPermissions.map((p) => p.id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectAllInGroup = (groupPermissions: Permission[]) => {
    const groupIds = groupPermissions.map((p) => p.id);
    const allSelected = groupIds.every((id) => selectedPermissionIds.includes(id));

    if (allSelected) {
      // Deselect all in group
      setSelectedPermissionIds((prev) => prev.filter((id) => !groupIds.includes(id)));
    } else {
      // Select all in group
      setSelectedPermissionIds((prev) => {
        const newIds = [...prev];
        groupIds.forEach((id) => {
          if (!newIds.includes(id)) {
            newIds.push(id);
          }
        });
        return newIds;
      });
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!id) return;

    setIsLoading(true);
    setError(null);

    try {
      // Only update role permissions (name and guard_name are disabled)
      // Convert permission IDs to numbers (backend expects List[int])
      const updatePermissionsResponse = await roleAPI.updateRolePermissions(
        String(id),
        selectedPermissionIds // Already numbers, no need to convert
      );

      if (!updatePermissionsResponse.success) {
        const errorMessage = updatePermissionsResponse.message || "Gagal mengupdate permissions";
        setError(errorMessage);
        showError(errorMessage);
        setIsLoading(false);
        return;
      }

      // Success - redirect back to roles list
      success("Role permissions berhasil diupdate!");
      navigate("/roles");
    } catch (err: any) {
      const errorMessage = "Terjadi kesalahan. Silakan coba lagi.";
      setError(errorMessage);
      showError(errorMessage);
      console.error("Update role error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Group permissions by model name
  // Permission names format: "action_model" or "action_any_model" (e.g., "view_user", "create_role")
  const groupPermissionsByModel = () => {
    const groups: { [key: string]: Permission[] } = {};

    allPermissions.forEach((permission) => {
      // Extract model name from permission name
      // Examples: "view_user" -> "User", "create_role" -> "Role", "view_any_user" -> "User"
      const parts = permission.name.split('_');
      
      // Remove action words and "any" to get model name
      const actionWords = ['view', 'create', 'update', 'delete', 'restore', 'force', 'any', 'all'];
      const modelParts = parts.filter(part => !actionWords.includes(part.toLowerCase()));
      
      let modelName = modelParts.length > 0 
        ? modelParts.join(' ') 
        : parts[parts.length - 1]; // Fallback to last part
      
      // Capitalize first letter
      modelName = modelName.charAt(0).toUpperCase() + modelName.slice(1).toLowerCase();

      if (!groups[modelName]) {
        groups[modelName] = [];
      }
      groups[modelName].push(permission);
    });

    // Sort permissions within each group by action type
    Object.keys(groups).forEach((modelName) => {
      groups[modelName].sort((a, b) => {
        const actionOrder = ['view', 'create', 'update', 'restore', 'delete', 'force'];
        const getAction = (name: string) => {
          const parts = name.split('_');
          return parts.find(p => actionOrder.includes(p.toLowerCase())) || '';
        };
        const aAction = getAction(a.name);
        const bAction = getAction(b.name);
        const aIndex = actionOrder.indexOf(aAction);
        const bIndex = actionOrder.indexOf(bAction);
        if (aIndex !== bIndex) return aIndex - bIndex;
        // If same action, "any" comes after regular
        return a.name.includes('_any_') ? 1 : b.name.includes('_any_') ? -1 : 0;
      });
    });

    return groups;
  };

  // Group permissions by category for tabs
  const groupPermissionsByCategory = () => {
    const groups: { [key: string]: Permission[] } = {
      resources: [],
      pages: [],
      widgets: [],
      other: [],
    };

    allPermissions.forEach((permission) => {
      const name = permission.name.toLowerCase();
      if (name.includes("page") || (name.includes("view") && name.includes("page"))) {
        groups.pages.push(permission);
      } else if (name.includes("widget")) {
        groups.widgets.push(permission);
      } else if (
        name.includes("create") ||
        name.includes("update") ||
        name.includes("delete") ||
        (name.includes("view") && !name.includes("page")) ||
        name.includes("restore") ||
        name.includes("force") ||
        name.includes("activate") ||
        name.includes("deactivate")
      ) {
        groups.resources.push(permission);
      } else {
        groups.other.push(permission);
      }
    });

    return groups;
  };


  // Get models for current tab with their permissions
  const getModelsForTabWithPermissions = () => {
    if (allPermissions.length === 0) {
      return [];
    }

    const groupedByModel = groupPermissionsByModel();
    const groupedByCategory = groupPermissionsByCategory();

    if (activeTab === "all") {
      return Object.entries(groupedByModel).map(([name, permissions]) => ({
        name,
        permissions,
      }));
    }
    
    const categoryPermissions = groupedByCategory[activeTab] || [];
    const modelMap: { [key: string]: Permission[] } = {};
    
    categoryPermissions.forEach((permission) => {
      // Find which model this permission belongs to
      for (const [modelName, permissions] of Object.entries(groupedByModel)) {
        if (permissions.some((p) => Number(p.id) === Number(permission.id))) {
          if (!modelMap[modelName]) {
            modelMap[modelName] = [];
          }
          modelMap[modelName].push(permission);
          break;
        }
      }
    });
    
    return Object.entries(modelMap).map(([name, permissions]) => ({
      name,
      permissions,
    }));
  };

  const modelsForTab = getModelsForTabWithPermissions();
  
  // Get grouped permissions for tab counts
  const getGroupedPermissionsForTabs = () => {
    if (allPermissions.length === 0) {
      return {
        resources: [],
        pages: [],
        widgets: [],
        other: [],
      };
    }
    return groupPermissionsByCategory();
  };

  const groupedPermissions = getGroupedPermissionsForTabs();

  // Toggle collapse for a model
  const toggleCollapse = (modelName: string) => {
    setCollapsedResources((prev) => ({
      ...prev,
      [modelName]: !prev[modelName],
    }));
  };

  // Get model path (e.g., "App\Models\User")
  const getModelPath = (modelName: string) => {
    return `App\\Models\\${modelName}`;
  };

  // Get action display name from permission name
  const getActionDisplayName = (permissionName: string) => {
    const parts = permissionName.split('_');
    const actionWords = ['view', 'create', 'update', 'delete', 'restore', 'force'];
    const action = parts.find(p => actionWords.includes(p.toLowerCase()));
    
    if (!action) return permissionName;
    
    const actionCapitalized = action.charAt(0).toUpperCase() + action.slice(1);
    const hasAny = permissionName.includes('_any_');
    
    if (hasAny) {
      return `${actionCapitalized} Any`;
    }
    
    return actionCapitalized;
  };

  // Update selectAll state based on current selection
  useEffect(() => {
    if (allPermissions.length > 0) {
      const allSelected = allPermissions.every((p) => selectedPermissionIds.includes(Number(p.id)));
      setSelectAll(allSelected);
    }
  }, [selectedPermissionIds, allPermissions]);

  if (isFetching) {
    return (
      <>
        <PageMeta title="Edit Role" description="Edit role information" />
        <div className="flex items-center gap-2 sm:gap-3 pb-2 sm:pb-0">
          <Link
            to="/roles"
            className="inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 text-gray-500 transition-colors rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white touch-manipulation flex-shrink-0"
          >
            <AngleLeftIcon className="w-5 h-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-800 dark:text-white truncate">
              Edit Role
            </h2>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500 dark:text-gray-400">Memuat data role...</div>
        </div>
      </>
    );
  }

  if (!roleData) {
    return (
      <>
        <PageMeta title="Edit Role" description="Edit role information" />
        <div className="flex items-center gap-2 sm:gap-3 pb-2 sm:pb-0">
          <Link
            to="/roles"
            className="inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 text-gray-500 transition-colors rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white touch-manipulation flex-shrink-0"
          >
            <AngleLeftIcon className="w-5 h-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-800 dark:text-white truncate">
              Edit Role
            </h2>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500 dark:text-gray-400">Role tidak ditemukan</div>
        </div>
      </>
    );
  }

  const roleName = roleData.name || "Role";

  return (
    <>
      <PageMeta title={`Edit ${roleName} | TailAdmin`} description="Edit role information" />

      <div className="space-y-4 sm:space-y-6">
        {/* Header - Mobile Optimized */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/roles"
              className="inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 text-gray-500 transition-colors rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white touch-manipulation flex-shrink-0"
            >
              <AngleLeftIcon className="w-5 h-5" />
            </Link>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-800 dark:text-white truncate">
                Edit {roleName}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 hidden sm:block">
                Edit role permissions and settings
              </p>
            </div>
          </div>
        </div>

        {/* Role Details Section */}
        <div className="p-4 sm:p-6 bg-gray-50 rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
            <div>
              <Label>
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                placeholder="Enter role name"
                disabled={true}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>
                Guard Name <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                name="guard_name"
                value={formData.guard_name}
                onChange={handleFormChange}
                placeholder="Enter guard name"
                disabled={true}
                className="mt-1.5"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 mt-4 sm:mt-6">
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={handleSelectAll}
                className="sr-only peer"
              />
              <div className="w-10 h-5 sm:w-11 sm:h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
            <div className="min-w-0 flex-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Select All
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                Enable all Permissions currently Enabled for this role
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="p-4 sm:p-6 bg-white rounded-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
          <div className="overflow-x-auto -mx-4 sm:mx-0 mb-4 sm:mb-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-1 px-4 sm:px-0 min-w-max">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`flex items-center gap-1 sm:gap-2 px-3 py-2 sm:px-4 sm:py-3 font-medium text-xs sm:text-sm border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === "all"
                    ? "border-brand-500 text-brand-500"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                <LockIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">All Permissions</span>
                <span className="xs:hidden">All</span>
                <span className="ml-1">({allPermissions.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("resources")}
                className={`flex items-center gap-1 sm:gap-2 px-3 py-2 sm:px-4 sm:py-3 font-medium text-xs sm:text-sm border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === "resources"
                    ? "border-brand-500 text-brand-500"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                Resources ({groupedPermissions.resources.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("pages")}
                className={`flex items-center gap-1 sm:gap-2 px-3 py-2 sm:px-4 sm:py-3 font-medium text-xs sm:text-sm border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === "pages"
                    ? "border-brand-500 text-brand-500"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                Pages ({groupedPermissions.pages.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("widgets")}
                className={`flex items-center gap-1 sm:gap-2 px-3 py-2 sm:px-4 sm:py-3 font-medium text-xs sm:text-sm border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === "widgets"
                    ? "border-brand-500 text-brand-500"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                Widgets ({groupedPermissions.widgets.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("other")}
                className={`flex items-center gap-1 sm:gap-2 px-3 py-2 sm:px-4 sm:py-3 font-medium text-xs sm:text-sm border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === "other"
                    ? "border-brand-500 text-brand-500"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                <span className="hidden xs:inline">Other Permissions</span>
                <span className="xs:hidden">Other</span>
                <span className="ml-1">({groupedPermissions.other.length})</span>
              </button>
            </div>
          </div>

          {/* Permissions Content */}
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 border border-red-300 rounded-lg dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {modelsForTab.map((model) => {
                const { name: modelName, permissions: modelPermissions } = model;
                const isCollapsed = collapsedResources[modelName];

                return (
                  <div
                    key={modelName}
                    className="bg-gray-50 rounded-lg border border-gray-200 dark:bg-gray-900 dark:border-gray-700"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-0.5 truncate">
                          {modelName}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {getModelPath(modelName)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleCollapse(modelName)}
                        className="p-1.5 sm:p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 touch-manipulation flex-shrink-0"
                      >
                        {isCollapsed ? (
                          <ChevronDownIcon className="w-4 h-4" />
                        ) : (
                          <ChevronUpIcon className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Permissions Content */}
                    {!isCollapsed && (
                      <div className="p-3 sm:p-4">
                        <div className="mb-3">
                          <button
                            type="button"
                            onClick={() => handleSelectAllInGroup(modelPermissions)}
                            className="text-xs font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 touch-manipulation"
                          >
                            Select all
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                          {modelPermissions.map((permission) => {
                            const displayName = getActionDisplayName(permission.name);

                            return (
                              <label
                                key={permission.id}
                                className="flex items-center gap-2 cursor-pointer p-1.5 sm:p-0 rounded hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors touch-manipulation"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedPermissionIds.includes(Number(permission.id))}
                                  onChange={() => handlePermissionToggle(Number(permission.id))}
                                  className="w-4 h-4 text-brand-500 bg-gray-100 border-gray-300 rounded focus:ring-brand-500 dark:focus:ring-brand-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 flex-shrink-0"
                                />
                                <span className="text-xs text-gray-700 dark:text-gray-300 truncate">
                                  {displayName}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {modelsForTab.length === 0 && (
              <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                Tidak ada permissions di kategori ini
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 sm:pt-6 mt-4 sm:mt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => navigate("/roles")}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 touch-manipulation"
              >
                <AngleLeftIcon className="w-4 h-4" />
                Back
              </button>
              {hasPermission('update_role') && (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                >
                  <CheckLineIcon className="w-4 h-4" />
                  <span>{isLoading ? "Saving..." : "Save Changes"}</span>
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

