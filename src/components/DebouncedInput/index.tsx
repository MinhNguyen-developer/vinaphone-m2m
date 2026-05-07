import { Input } from "antd";
import { useEffect, useState } from "react";
import type { InputProps } from "antd/es/input";

interface DebouncedInputProps extends Omit<InputProps, "onChange" | "value"> {
  value: string;
  onChange: (v: string) => void;
  delay?: number;
}

export const DebouncedInput: React.FC<DebouncedInputProps> = ({
  value: externalValue,
  onChange,
  placeholder,
  prefix,
  delay = 400,
  style,
}) => {
  const [local, setLocal] = useState(externalValue ?? "");

  // Sync when external value changes (e.g. reset)
  useEffect(() => {
    setLocal(externalValue ?? "");
  }, [externalValue]);

  // Fire onChange after delay
  useEffect(() => {
    const timer = setTimeout(() => onChange(local), delay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local, delay]);

  return (
    <Input
      placeholder={placeholder}
      prefix={prefix}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      allowClear
      style={style}
    />
  );
};
