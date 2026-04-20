import { Button, Input, Space } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useState } from "react";
import type { FilterDropdownProps } from "antd/es/table/interface";

interface CustomTableFilterProps<TKey extends string> extends Pick<
  FilterDropdownProps,
  "confirm" | "close"
> {
  filterKey: TKey;
  setFilterValue: (key: TKey, value: unknown) => void;
}

export const CustomTableFilter = <TKey extends string>({
  filterKey,
  setFilterValue,
  confirm,
  close,
}: CustomTableFilterProps<TKey>) => {
  const [searchValue, setSearchValue] = useState<string>();

  return (
    <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
      <Input
        placeholder="Tìm theo SĐT"
        style={{ marginBottom: 8, display: "block" }}
        value={searchValue ?? ""}
        onChange={(e) => setSearchValue(e.target.value)}
      />
      <Space>
        <Button
          type="primary"
          onClick={() => {
            confirm();
            setFilterValue(filterKey, searchValue);
          }}
          icon={<SearchOutlined />}
          size="small"
          style={{ width: 90 }}
        >
          Search
        </Button>
        <Button
          onClick={() => {
            setSearchValue(undefined);
            setFilterValue(filterKey, undefined);
          }}
          size="small"
          style={{ width: 90 }}
        >
          Reset
        </Button>
        <Button
          type="link"
          size="small"
          onClick={() => {
            setFilterValue(filterKey, searchValue);
            confirm({ closeDropdown: false });
          }}
        >
          Filter
        </Button>
        <Button
          type="link"
          size="small"
          onClick={() => {
            close();
          }}
        >
          close
        </Button>
      </Space>
    </div>
  );
};
