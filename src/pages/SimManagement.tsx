import React, { useMemo, useState } from "react";
import {
  Table,
  Select,
  Tag,
  Space,
  Typography,
  Card,
  Button,
  Tooltip,
  message,
  DatePicker,
  Badge,
} from "antd";
import {
  SearchOutlined,
  DownloadOutlined,
  ExportOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import type {
  ColumnsType,
  TablePaginationConfig,
  TableRowSelection,
  SorterResult,
} from "antd/es/table/interface";

import dayjs from "dayjs";
import * as XLSX from "xlsx";
import type { SimCard } from "../types";
import { useSims } from "../hooks/useSims";
import { useAlerts, useTriggeredAlerts } from "../hooks/useAlerts";
import { formatMB, getUsageColor } from "../utils";
import SimStatusBadge from "../components/SIM/SimStatusBadge";
import SimMasterMembersModal from "../components/SIM/SimMasterMembersModal";
import SimGroupMembersModal from "../components/SIM/SimGroupMembersModal";
import { useRatingPlans } from "../hooks/useRatingPlans";
import { useColumns } from "../hooks/useColumns";
import { type FilterField, useFilters } from "../hooks/useFilters";
import { useGroupSims } from "../hooks/useGroupSims";
import { DebouncedInput } from "../components/DebouncedInput";
import { CustomTableFilter } from "../components/CustomTableFilter";
import { SyncPanel } from "../components/SyncPanel";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// ─── Column keys ────────────────────────────────────────────────────────────

const ALL_COLUMN_KEYS = [
  "phone",
  "imsi",
  "iccid",
  "groupName",
  "contract",
  "contractInfo",
  "ratingPlan",
  "sogMembership",
  "sogMembers",
  "customer",
  "customerCode",
  "province",
  "status",
  "vinStatus",
  "connection",
  "usedMB",
  "activated",
  "simType",
  "apn",
  "ip",
  "imei",
  "note",
] as const;
type ColumnKey = (typeof ALL_COLUMN_KEYS)[number];

const COLUMN_LABELS: Record<ColumnKey, string> = {
  phone: "Số điện thoại",
  imsi: "IMSI",
  iccid: "ICCID",
  groupName: "Nhóm thuê bao",
  contract: "Mã hợp đồng",
  contractInfo: "Người làm hợp đồng",
  ratingPlan: "Gói cước",
  sogMembership: "Loại gói cước",
  sogMembers: "Thuê bao thành viên",
  customer: "Khách hàng",
  customerCode: "Mã KH",
  province: "Tỉnh/TP",
  status: "Trạng thái (QL)",
  vinStatus: "Trạng thái (VTN)",
  connection: "Kết nối",
  usedMB: "Dung lượng",
  activated: "Kích hoạt",
  simType: "Loại SIM",
  apn: "APN",
  ip: "IP",
  imei: "IMEI",
  note: "Ghi chú",
};

const DEFAULT_VISIBLE: ColumnKey[] = [
  "phone",
  "imsi",
  "contract",
  "ratingPlan",
  "sogMembership",
  "sogMembers",
  "customer",
  "status",
  "vinStatus",
  "connection",
  "usedMB",
  "activated",
];

const STORAGE_KEY = "sim-column-visibility";

// ─── Filter keys ──────────────────────────────────────────────────────────

const ALL_FILTER_KEYS = [
  "search",
  "msisdn",
  "imsi",
  "contractCode",
  "contractor",
  "customer",
  "provinceCode",
  "ratingPlanId",
  "status",
  "simType",
  "dateRange",
  "groupName",
  "sort",
] as const;
type FilterKey = (typeof ALL_FILTER_KEYS)[number];

// Filter keys shown in the toolbox checkbox list (sort is internal, not user-visible)
const VISIBLE_FILTER_KEYS = ALL_FILTER_KEYS.filter(
  (k) => k !== "sort",
) as FilterKey[];

// ─── Export ───────────────────────────────────────────────────────────────

const exportXLSX = (data: SimCard[], filename: string) => {
  const rows = data.map((s) => ({
    "Số điện thoại": s.phoneNumber,
    IMSI: s.imsi ?? "",
    ICCID: s.iccid ?? "",
    "Mã hợp đồng": s.contractCode ?? "",
    "Gói cước": s.ratingPlanName ?? s.productCode,
    "Khách hàng": s.customerName ?? "",
    "Mã KH": s.customerCode ?? "",
    "Tỉnh/TP": s.provinceCode ?? "",
    "Trạng thái (QL)": s.status,
    "Trạng thái (VTN)": s.vinaphoneStatus ?? "",
    "Kết nối": s.connectionStatus ?? "",
    "Dung lượng (MB)": s.usedMB,
    "Kích hoạt": s.activatedDate ?? s.firstUsedAt ?? "",
    "Loại SIM": s.simType ?? "",
    "Ghi chú": s.note ?? "",
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "SIM");
  XLSX.writeFile(wb, filename);
  message.success(`Đã xuất ${data.length} SIM → ${filename}`);
};

// ─── Status options ───────────────────────────────────────────────────────

const VIN_STATUS_OPTIONS = [
  { value: "1", label: "Mới" },
  { value: "2", label: "Đang hoạt động" },
  { value: "3", label: "Tạm khoá" },
  { value: "4", label: "Huỷ" },
];

// ─── Component ────────────────────────────────────────────────────────────

const SimManagement: React.FC = () => {
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    pageSize: 10,
    current: 1,
    pageSizeOptions: ["10", "20", "50", "100"],
    showSizeChanger: true,
  });

  const handleTableChange = (
    newPagination: TablePaginationConfig,
    _filters: Record<string, unknown>,
    sorter: SorterResult<SimCard> | SorterResult<SimCard>[],
  ) => {
    setPagination(newPagination);
    // Build sort string: "field:asc" | "field:desc" | undefined
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    const sortValue =
      s.columnKey && s.order
        ? `${String(s.columnKey)}:${s.order === "ascend" ? "asc" : "desc"}`
        : undefined;
    setFilterValue("sort", sortValue ?? "");
  };

  // ── Rating plans (needed for filter dropdown options) ─────────────────
  const { data: ratingPlansData } = useRatingPlans({ page: 1, pageSize: 1000 });

  // --- Group sims (needed for filter dropdown options) ---──────────────
  const { data: groupSimsData } = useGroupSims({ page: 1, pageSize: 10 });

  // ── Filter fields (render closures capture reactive data like ratingPlansData)
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
        filterKey: "msisdn",
        label: "MSISDN",

        colSpan: { xs: 24, sm: 12, md: 5, lg: 3 },
        render: (value, onChange) => (
          <DebouncedInput
            placeholder="MSISDN"
            value={(value as string) ?? ""}
            onChange={onChange}
          />
        ),
      },
      {
        filterKey: "imsi",
        label: "IMSI",

        colSpan: { xs: 24, sm: 12, md: 5, lg: 3 },
        render: (value, onChange) => (
          <DebouncedInput
            placeholder="IMSI"
            value={(value as string) ?? ""}
            onChange={onChange}
          />
        ),
      },
      {
        filterKey: "groupName",
        label: "Nhóm thuê bao",
        colSpan: { xs: 24, sm: 12, md: 5, lg: 3 },
        render: (value, onChange) => (
          <Select
            style={{ width: "100%" }}
            placeholder="Nhóm thuê bao"
            value={value as string}
            onChange={(e) => onChange(e)}
            allowClear
            options={
              groupSimsData?.data.map((group) => ({
                label: group.name,
                value: group.name,
              })) ?? []
            }
          />
        ),
      },
      {
        filterKey: "contractCode",
        label: "Mã hợp đồng",

        colSpan: { xs: 24, sm: 12, md: 5, lg: 3 },
        render: (value, onChange) => (
          <DebouncedInput
            placeholder="Mã hợp đồng"
            value={(value as string) ?? ""}
            onChange={onChange}
          />
        ),
      },
      {
        filterKey: "contractor",
        label: "Người ký HĐ",

        colSpan: { xs: 24, sm: 12, md: 5, lg: 3 },
        render: (value, onChange) => (
          <DebouncedInput
            placeholder="Người ký HĐ"
            value={(value as string) ?? ""}
            onChange={onChange}
          />
        ),
      },
      {
        filterKey: "customer",
        label: "Khách hàng",

        colSpan: { xs: 24, sm: 12, md: 5, lg: 4 },
        render: (value, onChange) => (
          <DebouncedInput
            placeholder="Khách hàng"
            value={(value as string) ?? ""}
            onChange={onChange}
          />
        ),
      },
      {
        filterKey: "provinceCode",
        label: "Tỉnh/TP",

        colSpan: { xs: 24, sm: 12, md: 4, lg: 3 },
        render: (value, onChange) => (
          <DebouncedInput
            placeholder="Tỉnh/TP"
            value={(value as string) ?? ""}
            onChange={onChange}
          />
        ),
      },
      {
        filterKey: "ratingPlanId",
        label: "Gói cước",
        colSpan: { xs: 24, sm: 12, md: 4, lg: 3 },
        render: (value, onChange) => (
          <Select
            placeholder="Gói cước"
            value={(value as string) || undefined}
            popupMatchSelectWidth={200}
            onChange={(v) => onChange(v)}
            allowClear
            style={{ width: "100%" }}
            options={
              ratingPlansData?.data.map((rp) => ({
                label: `${rp.name} - (${rp.code})`,
                value: rp.ratingPlanId,
              })) ?? []
            }
          />
        ),
        toUrlParams: (v) => ({
          ratingPlanId: v != null ? String(v) : undefined,
        }),
        fromUrlParams: (p) => p.get("ratingPlanId") ?? undefined,
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
        filterKey: "simType",
        label: "Loại SIM",
        colSpan: { xs: 24, sm: 12, md: 4, lg: 3 },
        render: (value, onChange) => (
          <Select
            style={{ width: "100%" }}
            value={value}
            onChange={(v) => onChange(v)}
            placeholder="Loại SIM"
            allowClear
            options={[
              {
                label: "Sim M2M",
                value: "0",
              },
              {
                label: "eSIM",
                value: "1",
              },
            ]}
          />
        ),
        toUrlParams: (v) => ({ simType: v != null ? String(v) : undefined }),
        fromUrlParams: (p) => p.get("simType") ?? undefined,
      },
      {
        filterKey: "dateRange",
        label: "Ngày kích hoạt",
        defaultValue: [null, null] as [dayjs.Dayjs | null, dayjs.Dayjs | null],
        colSpan: { xs: 24, sm: 24, md: 10, lg: 8 },
        render: (value, onChange) => (
          <RangePicker
            style={{ width: "100%" }}
            value={value as [dayjs.Dayjs | null, dayjs.Dayjs | null]}
            onChange={(v) => onChange(v ? [v[0], v[1]] : [null, null])}
            placeholder={["Từ ngày kích hoạt", "Đến ngày"]}
            format="DD/MM/YYYY"
          />
        ),
        toUrlParams: (v) => {
          const dr = v as [dayjs.Dayjs | null, dayjs.Dayjs | null];
          return {
            dateFrom: dr[0]?.format("YYYY-MM-DD"),
            dateTo: dr[1]?.format("YYYY-MM-DD"),
          };
        },
        fromUrlParams: (p) =>
          [
            p.get("dateFrom") ? dayjs(p.get("dateFrom")!) : null,
            p.get("dateTo") ? dayjs(p.get("dateTo")!) : null,
          ] as [dayjs.Dayjs | null, dayjs.Dayjs | null],
      },
      // Hidden field — not shown in toolbox, only used for URL sync
      {
        filterKey: "sort",
        label: "Sắp xếp",
        render: () => null,
      },
    ],
    [ratingPlansData, groupSimsData],
  );

  // ── Filters hook (manages state + URL sync + field visibility) ─────────
  const { filterValues, filterBar, filterToolbox, setFilterValue } =
    useFilters<FilterKey>({
      fields: filterFields,
      storageKey: "sim-filters",
      defaultVisibleKeys: VISIBLE_FILTER_KEYS,
    });

  // ── Data fetching ─────────────────────────────────────────────────────
  const queryParams = useMemo(() => {
    const toNum = (v: unknown) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };
    const dr = filterValues.dateRange as [
      dayjs.Dayjs | null,
      dayjs.Dayjs | null,
    ];
    return {
      search: (filterValues.search as string) || undefined,
      msisdn: (filterValues.msisdn as string) || undefined,
      imsi: (filterValues.imsi as string) || undefined,
      contractCode: (filterValues.contractCode as string) || undefined,
      contractor: (filterValues.contractor as string) || undefined,
      customer: (filterValues.customer as string) || undefined,
      status: toNum(filterValues.status),
      provinceCode: (filterValues.provinceCode as string) || undefined,
      ratingPlanId: toNum(filterValues.ratingPlanId),
      simType: toNum(filterValues.simType),
      dateFrom: dr[0]?.format("YYYY-MM-DD"),
      dateTo: dr[1]?.format("YYYY-MM-DD"),
      pageSize: pagination.pageSize,
      page: pagination.current,
      groupName: (filterValues.groupName as string) || undefined,
      sort: (filterValues.sort as string) || undefined,
    };
  }, [filterValues, pagination]);

  const {
    data: simsData,
    isLoading,
    isFetching,
    isRefetching,
  } = useSims(queryParams);
  const alerts = useAlerts().data ?? [];
  const { data: triggeredData } = useTriggeredAlerts();

  const sims = simsData?.data ?? [];

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [modalSim, setModalSim] = useState<SimCard | null>(null);
  const [groupModalId, setGroupModalId] = useState<string | null>(null);
  const [groupModalName, setGroupModalName] = useState<string | null>(null);

  const alertSimIds = useMemo(() => {
    const ids = new Set<string>();
    triggeredData?.data.forEach((t) => ids.add(t.sim.id));
    return ids;
  }, [triggeredData]);

  // ── Column definitions ────────────────────────────────────────────────
  const allColumns: (ColumnsType<SimCard>[number] & { colKey: ColumnKey })[] = [
    {
      colKey: "phone",
      title: "Số điện thoại",
      dataIndex: "phoneNumber",
      key: "phoneNumber",
      fixed: "left",
      width: 145,
      sorter: true,
      sortOrder: (filterValues.sort as string)?.startsWith("phoneNumber:")
        ? (filterValues.sort as string).endsWith(":asc")
          ? "ascend"
          : "descend"
        : null,
      render: (v, record) => (
        <Space size={4}>
          {alertSimIds.has(record.id) && <Badge status="error" />}
          <Text
            strong
            style={{ color: "#1677ff", cursor: "pointer" }}
            onClick={() => setModalSim(record)}
          >
            {v}
          </Text>
        </Space>
      ),
      filterDropdown: ({ confirm, close }) => (
        <CustomTableFilter
          filterKey="search"
          setFilterValue={setFilterValue}
          close={close}
          confirm={confirm}
        />
      ),
      filterIcon: () => (
        <SearchOutlined
          style={{ color: !!filterValues.search ? "#1677ff" : undefined }}
        />
      ),
    },
    {
      colKey: "imsi",
      title: "IMSI",
      dataIndex: "imsi",
      key: "imsi",
      width: 155,
      render: (v) =>
        v ? (
          <Text code style={{ fontSize: 11 }}>
            {v}
          </Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      colKey: "iccid",
      title: "ICCID",
      dataIndex: "iccid",
      key: "iccid",
      width: 155,
      render: (v) =>
        v ? (
          <Text code style={{ fontSize: 11 }}>
            {v}
          </Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      colKey: "groupName",
      title: "Nhóm thuê bao",
      dataIndex: "groupName",
      key: "groupName",
      width: 180,
      render: (v) =>
        v ? <Tag color="purple">{v}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      colKey: "contract",
      title: "Mã hợp đồng",
      dataIndex: "contractCode",
      key: "contract",
      width: 160,
      render: (v) =>
        v ? <Tag color="geekblue">{v}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      colKey: "ratingPlan",
      title: "Gói cước",
      dataIndex: "ratingPlanName",
      key: "ratingPlan",
      width: 190,
      render: (v, r) =>
        (v ?? r.productCode) ? (
          <Tag color="blue">{v ?? r.productCode}</Tag>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      colKey: "customer",
      title: "Khách hàng",
      dataIndex: "customerName",
      key: "customer",
      width: 200,
      ellipsis: true,
      render: (v) => v ?? <Text type="secondary">—</Text>,
    },
    {
      colKey: "customerCode",
      title: "Mã KH",
      dataIndex: "customerCode",
      key: "customerCode",
      width: 140,
      render: (v) => v ?? <Text type="secondary">—</Text>,
    },
    {
      colKey: "contractInfo",
      title: "Người làm hợp đồng",
      dataIndex: "contractInfo",
      key: "contractInfo",
      width: 200,
      render: (v) => <Text>{v ?? "—"}</Text>,
    },
    {
      colKey: "province",
      title: "Tỉnh/TP",
      dataIndex: "provinceCode",
      key: "province",
      width: 80,
      render: (v) => v ?? <Text type="secondary">—</Text>,
    },
    {
      colKey: "status",
      title: "Trạng thái (QL)",
      dataIndex: "status",
      key: "status",
      width: 150,
      render: (v) => <SimStatusBadge status={v} />,
    },
    {
      colKey: "vinStatus",
      title: "Trạng thái (VTN)",
      dataIndex: "vinaphoneStatus",
      key: "vinStatus",
      width: 145,
      render: (v) => {
        if (v == null) return <Text type="secondary">—</Text>;
        const colors: Record<number, string> = {
          1: "default",
          2: "green",
          3: "orange",
          4: "red",
        };
        const labels: Record<number, string> = {
          1: "Mới",
          2: "Hoạt động",
          3: "Tạm khoá",
          4: "Huỷ",
        };
        return (
          <Tag color={colors[v as number] ?? "default"}>
            {labels[v as number] ?? v}
          </Tag>
        );
      },
    },
    {
      colKey: "connection",
      title: "Kết nối",
      dataIndex: "connectionStatus",
      key: "connection",
      width: 100,
      render: (v) => {
        if (!v) return <Text type="secondary">—</Text>;
        const color = v === "ON" ? "green" : v === "OFF" ? "red" : "default";
        return <Tag color={color}>{v}</Tag>;
      },
    },
    {
      colKey: "usedMB",
      title: "Dung lượng",
      dataIndex: "usedMB",
      key: "usedMB",
      width: 130,
      sorter: true,
      sortOrder: (filterValues.sort as string)?.startsWith("usedMB:")
        ? (filterValues.sort as string).endsWith(":asc")
          ? "ascend"
          : "descend"
        : null,
      render: (v, record) => {
        const relevantAlerts = alerts.filter(
          (a) =>
            a.active &&
            (a.simId === record.id ||
              (a.groupId && (record.groupIds ?? []).includes(a.groupId)) ||
              (a.productCode && a.productCode === record.productCode)),
        );
        const maxThreshold = relevantAlerts.length
          ? Math.max(...relevantAlerts.map((a) => a.thresholdMB))
          : 0;
        const pct =
          maxThreshold > 0
            ? Math.min(Math.round((v / maxThreshold) * 100), 100)
            : 0;
        return <Text style={{ color: getUsageColor(pct) }}>{formatMB(v)}</Text>;
      },
    },
    {
      colKey: "activated",
      title: "Kích hoạt",
      dataIndex: "activatedDate",
      key: "activated",
      width: 145,
      render: (v, r) => {
        const d = v ?? r.firstUsedAt;
        return d ? (
          dayjs(d).format("DD/MM/YYYY")
        ) : (
          <Text type="secondary">Chưa có</Text>
        );
      },
    },
    {
      colKey: "simType",
      title: "Loại SIM",
      dataIndex: "simType",
      key: "simType",
      width: 90,
      render: (v) =>
        v != null ? (
          <Tag>{v === 0 ? "M2M" : "eSIM"}</Tag>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      colKey: "apn",
      title: "APN",
      dataIndex: "apnName",
      key: "apn",
      width: 110,
      render: (v) => v ?? <Text type="secondary">—</Text>,
    },
    {
      colKey: "ip",
      title: "IP",
      dataIndex: "ip",
      key: "ip",
      width: 120,
      render: (v) => v ?? <Text type="secondary">—</Text>,
    },
    {
      colKey: "imei",
      title: "IMEI",
      dataIndex: "imei",
      key: "imei",
      width: 155,
      render: (v) =>
        v ? (
          <Text code style={{ fontSize: 11 }}>
            {v}
          </Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      colKey: "note",
      title: "Ghi chú",
      dataIndex: "note",
      key: "note",
      width: 150,
      render: (v) => v ?? <Text type="secondary">—</Text>,
    },
    {
      colKey: "sogMembership",
      title: "Loại gói cước",
      key: "sogMembership",
      width: 140,
      render: (_v, record) => {
        if (record.sogIsOwner == null) return <Text type="secondary">—</Text>;
        return record.sogIsOwner ? (
          <Tag color="gold">Chủ nhóm</Tag>
        ) : (
          <Tag color="cyan">Thành viên</Tag>
        );
      },
    },
    {
      colKey: "sogMembers",
      title: "Thuê bao thành viên",
      key: "sogMembers",
      width: 180,
      render: (_v, record) => {
        if (!record.sogGroupId || record.sogIsOwner !== true)
          return <Text type="secondary">—</Text>;
        return (
          <Button
            size="small"
            icon={<TeamOutlined />}
            onClick={() => {
              setGroupModalId(record.sogGroupId!);
              setGroupModalName(record.sogGroupName ?? null);
            }}
          >
            Xem thành viên
          </Button>
        );
      },
    },
  ];

  const { tableColumns: columns, popover: columnPickerButton } = useColumns({
    allColumns,
    localStorageKey: STORAGE_KEY,
    allColumnsKeys: ALL_COLUMN_KEYS,
    columnLabels: COLUMN_LABELS,
    defaultVisibleKeys: DEFAULT_VISIBLE,
  });

  // ── Export ────────────────────────────────────────────────────────────
  const rowSelection: TableRowSelection<SimCard> = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
  };

  const handleExport = (exportAll: boolean) => {
    if (!exportAll && selectedRowKeys.length === 0) {
      message.warning("Vui lòng tích chọn ít nhất 1 SIM!");
      return;
    }
    const data = exportAll
      ? sims
      : sims.filter((s) => selectedRowKeys.includes(s.id));
    exportXLSX(data, `sim-m2m-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // ── Column picker popover ─────────────────────────────────────────────
  // (managed by useColumns hook — exposes `columnPickerButton`)

  return (
    <div>
      {/* Header */}
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
          📱 Danh sách SIM M2M
        </Title>
        <Space wrap>
          {filterToolbox}
          {columnPickerButton}
          <Tooltip title="Xuất tất cả SIM trong bộ lọc hiện tại">
            <Button
              icon={<DownloadOutlined />}
              onClick={() => handleExport(true)}
            >
              Xuất ({sims.length})
            </Button>
          </Tooltip>
          <Tooltip title="Xuất các SIM đang được tích chọn">
            <Button
              type="primary"
              icon={<ExportOutlined />}
              onClick={() => handleExport(false)}
              disabled={selectedRowKeys.length === 0}
            >
              Xuất đã chọn
              {selectedRowKeys.length > 0 ? ` (${selectedRowKeys.length})` : ""}
            </Button>
          </Tooltip>
        </Space>
      </div>

      <SyncPanel />

      {/* Filters */}
      <Card style={{ marginBottom: 12 }}>{filterBar}</Card>

      {/* Table */}
      <Card>
        <Text style={{ display: "block", marginBottom: 10 }}>
          Hiển thị <strong>{sims.length}</strong> /{" "}
          {simsData?.total ?? sims.length} SIM
          {selectedRowKeys.length > 0 && (
            <Tag color="blue" style={{ marginLeft: 10 }}>
              Đang chọn {selectedRowKeys.length}
            </Tag>
          )}
        </Text>
        <Table
          dataSource={sims}
          columns={columns}
          rowKey="id"
          size="small"
          scroll={{ x: "max-content" }}
          rowSelection={rowSelection}
          rowClassName={(record) =>
            alertSimIds.has(record.id) ? "row-alert" : ""
          }
          pagination={{ ...pagination, total: simsData?.total ?? 0 }}
          onChange={handleTableChange}
          loading={isLoading || isFetching || isRefetching}
        />
      </Card>

      <style>{`
        .row-alert td { background-color: #fff2f0 !important; }
        .row-alert:hover td { background-color: #ffe7e7 !important; }
      `}</style>

      <SimMasterMembersModal sim={modalSim} onClose={() => setModalSim(null)} />
      <SimGroupMembersModal
        groupId={groupModalId}
        groupName={groupModalName}
        onClose={() => {
          setGroupModalId(null);
          setGroupModalName(null);
        }}
      />
    </div>
  );
};

export default SimManagement;
