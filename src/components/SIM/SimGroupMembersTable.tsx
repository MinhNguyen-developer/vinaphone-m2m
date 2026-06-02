import React, { useCallback, useMemo, useRef, useState } from "react";
import { Table, Tag, Typography, Input, Select, message } from "antd";
import type { TablePaginationConfig } from "antd";
import type { SorterResult } from "antd/es/table/interface";
import { EditOutlined, SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import debounce from "lodash/debounce";
import type { QueryGroupMembersParams, SimCard } from "../../types";
import {
  useSimGroupMembers,
  useUpdateSimNote,
  usePatchSim,
} from "../../hooks/useSims";
import { VIN_STATUS_OPTIONS } from "../../utils/constants";
import formatNumber from "../../utils/formatNumber";

const { Text } = Typography;

function getSortOrder(
  sort: string | undefined,
  key: string,
): "ascend" | "descend" | null {
  if (!sort) return null;
  const [field, dir] = sort.split(":");
  if (field !== key) return null;
  return dir === "asc" ? "ascend" : "descend";
}

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
  // Track which row's status cell is in edit mode
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);

  const { mutate: updateNote } = useUpdateSimNote();
  const { mutate: patchSim } = usePatchSim();

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

  const columns: ColumnsType<SimCard> = [
    {
      title: "Số điện thoại",
      dataIndex: "phoneNumber",
      key: "phoneNumber",
      sorter: true,
      sortOrder: getSortOrder(sort, "phoneNumber"),
      render: (v) => <Text strong>{v}</Text>,
      fixed: "left",
    },
    {
      title: "IMSI",
      dataIndex: "imsi",
      key: "imsi",
      sorter: true,
      sortOrder: getSortOrder(sort, "imsi"),
      render: (v: string | null) =>
        v ? (
          <Text
            copyable={{ text: v }}
            style={{ fontSize: 11, fontFamily: "monospace" }}
          >
            {v.slice(-10)}
          </Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Mã SIM",
      key: "simCode",
      sorter: true,
      sortOrder: getSortOrder(sort, "simCodeLabel"),
      render: (_: unknown, r: SimCard) =>
        r.simCode ? (
          <Tag color="orange">{r.simCode.code}</Tag>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Dung lượng",
      dataIndex: "usedMB",
      key: "usedMB",
      sorter: true,
      sortOrder: getSortOrder(sort, "usedMB"),
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
      sorter: true,
      sortOrder: getSortOrder(sort, "status"),
      render: (v, record) => {
        const isEditing = editingStatusId === record.id;
        const opt = VIN_STATUS_OPTIONS.find((o) => o.value === v);

        if (isEditing) {
          return (
            <Select
              autoFocus
              size="small"
              defaultValue={v}
              style={{ width: 150 }}
              options={VIN_STATUS_OPTIONS.map((o) => ({
                value: o.value,
                label: (
                  <span style={{ color: o.color }}>
                    {o.icon} {o.label}
                  </span>
                ),
              }))}
              onChange={(next) => {
                if (next !== v) {
                  patchSim(
                    { id: record.id, data: { status: next } },
                    {
                      onSuccess: () =>
                        message.success("Đã cập nhật trạng thái"),
                      onError: () =>
                        message.error("Cập nhật trạng thái thất bại!"),
                    },
                  );
                }
                setEditingStatusId(null);
              }}
              onBlur={() => setEditingStatusId(null)}
            />
          );
        }

        return (
          <span
            style={{
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
            onClick={() => setEditingStatusId(record.id)}
          >
            {opt ? (
              <Tag color={opt.color} icon={opt.icon}>
                {opt.label}
              </Tag>
            ) : (
              <Tag>{v ?? "—"}</Tag>
            )}
            <EditOutlined style={{ fontSize: 11, color: "#999" }} />
          </span>
        );
      },
    },
    {
      title: "Ghi chú",
      dataIndex: "note",
      key: "note",
      sorter: true,
      sortOrder: getSortOrder(sort, "note"),
      render: (v, record) => (
        <Text
          editable={{
            tooltip: "Nhấn để sửa",
            text: v ?? "",
            onChange: (next) => {
              const trimmed = next.trim() || null;
              if ((trimmed ?? "") !== (v ?? "")) {
                updateNote(
                  { id: record.id, note: trimmed },
                  { onError: () => message.error("Lưu ghi chú thất bại!") },
                );
              }
            },
          }}
        >
          {v || ""}
        </Text>
      ),
    },
  ];

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
        rowKey={(r) => r.id ?? r.phoneNumber}
        loading={isLoading}
        size="small"
        scroll={{
          x: "max-content",
        }}
        pagination={{ ...pagination, total: data?.total }}
        onChange={(pag, _filters, sorter) => {
          setPagination(pag);
          const s = Array.isArray(sorter)
            ? sorter[0]
            : (sorter as SorterResult<SimCard>);
          if (s.columnKey && s.order) {
            const key =
              s.columnKey === "simCode" ? "simCodeLabel" : String(s.columnKey);
            setSort(`${key}:${s.order === "ascend" ? "asc" : "desc"}`);
          } else {
            setSort(undefined);
          }
        }}
      />
    </div>
  );
};

export default SimGroupMembersTable;
