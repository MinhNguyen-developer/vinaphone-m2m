import React from "react";
import { Table, Tag, Transfer } from "antd";
import type {
  GetProp,
  TableColumnsType,
  TableProps,
  TransferProps,
} from "antd";

type TransferItem = GetProp<TransferProps, "dataSource">[number];
type TableRowSelection<T extends object> = TableProps<T>["rowSelection"];

export interface SimTransferItem extends TransferItem {
  key: string;
  phoneNumber: string;
  internalImsi?: string | null;
  ratingPlan: string;
}

export interface TableTransferProps {
  dataSource: SimTransferItem[];
  targetKeys: string[];
  loading?: boolean;
  disabled?: boolean;
  onChange: (
    nextTargetKeys: string[],
    direction: "left" | "right",
    moveKeys: string[],
  ) => void;
}

const simColumns: TableColumnsType<SimTransferItem> = [
  { dataIndex: "phoneNumber", title: "Số điện thoại", width: 140 },
  { dataIndex: "internalImsi", title: "IMSI nội bộ", width: 120 },
  {
    dataIndex: "ratingPlan",
    title: "Gói cước",
    render: (v: string) =>
      v ? (
        <Tag style={{ marginInlineEnd: 0 }} color="blue">
          {v}
        </Tag>
      ) : null,
  },
];

const filterOption = (input: string, item: SimTransferItem) =>
  item.phoneNumber.toLowerCase().includes(input.toLowerCase()) ||
  !!item.internalImsi?.includes(input.trim()) ||
  item.ratingPlan.toLowerCase().includes(input.toLowerCase());

const TableTransfer: React.FC<TableTransferProps> = ({
  dataSource,
  targetKeys,
  loading = false,
  disabled = false,
  onChange,
}) => (
  <Transfer<SimTransferItem>
    dataSource={dataSource}
    targetKeys={targetKeys}
    disabled={disabled}
    onChange={(tKeys, dir, moveKeys) =>
      onChange(tKeys as string[], dir, moveKeys as string[])
    }
    showSearch
    filterOption={filterOption}
    showSelectAll={false}
    titles={["Tất cả SIM", "Trong nhóm"]}
    style={{ width: "100%" }}
    locale={{
      itemUnit: "sim",
      itemsUnit: "sim",
      searchPlaceholder: "Tìm SĐT, IMSI nội bộ hoặc gói cước",
    }}
  >
    {({
      filteredItems,
      onItemSelect,
      onItemSelectAll,
      selectedKeys: listSelectedKeys,
      disabled: listDisabled,
    }) => {
      const rowSelection: TableRowSelection<SimTransferItem> = {
        getCheckboxProps: () => ({ disabled: listDisabled }),
        onChange(selectedRowKeys) {
          onItemSelectAll(selectedRowKeys, "replace");
        },
        selectedRowKeys: listSelectedKeys,
        selections: [
          {
            key: "All-items",
            text: "Chọn tất cả sim",
            onSelect: () => {
              let newSelectedRowKeys = [];
              newSelectedRowKeys = filteredItems.map((item) => item.key);
              onItemSelectAll(newSelectedRowKeys, true);
            },
          },
          {
            key: "invert-selection",
            text: "Đảo ngược lựa chọn hiện tại",
            onSelect: (changeableKeys) => {
              onItemSelectAll(
                changeableKeys,
                !listSelectedKeys.some((key) => changeableKeys.includes(key)),
              );
            },
          },
          {
            key: "1000-items",
            text: "Chọn 1000 sim đầu tiên",
            onSelect: () => {
              let newSelectedRowKeys = [];
              newSelectedRowKeys = filteredItems
                .slice(0, 1000)
                .map((item) => item.key);
              onItemSelectAll(newSelectedRowKeys, true);
            },
          },
        ],
      };

      return (
        <Table<SimTransferItem>
          rowSelection={rowSelection}
          columns={simColumns}
          dataSource={filteredItems}
          rowKey="key"
          size="small"
          loading={loading}
          style={{ pointerEvents: listDisabled ? "none" : undefined }}
          pagination={{ pageSize: 10, size: "small", showSizeChanger: false }}
          onRow={({ key, disabled: itemDisabled }) => ({
            onClick: () => {
              if (itemDisabled || listDisabled) return;
              onItemSelect(key, !listSelectedKeys.includes(key));
            },
          })}
        />
      );
    }}
  </Transfer>
);

export default TableTransfer;
