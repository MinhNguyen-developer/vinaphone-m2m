import React, { useEffect, useMemo, useState } from "react";
import { Table, Select, Tag, Space, Typography, Card, Spin, Empty } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import type {
  ColumnsType,
  TablePaginationConfig,
  SorterResult,
} from "antd/es/table/interface";

import type { MonthlyDataUsage, SimCard } from "../types";
import { useSims, useSimUsageHistory } from "../hooks/useSims";
import { formatMB } from "../utils";
import { useRatingPlans } from "../hooks/useRatingPlans";
import { type FilterField, useFilters } from "../hooks/useFilters";
import { useGroupSims } from "../hooks/useGroupSims";
import { DebouncedInput } from "../components/DebouncedInput";
import { VIN_STATUS_OPTIONS } from "../utils/constants";

const { Title, Text } = Typography;

// ─── Metric rows definition ───────────────────────────────────────────────

const METRICS: { key: keyof MonthlyDataUsage; label: string }[] = [
  { key: "dataUsedMB", label: "Data đã dùng (MB)" },
  { key: "totalData", label: "Tổng Data (MB)" },
  { key: "smsNoiMangUsed", label: "SMS nội mạng đã dùng" },
  { key: "totalSmsNoiMang", label: "Tổng SMS nội mạng" },
  { key: "smsNgoaiMangUsed", label: "SMS ngoại mạng đã dùng" },
  { key: "totalSmsNgoaiMang", label: "Tổng SMS ngoại mạng" },
  { key: "smsQuocTeUsed", label: "SMS quốc tế đã dùng" },
  { key: "totalSmsQuocTe", label: "Tổng SMS quốc tế" },
];

// ─── Expanded row component (calls hook per SIM) ──────────────────────────

const UsageHistoryPanel: React.FC<{ phoneNumber: string }> = ({
  phoneNumber,
}) => {
  const { data, isLoading } = useSimUsageHistory(phoneNumber);

  if (isLoading)
    return (
      <Spin size="small" style={{ display: "block", margin: "16px auto" }} />
    );

  const history = [...(data?.history ?? [])].sort((a, b) =>
    a.month.localeCompare(b.month),
  );

  if (history.length === 0)
    return (
      <Empty
        description="Không có dữ liệu lịch sử"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        style={{ margin: "16px 0" }}
      />
    );

  // Each row = one metric; each column = one month
  const dataSource = METRICS.map((m) => ({
    key: m.key,
    metric: m.label,
    ...Object.fromEntries(history.map((h) => [h.month, h[m.key] ?? "—"])),
  }));

  const columns: ColumnsType<Record<string, unknown>> = [
    {
      title: "Chỉ số",
      dataIndex: "metric",
      key: "metric",
      fixed: "left",
      width: 220,
      render: (v) => <Text strong>{v}</Text>,
    },
    ...history.map((h) => ({
      title: h.month,
      dataIndex: h.month,
      key: h.month,
      align: "right" as const,
      width: 110,
      render: (v: unknown) =>
        typeof v === "number" ? (
          <Text>{v.toLocaleString()}</Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    })),
  ];

  return (
    <div style={{ padding: "8px 8px 8px 48px" }}>
      <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
        SIM: <strong>{phoneNumber}</strong>
        {data?.imsi ? ` · IMSI: ${data.imsi}` : ""}
      </Text>
      <Table
        dataSource={dataSource}
        columns={columns}
        pagination={false}
        size="small"
        scroll={{ x: "max-content" }}
        bordered
        rowKey="key"
      />
    </div>
  );
};

// ─── Filter keys ──────────────────────────────────────────────────────────

const ALL_FILTER_KEYS = [
  "search",
  "msisdn",
  "imsi",
  "contractCode",
  "ratingPlanId",
  "status",
  "simType",
  "dateRange",
  "groupName",
  "sort",
  "sogIsOwner",
] as const;
type FilterKey = (typeof ALL_FILTER_KEYS)[number];

const VISIBLE_FILTER_KEYS = ALL_FILTER_KEYS.filter(
  (k) => k !== "sort",
) as FilterKey[];

// ─── Component ────────────────────────────────────────────────────────────

const UsageHistory: React.FC = () => {
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    pageSize: 10,
    current: 1,
    pageSizeOptions: ["10", "20", "50", "100"],
    showSizeChanger: true,
  });
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);

  const handleTableChange = (
    newPagination: TablePaginationConfig,
    _filters: Record<string, unknown>,
    sorter: SorterResult<SimCard> | SorterResult<SimCard>[],
  ) => {
    setPagination(newPagination);
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    const sortValue =
      s.columnKey && s.order
        ? `${String(s.columnKey)}:${s.order === "ascend" ? "asc" : "desc"}`
        : undefined;
    setFilterValue("sort", sortValue ?? "");
  };

  const { data: ratingPlansData } = useRatingPlans({ page: 1, pageSize: 1000 });
  const { data: groupSimsData } = useGroupSims({ page: 1, pageSize: 10 });

  const filterFields = useMemo<FilterField<FilterKey, any>[]>(
    () => [
      {
        filterKey: "search",
        label: "Từ khóa",
        colSpan: { xs: 24, sm: 12, md: 6, lg: 4 },
        render: (value, onChange) => (
          <DebouncedInput
            placeholder="Tìm kiếm (SĐT/IMSI/hợp đồng…)"
            prefix={<SearchOutlined />}
            value={(value as string) ?? ""}
            onChange={onChange}
          />
        ),
      },
      {
        filterKey: "status",
        label: "Trạng thái",
        colSpan: { xs: 24, sm: 12, md: 4, lg: 3 },
        render: (value, onChange) => (
          <Select
            style={{ width: "100%" }}
            value={value as string}
            onChange={(v) => onChange(v)}
            placeholder="Trạng thái"
            allowClear
            options={VIN_STATUS_OPTIONS.map((o) => ({
              label: o.label,
              value: o.value,
            }))}
          />
        ),
        toUrlParams: (v) => ({ status: v != null ? String(v) : undefined }),
        fromUrlParams: (p) => p.get("status") ?? undefined,
      },
      {
        filterKey: "sort",
        label: "Sắp xếp",
        render: () => null,
      },
    ],
    [ratingPlansData, groupSimsData],
  );

  const { filterValues, filterBar, filterToolbox, setFilterValue } =
    useFilters<FilterKey>({
      fields: filterFields,
      storageKey: "usage-history-filters",
      defaultVisibleKeys: VISIBLE_FILTER_KEYS,
    });

  // Reset to page 1 when non-sort filters change
  const nonSortFilterKey = JSON.stringify(
    Object.fromEntries(
      Object.entries(filterValues).filter(([k]) => k !== "sort"),
    ),
  );
  useEffect(() => {
    setPagination((prev) => ({ ...prev, current: 1 }));
    setExpandedRowKeys([]);
  }, [nonSortFilterKey]);

  const queryParams = useMemo(() => {
    const toNum = (v: unknown) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };
    return {
      search: (filterValues.search as string) || undefined,
      msisdn: (filterValues.msisdn as string) || undefined,
      status: toNum(filterValues.status),
      pageSize: pagination.pageSize,
      page: pagination.current,
      sort: (filterValues.sort as string) || undefined,
    };
  }, [filterValues, pagination]);

  const {
    data: simsData,
    isLoading,
    isFetching,
    isRefetching,
  } = useSims(queryParams);

  const sims = simsData?.data ?? [];

  const columns: ColumnsType<SimCard> = [
    {
      title: "Số điện thoại",
      dataIndex: "phoneNumber",
      key: "phoneNumber",
      sorter: true,
      sortOrder: (filterValues.sort as string)?.startsWith("phoneNumber:")
        ? (filterValues.sort as string).endsWith(":asc")
          ? "ascend"
          : "descend"
        : null,
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (v: number) => {
        const s = VIN_STATUS_OPTIONS.find((o) => o.value === v);
        return s ? (
          <Tag color={s.color} icon={s.icon}>
            {s.label}
          </Tag>
        ) : (
          <Text>{v}</Text>
        );
      },
    },
    {
      title: "Dung lượng",
      dataIndex: "usedMB",
      key: "usedMB",
      sorter: true,
      sortOrder: (filterValues.sort as string)?.startsWith("usedMB:")
        ? (filterValues.sort as string).endsWith(":asc")
          ? "ascend"
          : "descend"
        : null,
      render: (v: number) => formatMB(v),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          📅 Lịch sử sử dụng dung lượng
        </Title>
        <Space wrap>{filterToolbox}</Space>
      </div>

      <Card style={{ marginBottom: 12 }}>{filterBar}</Card>

      <Card>
        <Text style={{ display: "block", marginBottom: 10 }}>
          Hiển thị <strong>{sims.length}</strong> /{" "}
          {simsData?.total ?? sims.length} SIM ·{" "}
          <Text type="secondary">Click vào dòng để xem lịch sử theo tháng</Text>
        </Text>
        <Table
          dataSource={sims}
          columns={columns}
          rowKey="id"
          size="small"
          scroll={{ x: "max-content" }}
          pagination={{ ...pagination, total: simsData?.total ?? 0 }}
          onChange={handleTableChange}
          loading={isLoading || isFetching || isRefetching}
          expandable={{
            expandedRowKeys,
            onExpand: (expanded, record) => {
              setExpandedRowKeys(
                expanded
                  ? [...expandedRowKeys, record.id]
                  : expandedRowKeys.filter((k) => k !== record.id),
              );
            },
            expandedRowRender: (record) => (
              <UsageHistoryPanel phoneNumber={record.phoneNumber} />
            ),
          }}
          onRow={(record) => ({
            onClick: () => {
              const isExpanded = expandedRowKeys.includes(record.id);
              setExpandedRowKeys(
                isExpanded
                  ? expandedRowKeys.filter((k) => k !== record.id)
                  : [...expandedRowKeys, record.id],
              );
            },
            style: { cursor: "pointer" },
          })}
        />
      </Card>
    </div>
  );
};

export default UsageHistory;
