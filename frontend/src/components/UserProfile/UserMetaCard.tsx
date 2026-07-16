import { useState } from "react";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import { User, useAuth } from "../../context/AuthContext";
import Badge from "../ui/badge/Badge";
import { userAPI } from "../../utils/api";

interface UserMetaCardProps {
  user: User;
  onUpdate?: () => void;
}

export default function UserMetaCard({ user, onUpdate }: UserMetaCardProps) {
  const { isOpen, closeModal } = useModal();
  const { fetchUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstname: user.firstname || "",
    lastname: user.lastname || "",
    email: user.email || "",
    phone_number: user.phone_number || "",
  });

  const getInitials = () => {
    if (user.fullname) {
      const names = user.fullname.split(" ");
      if (names.length >= 2) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase();
      }
      return user.fullname.substring(0, 2).toUpperCase();
    }
    if (user.firstname && user.lastname) {
      return `${user.firstname[0]}${user.lastname[0]}`.toUpperCase();
    }
    if (user.username) {
      return user.username.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  const displayName = user.fullname || `${user.firstname} ${user.lastname}`.trim() || user.username;
  const rolesDisplay = user.roles && user.roles.length > 0 
    ? user.roles.map(r => r.name).join(", ")
    : "No roles assigned";

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError(null);
  };

  const handleSave = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await userAPI.updateMyProfile({
        firstname: formData.firstname.trim(),
        lastname: formData.lastname.trim(),
        email: formData.email.trim(),
        phone_number: formData.phone_number.trim() || null,
      });

      if (response.success) {
        await fetchUser(true);
        if (onUpdate) onUpdate();
        closeModal();
      } else {
        setError(response.message || "Gagal mengupdate profile");
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat mengupdate profile");
      console.error("Update profile error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // const handleOpenModal = () => {
  //   setFormData({
  //     firstname: user.firstname || "",
  //     lastname: user.lastname || "",
  //     email: user.email || "",
  //     phone_number: user.phone_number || "",
  //   });
  //   setError(null);
  //   openModal();
  // };
  
  return (
    <>
      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
            <div className="w-20 h-20 overflow-hidden border border-gray-200 rounded-full dark:border-gray-800 bg-brand-500 flex items-center justify-center text-white font-semibold text-2xl">
              {getInitials()}
            </div>
            <div className="order-3 xl:order-2">
              <h4 className="mb-2 text-lg font-semibold text-center text-gray-800 dark:text-white/90 xl:text-left">
                {displayName}
              </h4>
              <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {rolesDisplay}
                </p>
                {user.phone_number && (
                  <>
                    <div className="hidden h-3.5 w-px bg-gray-300 dark:bg-gray-700 xl:block"></div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {user.phone_number}
                    </p>
                  </>
                )}
              </div>
              {user.roles && user.roles.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 justify-center xl:justify-start">
                  {user.roles.map((role) => (
                    <Badge key={role.id} size="sm" color="primary">
                      {role.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center order-2 gap-2 grow xl:order-3 xl:justify-end">
              {/* <button
                onClick={handleOpenModal}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
              >
                <svg
                  className="fill-current"
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z"
                    fill=""
                  />
                </svg>
                Edit
              </button> */}
            </div>
          </div>
        </div>
      </div>
      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="custom-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Edit Personal Information
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Update your details to keep your profile up-to-date.
            </p>
          </div>
          <form className="flex flex-col" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <div className="custom-scrollbar h-[450px] overflow-y-auto px-2 pb-3">
              {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                  <p className="text-sm font-medium text-red-800 dark:text-red-400">
                    {error}
                  </p>
                </div>
              )}

              <div>
                <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
                  Personal Information
                </h5>

                <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                  <div className="col-span-2 lg:col-span-1">
                    <Label htmlFor="firstname">First Name</Label>
                    <Input
                      type="text"
                      id="firstname"
                      name="firstname"
                      value={formData.firstname}
                      onChange={(e) => handleChange("firstname", e.target.value)}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label htmlFor="lastname">Last Name</Label>
                    <Input
                      type="text"
                      id="lastname"
                      name="lastname"
                      value={formData.lastname}
                      onChange={(e) => handleChange("lastname", e.target.value)}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label htmlFor="phone_number">Phone</Label>
                    <Input
                      type="tel"
                      id="phone_number"
                      name="phone_number"
                      value={formData.phone_number}
                      onChange={(e) => handleChange("phone_number", e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button size="sm" variant="outline" onClick={closeModal} disabled={isLoading}>
                Close
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
