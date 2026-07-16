import { useState } from "react";
import { Select } from "../../ui/Select";

interface CountryCode {
  code: string;
  label: string;
}

interface PhoneInputProps {
  countries: CountryCode[];
  placeholder?: string;
  onChange?: (phoneNumber: string) => void;
  selectPosition?: "start" | "end";
}

const PhoneInput: React.FC<PhoneInputProps> = ({
  countries,
  placeholder = "+1 (555) 000-0000",
  onChange,
  selectPosition = "start",
}) => {
  const [selectedCountry, setSelectedCountry] = useState<string>("US");
  const [phoneNumber, setPhoneNumber] = useState<string>("+1");

  const countryCodes: Record<string, string> = countries.reduce(
    (acc, { code, label }) => ({ ...acc, [code]: label }),
    {}
  );

  const handleCountryChange = (newCountry: string) => {
    setSelectedCountry(newCountry);
    setPhoneNumber(countryCodes[newCountry]);
    onChange?.(countryCodes[newCountry]);
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPhoneNumber = e.target.value;
    setPhoneNumber(newPhoneNumber);
    onChange?.(newPhoneNumber);
  };

  const countrySelect = (
    <Select
      size="sm"
      className="w-[5.5rem] shrink-0 sm:w-[6rem]"
      value={selectedCountry}
      onChange={(v) => handleCountryChange(String(v))}
      options={countries.map((country) => ({ value: country.code, label: country.code }))}
    />
  );

  return (
    <div className={`flex gap-2 ${selectPosition === "end" ? "flex-row-reverse" : ""}`}>
      {countrySelect}
      <input
        type="tel"
        value={phoneNumber}
        onChange={handlePhoneNumberChange}
        placeholder={placeholder}
        className="h-11 min-w-0 flex-1 rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
      />
    </div>
  );
};

export default PhoneInput;
