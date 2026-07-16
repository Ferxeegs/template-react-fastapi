import { useState, useEffect } from "react";
import { roleAPI } from "../../utils/api";
import { CheckLineIcon } from "../../icons";

interface Role {
  id: number;
  name: string;
  guard_name: string;
}

interface RolesTabProps {
  selectedRoleIds: number[];
  onRoleChange: (roleIds: number[]) => void;
  isLoading: boolean;
}

export default function RolesTab({
  selectedRoleIds,
  onRoleChange,
  isLoading,
}: RolesTabProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setIsFetching(true);
    try {
      const response = await roleAPI.getAllRoles({ limit: 100 });
      if (response.success && response.data) {
        setRoles(response.data.roles);
      }
    } catch (err) {
      console.error("Fetch roles error:", err);
    } finally {
      setIsFetching(false);
    }
  };

  const handleRoleToggle = (roleId: number) => {
    if (selectedRoleIds.includes(roleId)) {
      onRoleChange(selectedRoleIds.filter((id) => id !== roleId));
    } else {
      onRoleChange([...selectedRoleIds, roleId]);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500 dark:text-gray-400">Memuat roles...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {roles.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Tidak ada roles tersedia
        </div>
      ) : (
        <div className="space-y-2">
          {roles.map((role) => (
            <div
              key={role.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleRoleToggle(role.id)}
                  disabled={isLoading}
                  className={`flex items-center justify-center w-5 h-5 border-2 rounded ${
                    selectedRoleIds.includes(role.id)
                      ? "bg-brand-500 border-brand-500"
                      : "border-gray-300 dark:border-gray-600"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {selectedRoleIds.includes(role.id) && (
                    <CheckLineIcon className="w-3 h-3 text-white" />
                  )}
                </button>
                <div>
                  <div className="font-medium text-gray-800 dark:text-white">
                    {role.name}
                  </div>
                  {/* <Badge size="sm" color="info">
                    {role.guard_name}
                  </Badge> */}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

