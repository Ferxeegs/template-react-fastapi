import { useState, useEffect, FormEvent } from "react";
import { useParams, useNavigate } from "react-router";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import { userAPI } from "../../utils/api";

export default function EditUserForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    fullname: "",
    phone_number: "",
    email: "",
  });

  // Fetch user data when component mounts
  useEffect(() => {
    if (id) {
      fetchUserData();
    }
  }, [id]);

  const fetchUserData = async () => {
    if (!id) return;

    setIsFetching(true);
    setError(null);

    try {
      const response = await userAPI.getUserById(id);
      if (response.success && response.data) {
        setFormData({
          firstname: response.data.firstname || "",
          lastname: response.data.lastname || "",
          fullname: response.data.fullname || "",
          phone_number: response.data.phone_number || "",
          email: response.data.email || "",
        });
      } else {
        setError(response.message || "Gagal mengambil data user");
      }
    } catch (err: any) {
      setError("Terjadi kesalahan saat mengambil data user");
      console.error("Fetch user error:", err);
    } finally {
      setIsFetching(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user types
    if (error) setError(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!id) return;

    // Client-side validation
    if (formData.firstname.trim().length < 2) {
      setError("Nama depan minimal 2 karakter");
      return;
    }

    if (formData.lastname.trim().length < 2) {
      setError("Nama belakang minimal 2 karakter");
      return;
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      setError("Format email tidak valid");
      return;
    }

    setIsLoading(true);

    try {
      const response = await userAPI.updateUser(id, {
        firstname: formData.firstname.trim(),
        lastname: formData.lastname.trim(),
        fullname: formData.fullname.trim() || null,
        phone_number: formData.phone_number.trim() || null,
        email: formData.email.trim() || undefined,
      });

      if (response.success) {
        // Redirect back to users list
        navigate("/users");
      } else {
        setError(response.message || "Gagal mengupdate user");
      }
    } catch (err: any) {
      setError("Terjadi kesalahan. Silakan coba lagi.");
      console.error("Update user error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500 dark:text-gray-400">Memuat data user...</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-5">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="sm:col-span-1">
            <Label>
              First Name <span className="text-error-500">*</span>
            </Label>
            <Input
              type="text"
              name="firstname"
              value={formData.firstname}
              onChange={handleChange}
              placeholder="Enter first name"
              disabled={isLoading}
              required
            />
          </div>

          <div className="sm:col-span-1">
            <Label>
              Last Name <span className="text-error-500">*</span>
            </Label>
            <Input
              type="text"
              name="lastname"
              value={formData.lastname}
              onChange={handleChange}
              placeholder="Enter last name"
              disabled={isLoading}
              required
            />
          </div>
        </div>

        <div>
          <Label>Full Name</Label>
          <Input
            type="text"
            name="fullname"
            value={formData.fullname}
            onChange={handleChange}
            placeholder="Enter full name (optional)"
            disabled={isLoading}
          />
        </div>

        <div>
          <Label>
            Email <span className="text-error-500">*</span>
          </Label>
          <Input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter email"
            disabled={isLoading}
            required
          />
        </div>

        <div>
          <Label>Phone Number</Label>
          <Input
            type="tel"
            name="phone_number"
            value={formData.phone_number}
            onChange={handleChange}
            placeholder="Enter phone number (optional)"
            disabled={isLoading}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate("/users")}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300 disabled:cursor-not-allowed"
          >
            {isLoading ? "Updating..." : "Update User"}
          </button>
        </div>
      </div>
    </form>
  );
}

