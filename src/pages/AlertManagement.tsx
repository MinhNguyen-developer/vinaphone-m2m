import React, { useState } from "react";
import {
  Card,
  Table,
  Tag,
  Typography,
  Alert,
  Tabs,
  Switch,
  Select,
  Button,
  Space,
  Tooltip,
  Spin,
  Modal,
  message,
  Divider,
  Input,
  Upload,
} from "antd";
import { type ColumnsType, type SorterResult } from "antd/es/table/interface";
import {
  BellFilled,
  BellOutlined,
  CheckCircleFilled,
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import type { RcFile } from "antd/es/upload";
import * as XLSX from "xlsx";
import type {
  AlertConfig,
  BulkCheckResult,
  SimGroup,
  TriggeredAlert,
} from "../types";
import { formatMB } from "../utils";
import SimStatusBadge from "../components/SIM/SimStatusBadge";
import {
  useAlerts,
  useBulkCheckAlerts,
  useCheckAlert,
  useTriggeredAlerts,
  useDeleteAlert,
  useToggleAlert,
} from "../hooks/useAlerts";
import { useSims } from "../hooks/useSims";
import { useGroups } from "../hooks/useGroups";
import AlertDrawer from "../components/Alert/AlertDrawer";
import { DebouncedInput } from "../components/DebouncedInput";
import { useQuery } from "@tanstack/react-query";
import { ratingPlansApi } from "../api/rating-plans.api";
import { queryKeys } from "../hooks/queryKeys";
import { ServerSelect } from "../components/ServerSelect";
import { groupsApi } from "../api/groups.api";
import { simCodesApi } from "../api/simCodes.api";

const { Title, Text } = Typography;

// ─── Bulk Check Modal ──────────────────────────────────────────────────────────────

interface BulkCheckModalProps {
  open: boolean;
  onClose: () => void;
}

const BulkCheckModal: React.FC<BulkCheckModalProps> = ({ open, onClose }) => {
  const [textValue, setTextValue] = useState("");
  const [parsed, setParsed] = useState<string[]>([]);
  const [lastResult, setLastResult] = useState<BulkCheckResult[] | null>(null);
  const { mutate: bulkCheck, isPending } = useBulkCheckAlerts();

  const parsePhoneNumbers = (raw: string): string[] =>
    raw
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

  const handleTextChange = (val: string) => {
    setTextValue(val);
    setParsed(parsePhoneNumbers(val));
  };

  const handleCsvUpload = (file: RcFile): boolean => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) ?? "";
      const numbers = parsePhoneNumbers(text);
      setTextValue(numbers.join("\n"));
      setParsed(numbers);
    };
    reader.readAsText(file);
    return false;
  };

  const handleExportCsv = () => {
    if (!lastResult?.length) return;
    const rows = lastResult.map((r) => ({
      "Số điện thoại": r.phoneNumber,
      "Dung lượng đã dùng (MB)": r.usedMB,
      "Cảnh báo": r.alertLabel,
      "Ngưỡng (MB)": r.thresholdMB,
      "Nhóm thiết bị": r.groupNames.join(", "),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Checked");
    XLSX.writeFile(wb, `bulk-check-${Date.now()}.xlsx`);
  };

  const handleConfirm = () => {
    if (parsed.length === 0) {
      message.warning("Vui lòng nhập ít nhất 1 số điện thoại!");
      return;
    }
    bulkCheck(parsed, {
      onSuccess: (result) => {
        setLastResult(result.results);
        if (result.checked > 0) {
          message.success(`Đã đánh dấu đã kiểm tra ${result.checked} cảnh báo`);
        }
        if (result.notFound > 0) {
          message.warning(
            `${result.notFound} số điện thoại không tìm thấy: ${result.notFoundPhones.join(", ")}`,
            6,
          );
        }
        setTextValue("");
        setParsed([]);
        // Keep modal open so user can export CSV
      },
      onError: () => message.error("Kiểm tra thất bại!"),
    });
  };

  const handleClose = () => {
    setTextValue("");
    setParsed([]);
    setLastResult(null);
    onClose();
  };

  return (
    <Modal
      title="Kiểm tra hàng loạt"
      open={open}
      onOk={handleConfirm}
      onCancel={handleClose}
      okText="Xác nhận kiểm tra"
      okButtonProps={{ loading: isPending }}
      cancelText="Đóng"
      width={520}
      footer={(_, { OkBtn, CancelBtn }) => (
        <Space>
          <CancelBtn />
          {lastResult && lastResult.length > 0 && (
            <Button icon={<UploadOutlined />} onClick={handleExportCsv}>
              Xuất Excel
            </Button>
          )}
          <OkBtn />
        </Space>
      )}
    >
      <Space orientation="vertical" style={{ width: "100%" }} size={12}>
        <Alert
          type="info"
          showIcon
          title="Đánh dấu các SIM theo số điện thoại là đã kiểm tra trong tất cả cảnh báo đang hoạt động."
        />
        <div>
          <Text strong>Tải lên file CSV</Text>
          <Upload.Dragger
            accept=".csv,.txt"
            beforeUpload={handleCsvUpload}
            showUploadList={false}
            style={{ marginTop: 6 }}
          >
            <p className="ant-upload-drag-icon">
              <UploadOutlined />
            </p>
            <p className="ant-upload-text">
              Kéo thả file vào đây hoặc click để chọn
            </p>
            <p className="ant-upload-hint">
              File CSV 1 cột, không có tiêu đề, mỗi dòng 1 số điện thoại
            </p>
          </Upload.Dragger>
        </div>
        <Divider plain style={{ margin: "4px 0" }}>
          hoặc nhập tay
        </Divider>
        <div>
          <Text strong>Danh sách số điện thoại</Text>
          <Input.TextArea
            rows={4}
            placeholder={"0987654321\n0912345678\n..."}
            value={textValue}
            onChange={(e) => handleTextChange(e.target.value)}
            style={{ marginTop: 6, fontFamily: "monospace", fontSize: 13 }}
          />
          {parsed.length > 0 && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Đã nhận {parsed.length} số điện thoại
            </Text>
          )}
        </div>
      </Space>
    </Modal>
  );
};

/** Fetches a single rating plan by numeric ID and renders a Tag. Cached per ID. */
const RatingPlanCell: React.FC<{ ratingPlanId: number }> = ({
  ratingPlanId,
}) => {
  const { data: plan } = useQuery({
    queryKey: queryKeys.ratingPlans.byRatingPlanId(ratingPlanId),
    queryFn: () => ratingPlansApi.findByRatingPlanId(ratingPlanId),
    staleTime: 300_000,
  });
  return (
    <Tag color="blue">
      Gói: {plan ? `${plan.name} (${plan.code})` : ratingPlanId}
    </Tag>
  );
};

type DrawerMode = "create" | "edit";

const AlertManagement: React.FC = () => {
  const { data: simsData } = useSims({ pageSize: 200 });
  const { data: groupsResponse } = useGroups({ pageSize: 200 });
  const groups = groupsResponse?.data ?? [];

  // ── Alert config filter + pagination state ────────────────────────────
  const [filterLabel, setFilterLabel] = useState("");
  const [filterActive, setFilterActive] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [alertPage, setAlertPage] = useState(1);
  const [alertPageSize, setAlertPageSize] = useState(20);

  const alertQueryParams = {
    label: filterLabel || undefined,
    active:
      filterActive === "active"
        ? true
        : filterActive === "inactive"
          ? false
          : undefined,
    page: alertPage,
    pageSize: alertPageSize,
  };
  const { data: alertsResponse, isLoading: alertsLoading } =
    useAlerts(alertQueryParams);
  const alerts = alertsResponse?.data ?? [];
  const alertTotal = alertsResponse?.total ?? 0;
  const [filterGroupId, setFilterGroupId] = useState<string | undefined>();
  const [filterSimCodeLabel, setFilterSimCodeLabel] = useState<
    string | undefined
  >();
  const [triggeredSort, setTriggeredSort] = useState<string | undefined>();
  const { data: triggeredData, isLoading: triggeredLoading } =
    useTriggeredAlerts({
      groupId: filterGroupId,
      simCodeLabel: filterSimCodeLabel,
      sort: triggeredSort,
    });
  const checkAlert = useCheckAlert();
  const toggleAlert = useToggleAlert();
  const { mutateAsync: deleteAlert, isPending: deleting } = useDeleteAlert();
  const [bulkCheckOpen, setBulkCheckOpen] = useState(false);

  const handleTriggeredTableChange = (
    _pagination: unknown,
    _filters: unknown,
    sorter: SorterResult<TriggeredAlert> | SorterResult<TriggeredAlert>[],
  ) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    if (s.columnKey === "used" && s.order) {
      setTriggeredSort(`usedMB:${s.order === "ascend" ? "asc" : "desc"}`);
    } else {
      setTriggeredSort(undefined);
    }
  };

  // ── Drawer state ──────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("create");
  const [editingAlert, setEditingAlert] = useState<AlertConfig | null>(null);

  // ── Delete state ──────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<AlertConfig | null>(null);

  const openCreate = () => {
    setEditingAlert(null);
    setDrawerMode("create");
    setDrawerOpen(true);
  };

  const openEdit = (alert: AlertConfig) => {
    setEditingAlert(alert);
    setDrawerMode("edit");
    setDrawerOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteAlert(deleteTarget.id);
    message.success(`Đã xoá cảnh báo "${deleteTarget.label}"`);
    setDeleteTarget(null);
  };

  const sims = simsData?.data ?? [];
  const triggeredList: TriggeredAlert[] = triggeredData?.data ?? [];

  const alertColumns: ColumnsType<AlertConfig> = [
    { title: "Tên cảnh báo", dataIndex: "label", key: "label", fixed: "left" },
    {
      title: "Ngưỡng",
      dataIndex: "thresholdMB",
      key: "threshold",
      render: (v: number) => <Tag color="red">{formatMB(v)}</Tag>,
    },
    {
      title: "Áp dụng cho",
      key: "target",
      render: (_: unknown, record) => {
        if (record.simId) {
          const sim = sims.find((s) => s.id === record.simId);
          return (
            <Tag color="cyan">SIM: {sim?.phoneNumber ?? record.simId}</Tag>
          );
        }
        if (record.groupId) {
          const g = groups.find((x) => x.id === record.groupId);
          return <Tag color="purple">Nhóm: {g?.name ?? record.groupId}</Tag>;
        }
        if (record.ratingPlanId) {
          return <RatingPlanCell ratingPlanId={record.ratingPlanId} />;
        }
        return <Tag>Tất cả</Tag>;
      },
    },
    {
      title: "Kích hoạt",
      dataIndex: "active",
      key: "active",
      render: (v: boolean, record) => (
        <Switch
          checked={v}
          size="small"
          loading={toggleAlert.isPending}
          onChange={() => toggleAlert.mutate(record.id)}
        />
      ),
    },
    {
      title: "Hành động",
      key: "actions",
      width: 140,
      render: (_: unknown, record) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEdit(record)}
          >
            Sửa
          </Button>
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => setDeleteTarget(record)}
          >
            Xoá
          </Button>
        </Space>
      ),
    },
  ];

  const triggeredColumns: ColumnsType<TriggeredAlert> = [
    {
      title: "",
      key: "checked",
      width: 48,
      fixed: "left",
      render: (_: unknown, r: TriggeredAlert) => {
        const done = r.checked;
        return (
          <Tooltip
            title={done ? "Đánh dấu chưa kiểm tra" : "Đánh dấu đã kiểm tra"}
          >
            <Button
              type="text"
              loading={checkAlert.isPending}
              icon={
                done ? (
                  <CheckCircleFilled
                    style={{ color: "#52c41a", fontSize: 18 }}
                  />
                ) : (
                  <CheckCircleOutlined
                    style={{ color: "#bfbfbf", fontSize: 18 }}
                  />
                )
              }
              onClick={() => {
                console.log(r);
                checkAlert.mutate({
                  simId: r.sim.id,
                  alertId: r.alert.id,
                  checked: !done,
                });
              }}
            />
          </Tooltip>
        );
      },
    },
    {
      title: "Nhóm thiết bị",
      key: "groups",
      render: (_: unknown, r: TriggeredAlert) => {
        const groups = (r.sim.simGroups ?? []) as Partial<SimGroup>[];
        if (!groups.length) return <Text type="secondary">—</Text>;
        return (
          <Space size={4} wrap>
            {groups.map((g) => (
              <Tag color="purple" key={g.group?.id ?? g.groupId}>
                {g.group?.name}
              </Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: "Mã SIM",
      key: "simCode",
      render: (_: unknown, r: TriggeredAlert) =>
        r.sim.simCode ? (
          <Tag color="orange">{r.sim.simCode.code}</Tag>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Số điện thoại",
      key: "phone",
      fixed: "left",
      render: (_: unknown, r: TriggeredAlert) => (
        <Text
          strong
          style={{
            textDecoration: r.checked ? "line-through" : undefined,
            color: r.checked ? "#999" : undefined,
          }}
        >
          {r.sim.phoneNumber}
        </Text>
      ),
    },
    {
      title: "Gói cước",
      key: "code",
      render: (_: unknown, r: TriggeredAlert) => (
        <Tag color="blue">{r.sim.productCode}</Tag>
      ),
    },
    {
      title: "Trạng thái",
      key: "status",
      render: (_: unknown, r: TriggeredAlert) => (
        <SimStatusBadge status={r.sim.status} />
      ),
    },
    {
      title: "Dung lượng đã dùng",
      key: "used",
      sorter: true,
      sortOrder: triggeredSort?.startsWith("usedMB:")
        ? triggeredSort.endsWith(":asc")
          ? "ascend"
          : "descend"
        : null,
      render: (_: unknown, r: TriggeredAlert) => (
        <Text style={{ color: "#ff4d4f" }} strong>
          {formatMB(r.sim.usedMB)}
        </Text>
      ),
    },
    {
      title: "Ngưỡng cảnh báo",
      key: "threshold",
      render: (_: unknown, r: TriggeredAlert) => (
        <Tag color="red">{formatMB(r.alert.thresholdMB)}</Tag>
      ),
    },
    {
      title: "Cảnh báo",
      key: "alertLabel",
      render: (_: unknown, r: TriggeredAlert) => r.alert.label,
    },
  ];

  const checkedCount = triggeredList.filter((r) => r.checked).length;

  const items = [
    {
      key: "triggered",
      label: (
        <span>
          <BellFilled style={{ color: "#ff4d4f" }} /> Danh sách cảnh báo (
          {triggeredList.length})
        </span>
      ),
      children: (
        <>
          <Card style={{ marginBottom: 12 }}>
            <Space wrap>
              <ServerSelect
                queryKey={queryKeys.groups.all}
                fetchFn={({ page, pageSize, search }) =>
                  groupsApi.getList({ page, pageSize, search })
                }
                placeholder="Lọc theo nhóm thiết bị"
                value={filterGroupId}
                onChange={setFilterGroupId}
                style={{ width: 240 }}
                allowClear
                getOptionLabel={(g) => g.name}
                getOptionValue={(g) => g.id}
              />
              <ServerSelect
                queryKey={[...queryKeys.simCodes.all, "triggered-filter"]}
                fetchFn={({ page, pageSize, search }) =>
                  simCodesApi.getList({ page, pageSize, search })
                }
                placeholder="Lọc theo mã SIM"
                value={filterSimCodeLabel}
                onChange={setFilterSimCodeLabel}
                style={{ width: 200 }}
                allowClear
                getOptionLabel={(sc) => sc.code}
                getOptionValue={(sc) => sc.code}
              />
              <Button
                icon={<CheckCircleOutlined />}
                onClick={() => setBulkCheckOpen(true)}
              >
                Kiểm tra hàng loạt
              </Button>
              {checkedCount > 0 && (
                <Tag color="green">
                  ✓ Đã kiểm tra: {checkedCount}/{triggeredList.length}
                </Tag>
              )}
            </Space>
          </Card>
          {triggeredLoading ? (
            <Spin style={{ display: "block", margin: "40px auto" }} />
          ) : triggeredList.length === 0 ? (
            <Alert
              title="Không có SIM nào vượt ngưỡng cảnh báo."
              type="success"
              showIcon
            />
          ) : (
            <Card>
              <Alert
                title={`${triggeredList.length} SIM đang vượt ngưỡng. Cần kiểm tra!`}
                type="error"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Table
                dataSource={triggeredList}
                rowKey={(r) => `${r.sim.id}-${r.alert.id}`}
                size="middle"
                scroll={{ x: "max-content" }}
                columns={triggeredColumns}
                rowClassName={(r) => (r.checked ? "row-checked" : "")}
                onChange={handleTriggeredTableChange}
              />
            </Card>
          )}
        </>
      ),
    },
    {
      key: "config",
      label: (
        <span>
          <BellOutlined /> Cấu hình cảnh báo ({alertTotal})
        </span>
      ),
      children: (
        <Card
          title="Danh sách cảnh báo đã cài đặt"
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Thêm cảnh báo
            </Button>
          }
        >
          <Space style={{ marginBottom: 16 }} wrap>
            <DebouncedInput
              value={filterLabel}
              onChange={(v) => {
                setFilterLabel(v);
                setAlertPage(1);
              }}
              placeholder="Tìm theo tên cảnh báo"
              style={{ width: 260 }}
            />
            <Select
              value={filterActive}
              onChange={(v) => {
                setFilterActive(v);
                setAlertPage(1);
              }}
              style={{ width: 180 }}
              options={[
                { label: "Tất cả", value: "all" },
                { label: "Đang kích hoạt", value: "active" },
                { label: "Đã tắt", value: "inactive" },
              ]}
            />
          </Space>
          <Table
            dataSource={alerts}
            columns={alertColumns}
            scroll={{ x: "max-content" }}
            rowKey="id"
            size="middle"
            loading={alertsLoading}
            pagination={{
              current: alertPage,
              pageSize: alertPageSize,
              total: alertTotal,
              onChange: (p, ps) => {
                setAlertPage(p);
                setAlertPageSize(ps);
              },
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50"],
              showTotal: (t) => `Tổng ${t} cảnh báo`,
            }}
          />
        </Card>
      ),
    },
  ];

  return (
    <div>
      <Title level={3}>🔔 Cảnh báo dung lượng</Title>
      <Tabs defaultActiveKey="triggered" items={items} />

      <AlertDrawer
        open={drawerOpen}
        mode={drawerMode}
        editingAlert={editingAlert}
        onClose={() => setDrawerOpen(false)}
      />

      <BulkCheckModal
        open={bulkCheckOpen}
        onClose={() => setBulkCheckOpen(false)}
      />

      <Modal
        title="Xác nhận xoá cảnh báo"
        open={!!deleteTarget}
        onOk={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        okText="Xoá"
        okButtonProps={{ danger: true, loading: deleting }}
        cancelText="Huỷ"
      >
        <p>
          Bạn có chắc muốn xoá cảnh báo <strong>"{deleteTarget?.label}"</strong>{" "}
          không?
        </p>
      </Modal>

      <style>{`
        .row-checked td { opacity: 0.6; }
      `}</style>
    </div>
  );
};

export default AlertManagement;
