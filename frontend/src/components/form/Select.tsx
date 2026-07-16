import type React from "react";
import { Select as UiSelect, type SelectOption } from "../ui/Select";

export type { SelectOption };

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  options: Option[];
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
  defaultValue?: string;
  value?: string;
  disabled?: boolean;
  label?: string;
  required?: boolean;
}

const Select: React.FC<SelectProps> = ({
  options,
  placeholder = "Select an option",
  onChange,
  className = "",
  defaultValue = "",
  value,
  disabled = false,
  label,
  required = false,
}) => {
  const uiOptions: SelectOption[] = options.map((o) => ({ value: o.value, label: o.label }));

  return (
    <UiSelect
      label={label}
      value={value ?? defaultValue}
      options={uiOptions}
      onChange={(v) => onChange(String(v))}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      allowEmpty={!required}
      emptyLabel={placeholder}
      required={required}
    />
  );
};

export default Select;
