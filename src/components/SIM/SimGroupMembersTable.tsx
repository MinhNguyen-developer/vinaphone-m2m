import React, { useCallback, useMemo, useRef, useState } from "react";
import { Table, Tag, Typography, Input } from "antd";
import type { TablePaginationConfig } from "antd";
import type { SorterResult } from "antd/es/table/interface";
import { SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import debounce from "lodash/debounce";
import type { QueryGroupMembersParams, SimCard } from "../../types";
import { useSimGroupMembers } from "../../hooks/useSims";
import { VIN_STATUS_OPTIONS } from "../../utils/constants";
import formatNumber from "../../utils/formatNumber";

const { Text } = Typography;

const columns: ColumnsType<SimCard> = [
  {
    title: "Số điện thoại",
    dataIndex: "phoneNumber",
    key: "phoneNumber",
    render: (v) => <Text strong>{v}</Text>,
  },
  {
    title: "Dung lượng",
    dataIndex: "usedMB",
    key: "usedMB",
    sorter: true,
    render: (v) =>
      v != null ? (
        <Text style={{ fontSize: 11 }}>{formatNumber(v)} MB</Text>
      ) : (
        <Text type="secondary">—</Text>
      ),
  },
  {
    title: "Trạng thái",
    dataIndex: "status",
    key: "status",
    render: (v) => {
      if (v == null) return <Text type="secondary">—</Text>;
      const s = VIN_STATUS_OPTIONS.find((o) => o.value === v);
      return s ? (
        <Tag color={s.color} icon={s.icon}>
          {s.label}
        </Tag>
      ) : (
        <Tag>{v}</Tag>
      );
    },
  },
];

interface Props {
  groupId: string;
}

const SimGroupMembersTable: React.FC<Props> = ({ groupId }) => {
  const [msisdnFilter, setMsisdnFilter] = useState("");
  const [debouncedFilter, setDebouncedFilter] = useState("");
  const [sort, setSort] = useState<string | undefined>(undefined);
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 10,
    showSizeChanger: true,
    pageSizeOptions: ["10", "20", "50"],
  });

  const applyDebounce = useMemo(
    () =>
      debounce((value: string) => {
        setDebouncedFilter(value);
        setPagination((prev) => ({ ...prev, current: 1 }));
      }, 500),
    [],
  );

  const applyDebounceRef = useRef(applyDebounce);
  applyDebounceRef.current = applyDebounce;
  React.useEffect(() => () => applyDebounceRef.current.cancel(), []);

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setMsisdnFilter(e.target.value);
      applyDebounce(e.target.value);
    },
    [applyDebounce],
  );

  const queryParams: QueryGroupMembersParams = {
    page: pagination?.current,
    pageSize: pagination?.pageSize,
    msisdn: debouncedFilter,
    sort,
  };

  const { data, isLoading } = useSimGroupMembers(groupId, queryParams);

  return (
    <div>
      <Input
        placeholder="Tìm số điện thoại..."
        prefix={<SearchOutlined />}
        value={msisdnFilter}
        onChange={handleSearch}
        onClear={() => {
          setMsisdnFilter("");
          applyDebounce("");
        }}
        disabled={isLoading}
        allowClear
        style={{ marginBottom: 12 }}
      />
      <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
        {data?.total ?? 0} thành viên trong nhóm này
      </Text>
      <Table<SimCard>
        dataSource={data?.data}
        columns={columns}
        rowKey={(r) => r.id}
        loading={isLoading}
        size="small"
        pagination={{ ...pagination, total: data?.total }}
        onChange={(pag, _filters, sorter) => {
          setPagination(pag);
          const s = Array.isArray(sorter)
            ? sorter[0]
            : (sorter as SorterResult<SimCard>);
          if (s.columnKey && s.order) {
            setSort(
              `${String(s.columnKey)}:${s.order === "ascend" ? "asc" : "desc"}`,
            );
          } else {
            setSort(undefined);
          }
        }}
      />
    </div>
  );
};

export default SimGroupMembersTable;
