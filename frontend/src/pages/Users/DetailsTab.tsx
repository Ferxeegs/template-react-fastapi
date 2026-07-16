import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import { Select } from "../../components/ui/Select";

interface DetailsTabProps {
  formData: {
    firstname: string;
    lastname: string;
    username: string;
    phone_number: string;
    email: string;
  };
  onChange: (name: string, value: string) => void;
  isLoading: boolean;
  countryCode?: string;
  onCountryCodeChange?: (code: string) => void;
}

export default function DetailsTab({
  formData,
  onChange,
  isLoading,
  countryCode = "+62",
  onCountryCodeChange,
}: DetailsTabProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onChange(name, value);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="sm:col-span-1">
          <Label>
            Firstname <span className="text-error-500">*</span>
          </Label>
          <Input
            type="text"
            name="firstname"
            value={formData.firstname}
            onChange={handleChange}
            placeholder="Enter firstname"
            disabled={isLoading}
          />
        </div>

        <div className="sm:col-span-1">
          <Label>
            Lastname <span className="text-error-500">*</span>
          </Label>
          <Input
            type="text"
            name="lastname"
            value={formData.lastname}
            onChange={handleChange}
            placeholder="Enter lastname"
            disabled={isLoading}
          />
        </div>
      </div>

      <div>
        <Label>
          Username <span className="text-error-500">*</span>
        </Label>
        <Input
          type="text"
          name="username"
          value={formData.username}
          onChange={handleChange}
          placeholder="Enter username"
          disabled={isLoading}
        />
      </div>

      <div>
        <Label>Telp</Label>
        <div className="flex gap-2">
          <Select
            size="sm"
            className="w-[120px] shrink-0"
            value={countryCode ?? "+62"}
            onChange={(v) => onCountryCodeChange?.(String(v))}
            disabled={isLoading}
            options={[
              { value: "+62", label: "🇮🇩 +62" },
              { value: "+1", label: "🇺🇸 +1" },
            ]}
          />
          <Input
            type="tel"
            name="phone_number"
            value={formData.phone_number}
            onChange={handleChange}
            placeholder="0821-3351-3522"
            disabled={isLoading}
            className="flex-1"
          />
        </div>
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
        />
      </div>

    </div>
  );
}

