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
} from "antd";
import { type ColumnsType } from "antd/es/table";
import {
  BellFilled,
  BellOutlined,
  CheckCircleFilled,
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import type { AlertConfig, TriggeredAlert } from "../types";
import { formatMB } from "../utils";
import SimStatusBadge from "../components/SIM/SimStatusBadge";
import {
  useAlerts,
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

const { Title, Text } = Typography;

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
  const [filterRatingPlanId, setFilterRatingPlanId] = useState<number>();
  const { data: triggeredData, isLoading: triggeredLoading } =
    useTriggeredAlerts(filterRatingPlanId);
  const checkAlert = useCheckAlert();
  const toggleAlert = useToggleAlert();
  const { mutateAsync: deleteAlert, isPending: deleting } = useDeleteAlert();

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
      title: "Mã sản phẩm",
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
                queryKey={queryKeys.ratingPlans.list()}
                fetchFn={({ search, page, pageSize }) =>
                  ratingPlansApi.getList({ search, page, pageSize })
                }
                placeholder="Lọc theo gói cước"
                value={filterRatingPlanId}
                onChange={setFilterRatingPlanId}
                style={{ width: 240 }}
                showSearch={{
                  optionFilterProp: "label",
                }}
                getOptionLabel={(rp) => rp.name + `(${rp.code})`}
                getOptionValue={(rp) => rp.ratingPlanId}
              />
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
