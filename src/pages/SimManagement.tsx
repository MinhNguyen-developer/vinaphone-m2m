import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Table,
  Select,
  Tag,
  Space,
  Typography,
  Card,
  Input,
  Row,
  Col,
  Button,
  Tooltip,
  message,
  Checkbox,
  Popover,
  DatePicker,
  Badge,
} from "antd";
import {
  SearchOutlined,
  DownloadOutlined,
  ExportOutlined,
  SettingOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import type {
  ColumnsType,
  TablePaginationConfig,
  TableRowSelection,
} from "antd/es/table/interface";
import { useSearchParams } from "react-router-dom";
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

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

// ─── Column keys ────────────────────────────────────────────────────────────

const ALL_COLUMN_KEYS = [
  "phone",
  "imsi",
  "iccid",
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
  "used",
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
  used: "Dung lượng",
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
  "used",
  "activated",
];

const STORAGE_KEY = "sim-column-visibility";

function loadVisibleColumns(): ColumnKey[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as string[];
      const valid = parsed.filter((k): k is ColumnKey =>
        ALL_COLUMN_KEYS.includes(k as ColumnKey),
      );
      if (valid.length > 0) return valid;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_VISIBLE;
}

function saveVisibleColumns(keys: ColumnKey[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

// ─── URL ↔ filter helpers ─────────────────────────────────────────────────

function toSearchParams(filters: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== "" && v !== "all") p.set(k, v);
  }
  return p;
}

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
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Filters (synced with URL) ──────────────────────────────────────────
  const [keySearch, setKeySearch] = useState(searchParams.get("search") ?? "");
  const [msisdn, setMsisdn] = useState(searchParams.get("msisdn") ?? "");
  const [imsi, setImsi] = useState(searchParams.get("imsi") ?? "");
  const [contractCode, setContractCode] = useState(
    searchParams.get("contractCode") ?? "",
  );
  const [contractor, setContractor] = useState(
    searchParams.get("contractor") ?? "",
  );
  const [customer, setCustomer] = useState(searchParams.get("customer") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "all");
  const [provinceCode, setProvinceCode] = useState(
    searchParams.get("provinceCode") ?? "",
  );
  const [ratingPlanId, setRatingPlanId] = useState(
    searchParams.get("ratingPlanId") ?? "",
  );
  const [simType, setSimType] = useState(searchParams.get("simType") ?? "all");
  const [dateRange, setDateRange] = useState<
    [dayjs.Dayjs | null, dayjs.Dayjs | null]
  >([
    searchParams.get("dateFrom") ? dayjs(searchParams.get("dateFrom")) : null,
    searchParams.get("dateTo") ? dayjs(searchParams.get("dateTo")) : null,
  ]);

  const [pagination, setPagination] = useState<TablePaginationConfig>({
    pageSize: 10,
    current: 1,
    pageSizeOptions: ["10", "20", "50", "100"],
    showSizeChanger: true,
  }); // For future pagination implementation

  // ── Sync filters → URL ────────────────────────────────────────────────
  const syncUrl = useCallback(() => {
    setSearchParams(
      toSearchParams({
        search: keySearch,
        msisdn,
        imsi,
        contractCode,
        contractor,
        customer,
        status,
        provinceCode,
        ratingPlanId,
        simType,
        dateFrom: dateRange[0]?.format("YYYY-MM-DD"),
        dateTo: dateRange[1]?.format("YYYY-MM-DD"),
      }),
      { replace: true },
    );
  }, [
    keySearch,
    msisdn,
    imsi,
    contractCode,
    contractor,
    customer,
    status,
    provinceCode,
    ratingPlanId,
    simType,
    dateRange,
    setSearchParams,
  ]);

  const handleTableChange = (pagination: TablePaginationConfig) => {
    setPagination(pagination);
  };

  // Push URL on every filter change
  useEffect(() => {
    syncUrl();
  }, [syncUrl]);

  // ── Column visibility state (localStorage) ────────────────────────────
  const [visibleCols, setVisibleCols] =
    useState<ColumnKey[]>(loadVisibleColumns);

  const toggleColumn = (key: ColumnKey, checked: boolean) => {
    setVisibleCols((prev) => {
      const next = checked ? [...prev, key] : prev.filter((k) => k !== key);
      saveVisibleColumns(next);
      return next;
    });
  };

  // ── Data fetching ─────────────────────────────────────────────────────
  const queryParams = useMemo(
    () => ({
      search: keySearch || undefined,
      msisdn: msisdn || undefined,
      imsi: imsi || undefined,
      contractCode: contractCode || undefined,
      contractor: contractor || undefined,
      customer: customer || undefined,
      status: status !== "all" ? Number(status) : undefined,
      provinceCode: provinceCode || undefined,
      ratingPlanId: ratingPlanId ? Number(ratingPlanId) : undefined,
      simType: simType !== "all" ? Number(simType) : undefined,
      dateFrom: dateRange[0]?.format("YYYY-MM-DD"),
      dateTo: dateRange[1]?.format("YYYY-MM-DD"),
      pageSize: pagination.pageSize,
      page: pagination.current,
    }),
    [
      keySearch,
      msisdn,
      imsi,
      contractCode,
      contractor,
      customer,
      status,
      provinceCode,
      ratingPlanId,
      simType,
      dateRange,
      pagination,
    ],
  );

  const {
    data: simsData,
    isLoading,
    isFetching,
    isRefetching,
  } = useSims(queryParams);

  const { data: ratingPlansData } = useRatingPlans({ page: 1, pageSize: 1000 });
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
      key: "phone",
      fixed: "left",
      width: 145,
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
      colKey: "used",
      title: "Dung lượng",
      dataIndex: "usedMB",
      key: "used",
      width: 130,
      sorter: (a, b) => a.usedMB - b.usedMB,
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

  const columns = allColumns.filter((c) => visibleCols.includes(c.colKey));

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
  const columnPicker = (
    <div style={{ width: 280 }}>
      <div style={{ marginBottom: 8, fontWeight: 600 }}>Hiển thị cột</div>
      <Row gutter={[0, 4]}>
        {ALL_COLUMN_KEYS.map((k) => (
          <Col span={12} key={k}>
            <Checkbox
              checked={visibleCols.includes(k)}
              onChange={(e) => toggleColumn(k, e.target.checked)}
            >
              {COLUMN_LABELS[k]}
            </Checkbox>
          </Col>
        ))}
      </Row>
      <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
        <Button
          size="small"
          onClick={() => {
            setVisibleCols([...ALL_COLUMN_KEYS]);
            saveVisibleColumns([...ALL_COLUMN_KEYS]);
          }}
        >
          Hiện tất cả
        </Button>
        <Button
          size="small"
          onClick={() => {
            setVisibleCols(DEFAULT_VISIBLE);
            saveVisibleColumns(DEFAULT_VISIBLE);
          }}
        >
          Mặc định
        </Button>
      </div>
    </div>
  );

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
          <Popover
            content={columnPicker}
            trigger="click"
            placement="bottomRight"
          >
            <Button icon={<SettingOutlined />}>Cột hiển thị</Button>
          </Popover>
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

      {/* Filters */}
      <Card style={{ marginBottom: 12 }}>
        <Row gutter={[10, 10]}>
          <Col xs={24} sm={12} md={6} lg={4}>
            <Input
              placeholder="Tìm kiếm (SĐT/IMSI/hợp đồng…)"
              prefix={<SearchOutlined />}
              value={keySearch}
              onChange={(e) => setKeySearch(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={5} lg={3}>
            <Input
              placeholder="MSISDN"
              value={msisdn}
              onChange={(e) => setMsisdn(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={5} lg={3}>
            <Input
              placeholder="IMSI"
              value={imsi}
              onChange={(e) => setImsi(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={5} lg={3}>
            <Input
              placeholder="Mã hợp đồng"
              value={contractCode}
              onChange={(e) => setContractCode(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={5} lg={3}>
            <Input
              placeholder="Người ký HĐ"
              value={contractor}
              onChange={(e) => setContractor(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={5} lg={4}>
            <Input
              placeholder="Khách hàng"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={4} lg={3}>
            <Input
              placeholder="Tỉnh/TP"
              value={provinceCode}
              onChange={(e) => setProvinceCode(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={4} lg={3}>
            <Select
              placeholder="Gói cước"
              value={ratingPlanId}
              popupMatchSelectWidth={200}
              onChange={(value) => setRatingPlanId(value)}
              allowClear
              options={
                ratingPlansData?.data.map((rp) => ({
                  label: `${rp.name} - (${rp.code})`,
                  value: rp.ratingPlanId,
                })) ?? []
              }
            />
          </Col>
          <Col xs={24} sm={12} md={4} lg={3}>
            <Select
              style={{ width: "100%" }}
              value={status}
              onChange={setStatus}
              placeholder="Trạng thái"
            >
              <Option value="all">Tất cả trạng thái</Option>
              {VIN_STATUS_OPTIONS.map((o) => (
                <Option key={o.value} value={o.value}>
                  {o.label}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4} lg={3}>
            <Select
              style={{ width: "100%" }}
              value={simType}
              onChange={setSimType}
              placeholder="Loại SIM"
            >
              <Option value="all">Tất cả loại SIM</Option>
              <Option value="0">Vật lý</Option>
              <Option value="1">eSIM</Option>
            </Select>
          </Col>
          <Col xs={24} sm={24} md={10} lg={8}>
            <RangePicker
              style={{ width: "100%" }}
              value={dateRange}
              onChange={(v) => setDateRange(v ? [v[0], v[1]] : [null, null])}
              placeholder={["Từ ngày kích hoạt", "Đến ngày"]}
              format="DD/MM/YYYY"
            />
          </Col>
        </Row>
      </Card>

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
