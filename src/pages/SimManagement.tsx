import React, { useEffect, useMemo, useState } from "react";
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
  Modal,
  Checkbox,
  Divider,
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
import type { SimCard, SimGroup } from "../types";
import { useSims, useUpdateManySimStatus } from "../hooks/useSims";
import { useAlerts, useTriggeredAlerts } from "../hooks/useAlerts";
import { formatMB, getUsageColor } from "../utils";
import SimMasterMembersModal from "../components/SIM/SimMasterMembersModal";
import SimGroupMembersModal from "../components/SIM/SimGroupMembersModal";
import { useRatingPlans } from "../hooks/useRatingPlans";
import { useColumns } from "../hooks/useColumns";
import { type FilterField, useFilters } from "../hooks/useFilters";
import { useGroupSims } from "../hooks/useGroupSims";
import { DebouncedInput } from "../components/DebouncedInput";
import { CustomTableFilter } from "../components/CustomTableFilter";
import { SyncPanel } from "../components/SyncPanel";
import { VIN_STATUS_OPTIONS } from "../utils/constants";
import { ServerSelect } from "../components/ServerSelect";
import { queryKeys } from "../hooks/queryKeys";
import { groupsApi } from "../api/groups.api";
import { ratingPlansApi } from "../api/rating-plans.api";
import usePagination from "../hooks/usePagination";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// ─── Column keys ────────────────────────────────────────────────────────────

const ALL_COLUMN_KEYS = [
  "phone",
  "imsi",
  "groupName",
  "contract",
  "ratingPlan",
  "sogMembership",
  "sogMembers",
  "usedMB",
  "activated",
  "note",
  "status",
  "simGroups",
] as const;
type ColumnKey = (typeof ALL_COLUMN_KEYS)[number];

const COLUMN_LABELS: Record<ColumnKey, string> = {
  phone: "Số điện thoại",
  imsi: "IMSI",
  groupName: "Nhóm thuê bao",
  contract: "Mã hợp đồng",
  ratingPlan: "Gói cước",
  sogMembership: "Loại gói cước",
  sogMembers: "Thuê bao thành viên",
  usedMB: "Dung lượng",
  activated: "Kích hoạt",
  note: "Ghi chú",
  status: "Trạng thái",
  simGroups: "Nhóm thiết bị",
};

const DEFAULT_VISIBLE: ColumnKey[] = [
  "phone",
  "imsi",
  "groupName",
  "simGroups",
  "contract",
  "ratingPlan",
  "sogMembership",
  "sogMembers",
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
  "ratingPlanId",
  "status",
  "simType",
  "dateRange",
  "groupName",
  "sort",
  "sogIsOwner",
  "groupId",
] as const;
type FilterKey = (typeof ALL_FILTER_KEYS)[number];

// Filter keys shown in the toolbox checkbox list (sort is internal, not user-visible)
const VISIBLE_FILTER_KEYS = ALL_FILTER_KEYS.filter(
  (k) => k !== "sort",
) as FilterKey[];

// ─── Export ───────────────────────────────────────────────────────────────

interface ExportColumn {
  key: string;
  label: string;
  getValue: (s: SimCard) => string | number;
}

const ALL_EXPORT_COLUMNS: ExportColumn[] = ALL_COLUMN_KEYS.map((key) => {
  const label = COLUMN_LABELS[key];
  const getValue = (s: SimCard): string | number => {
    switch (key) {
      case "phone":
        return s.phoneNumber;
      case "imsi":
        return s.imsi ?? "";
      case "groupName":
        return s.groupName ?? "";
      case "contract":
        return s.contractCode ?? "";
      case "ratingPlan":
        return s.ratingPlanName ?? s.productCode;
      case "sogMembership":
        if (s.sogIsOwner == null) return "";
        return s.sogIsOwner ? "Chủ nhóm" : "Thành viên";
      case "sogMembers":
        return s.sogGroupId && s.sogIsOwner
          ? (s.sogGroupName ?? s.sogGroupId)
          : "";
      case "usedMB":
        return s.usedMB;
      case "activated":
        return s.activatedDate ?? s.firstUsedAt ?? "";
      case "note":
        return s.note ?? "";
      case "status":
        return (
          VIN_STATUS_OPTIONS.find((o) => o.value === s.status)?.label ??
          s.status
        );
      case "simGroups":
        return (s.simGroups ?? [])
          .map((g) => g.group?.name)
          .filter(Boolean)
          .join(", ");
    }
  };
  return { key, label, getValue };
});

const DEFAULT_EXPORT_KEYS: ColumnKey[] = [
  "phone",
  "imsi",
  "contract",
  "ratingPlan",
  "status",
  "usedMB",
];

interface ExportModalProps {
  open: boolean;
  data: SimCard[];
  onClose: () => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ open, data, onClose }) => {
  const [selected, setSelected] = useState<ColumnKey[]>(DEFAULT_EXPORT_KEYS);

  const allKeys = ALL_EXPORT_COLUMNS.map((c) => c.key as ColumnKey);
  const allChecked = selected.length === allKeys.length;
  const indeterminate = selected.length > 0 && !allChecked;

  const handleExport = () => {
    if (selected.length === 0) {
      message.warning("Vui lòng chọn ít nhất 1 cột!");
      return;
    }
    const cols = ALL_EXPORT_COLUMNS.filter((c) =>
      selected.includes(c.key as ColumnKey),
    );
    const rows = data.map((s) =>
      Object.fromEntries(cols.map((c) => [c.label, c.getValue(s)])),
    );
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SIM");
    const filename = `sim-m2m-${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
    message.success(`Đã xuất ${data.length} SIM → ${filename}`);
    onClose();
  };

  return (
    <Modal
      title={`Xuất Excel — ${data.length} SIM`}
      open={open}
      onOk={handleExport}
      onCancel={onClose}
      okText="Xuất"
      cancelText="Huỷ"
      width={480}
    >
      <Divider plain style={{ marginTop: 0 }}>
        Chọn cột xuất
      </Divider>
      <Checkbox
        indeterminate={indeterminate}
        checked={allChecked}
        onChange={(e) => setSelected(e.target.checked ? allKeys : [])}
        style={{ marginBottom: 8, fontWeight: 600 }}
      >
        Chọn tất cả
      </Checkbox>
      <Checkbox.Group
        value={selected}
        onChange={(vals) => setSelected(vals as ColumnKey[])}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "6px 0",
        }}
        options={ALL_EXPORT_COLUMNS.map((c) => ({
          label: c.label,
          value: c.key,
        }))}
      />
    </Modal>
  );
};

// ─── Component ────────────────────────────────────────────────────────────

const SimManagement: React.FC = () => {
  const [pagination, setPagination] = usePagination({
    pageSize: 10,
    current: 1,
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
        filterKey: "ratingPlanId",
        label: "Gói cước",
        colSpan: { xs: 24, sm: 12, md: 4, lg: 3 },
        render: (value, onChange) => (
          <ServerSelect
            queryKey={queryKeys.ratingPlans.list()}
            placeholder="Gói cước"
            value={(value as string) || undefined}
            popupMatchSelectWidth={200}
            fetchFn={({ page, pageSize, search }) =>
              ratingPlansApi.getList({ page, pageSize, search })
            }
            onChange={(v) => onChange(v)}
            allowClear
            style={{ width: "100%" }}
            getOptionValue={(rp) => String(rp.ratingPlanId)}
            getOptionLabel={(rp) => `${rp.name} - (${rp.code})`}
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
        filterKey: "sogIsOwner",
        label: "Thuê bao thành viên",
        colSpan: { xs: 24, sm: 12, md: 4, lg: 3 },
        render: (value, onChange) => (
          <Select
            style={{ width: "100%" }}
            value={Number.isNaN(+value) ? value : Number(value)}
            onChange={(v) => onChange(v)}
            placeholder="Thuê bao thành viên"
            allowClear
            options={[
              {
                label: "Chủ nhóm",
                value: 1,
              },
              {
                label: "Thành viên",
                value: 0,
              },
            ]}
          />
        ),
        toUrlParams: (v) => ({ sogIsOwner: v != null ? String(v) : undefined }),
        fromUrlParams: (p) => p.get("sogIsOwner") ?? undefined,
      },
      {
        filterKey: "groupId",
        label: "Nhóm thiết bị",
        colSpan: { xs: 24, sm: 12, md: 4, lg: 3 },
        render: (value, onChange) => (
          <ServerSelect
            queryKey={queryKeys.groups.all}
            fetchFn={({ page, pageSize, search }) =>
              groupsApi.getList({ page, pageSize, search })
            }
            placeholder="Nhóm thiết bị"
            getOptionValue={(g) => g.id}
            getOptionLabel={(g) => g.name}
            mode="multiple"
            style={{
              minWidth: 160,
            }}
            value={value}
            onChange={(v) => onChange(v)}
          />
        ),
        toUrlParams: (v) => {
          const arr = v as string[] | undefined;
          if (!arr?.length) return { groupId: undefined };
          return { groupId: arr.join(",") };
        },
        fromUrlParams: (p) => {
          const raw = p.get("groupId");
          if (!raw) return undefined;
          return raw.split(",");
        },
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

  // ── Reset to page 1 when non-sort filters change ──────────────────────
  const nonSortFilterKey = JSON.stringify(
    Object.fromEntries(
      Object.entries(filterValues).filter(([k]) => k !== "sort"),
    ),
  );
  useEffect(() => {
    setPagination((prev) => ({ ...prev, current: 1 }));
  }, [nonSortFilterKey]);

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
      status: toNum(filterValues.status),
      ratingPlanId: toNum(filterValues.ratingPlanId),
      simType: toNum(filterValues.simType),
      dateFrom: dr[0]?.format("YYYY-MM-DD"),
      dateTo: dr[1]?.format("YYYY-MM-DD"),
      pageSize: pagination.pageSize,
      page: pagination.current,
      groupName: (filterValues.groupName as string) || undefined,
      groupId: filterValues.groupId as string,
      sogIsOwner: toNum(filterValues.sogIsOwner),
      sort: (filterValues.sort as string) || undefined,
    };
  }, [filterValues, pagination]);

  const {
    data: simsData,
    isLoading,
    isFetching,
    isRefetching,
  } = useSims(queryParams);
  const { data: alertsData } = useAlerts();
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

  const { mutate } = useUpdateManySimStatus();

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
      sorter: true,
      sortOrder: (filterValues.sort as string)?.startsWith("imsi:")
        ? (filterValues.sort as string).endsWith(":asc")
          ? "ascend"
          : "descend"
        : null,
    },
    {
      colKey: "groupName",
      title: "Nhóm thuê bao",
      dataIndex: "groupName",
      key: "groupName",
      width: 180,
      render: (v) =>
        v ? <Tag color="purple">{v}</Tag> : <Text type="secondary">—</Text>,
      sorter: true,
      sortOrder: (filterValues.sort as string)?.startsWith("groupName:")
        ? (filterValues.sort as string).endsWith(":asc")
          ? "ascend"
          : "descend"
        : null,
    },
    {
      colKey: "simGroups",
      title: "Nhóm thiết bị",
      dataIndex: "simGroups",
      key: "simGroups",
      width: 180,
      render: (v: SimGroup[] | undefined) =>
        v ? (
          <Space>
            {v.map((g) => (
              <Tag color="purple" key={g.group?.id}>
                {g.group?.name}
              </Tag>
            ))}
          </Space>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      colKey: "contract",
      title: "Mã hợp đồng",
      dataIndex: "contractCode",
      key: "contractCode",
      width: 160,
      render: (v) =>
        v ? <Tag color="geekblue">{v}</Tag> : <Text type="secondary">—</Text>,
      sorter: true,
      sortOrder: (filterValues.sort as string)?.startsWith("contractCode:")
        ? (filterValues.sort as string).endsWith(":asc")
          ? "ascend"
          : "descend"
        : null,
    },
    {
      colKey: "ratingPlan",
      title: "Gói cước",
      dataIndex: "ratingPlanName",
      key: "ratingPlanName",
      width: 190,
      render: (v, r) =>
        (v ?? r.productCode) ? (
          <Tag color="blue">{v ?? r.productCode}</Tag>
        ) : (
          <Text type="secondary">—</Text>
        ),
      sorter: true,
      sortOrder: (filterValues.sort as string)?.startsWith("ratingPlanName:")
        ? (filterValues.sort as string).endsWith(":asc")
          ? "ascend"
          : "descend"
        : null,
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
        const relevantAlerts = (alertsData?.data || []).filter(
          (a) =>
            a.active &&
            (a.simId === record.id ||
              (a.groupId && (record.groupIds ?? []).includes(a.groupId)) ||
              (a.productCode && a.productCode === record.productCode)),
        );
        const maxThreshold = relevantAlerts.length
          ? Math.max(...relevantAlerts?.map((a) => a.thresholdMB))
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
      dataIndex: "firstUsedAt",
      key: "firstUsedAt",
      width: 145,
      render: (v, r) => {
        const d = v ?? r.firstUsedAt;
        return d ? (
          dayjs(d).format("DD/MM/YYYY")
        ) : (
          <Text type="secondary">Chưa có</Text>
        );
      },
      sorter: true,
      sortOrder: (filterValues.sort as string)?.startsWith("firstUsedAt:")
        ? (filterValues.sort as string).endsWith(":asc")
          ? "ascend"
          : "descend"
        : null,
    },
    {
      colKey: "status",
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 145,
      render: (v) => {
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
      colKey: "sogMembership",
      title: "Loại gói cước",
      key: "sogIsOwner",
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
    {
      colKey: "note",
      title: "Ghi chú",
      dataIndex: "note",
      key: "note",
      width: 150,
      render: (v) => v ?? <Text type="secondary">—</Text>,
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

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportData, setExportData] = useState<SimCard[]>([]);

  const handleExport = (exportAll: boolean) => {
    if (!exportAll && selectedRowKeys.length === 0) {
      message.warning("Vui lòng tích chọn ít nhất 1 SIM!");
      return;
    }
    const data = exportAll
      ? sims
      : sims.filter((s) => selectedRowKeys.includes(s.id));
    setExportData(data);
    setExportModalOpen(true);
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

      {import.meta.env.DEV && <SyncPanel />}

      {/* Filters */}
      <Card style={{ marginBottom: 12 }}>{filterBar}</Card>

      {/* Table */}
      <Card>
        <Space wrap align="baseline">
          <Text style={{ display: "block", marginBottom: 10 }}>
            Hiển thị <strong>{sims.length}</strong> /{" "}
            {simsData?.total ?? sims.length} SIM
            {selectedRowKeys.length > 0 && (
              <Tag color="blue" style={{ marginLeft: 10 }}>
                Đang chọn {selectedRowKeys.length}
              </Tag>
            )}
          </Text>
          {!!selectedRowKeys.length && (
            <Button
              type="primary"
              size="small"
              onClick={() => {
                mutate({
                  ids: selectedRowKeys as string[],
                  action: "confirm",
                });
              }}
            >
              Xác nhận
            </Button>
          )}
        </Space>
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
      <ExportModal
        open={exportModalOpen}
        data={exportData}
        onClose={() => setExportModalOpen(false)}
      />
    </div>
  );
};

export default SimManagement;
