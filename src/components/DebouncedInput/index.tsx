import { Input } from "antd";
import { useEffect, useState } from "react";

export const DebouncedInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  prefix?: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
}> = ({
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
