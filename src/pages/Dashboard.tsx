import React, { useMemo } from "react";
import {
  Card,
  Col,
  Row,
  Statistic,
  Table,
  Tag,
  Typography,
  Progress,
  Alert,
  Button,
  Spin,
  Empty,
} from "antd";
import {
  MobileOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { SimStatus } from "../types";
import { formatMB } from "../utils";
import SimStatusBadge from "../components/SIM/SimStatusBadge";
import { useAllSims } from "../hooks/useSims";
import { useTriggeredAlerts } from "../hooks/useAlerts";
import {
  useDashboardOverview,
  useSimsGroupByRatingPlan,
} from "../hooks/useDashboard";

const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const { data: overview, isLoading: overviewLoading } = useDashboardOverview();
  const { data: ratingPlanGroups = [], isLoading: groupsLoading } =
    useSimsGroupByRatingPlan();
  const { data: triggeredData } = useTriggeredAlerts();
  const { data: allSims = [] } = useAllSims();

  const isLoading = overviewLoading || groupsLoading;
  const triggeredCount = triggeredData?.total ?? 0;

  const total = overview?.totalSims ?? 0;
  const newSims = overview?.newSims ?? 0;
  const active = overview?.needConfirmationSims ?? 0;
  const confirmed = overview?.confirmedSims ?? 0;

  const ratingPlanTableData = useMemo(
    () =>
      ratingPlanGroups.map((g) => ({
        key: g.ratingPlanId ?? "null",
        name: g.ratingPlanName ?? "(Không có gói cước)",
        count: g._count._all,
        totalUsed: g._sum.usedMB ?? 0,
      })),
    [ratingPlanGroups],
  );

  const recentActive = useMemo(
    () =>
      allSims
        .filter((s) => s.status === SimStatus.ACTIVE)
        .sort((a, b) =>
          (b.firstUsedAt ?? "").localeCompare(a.firstUsedAt ?? ""),
        )
        .slice(0, 5),
    [allSims],
  );

  return (
    <div>
      <Title level={3}>📊 Tổng quan hệ thống M2M</Title>

      <Spin spinning={isLoading} tip="Đang tải dữ liệu..." size="large">
        {triggeredCount > 0 && (
          <Alert
            message={
              <span>
                ⚠️ Có <strong>{triggeredCount}</strong> SIM đang vượt ngưỡng
                cảnh báo!{" "}
                <Button
                  type="link"
                  onClick={() => navigate("/alerts")}
                  style={{ padding: 0 }}
                >
                  Xem danh sách →
                </Button>
              </span>
            }
            type="error"
            showIcon
            style={{ marginBottom: 24 }}
            closable
          />
        )}

        {/* Stat Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Tổng số SIM"
                value={total}
                prefix={<MobileOutlined />}
                valueStyle={{ color: "#1890ff" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="SIM đã xác nhận"
                value={confirmed}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: "#52c41a" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="SIM đang hoạt động (chờ xác nhận)"
                value={active}
                prefix={<ThunderboltOutlined />}
                valueStyle={{ color: "#faad14" }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="SIM cảnh báo vượt ngưỡng"
                value={triggeredCount}
                prefix={<WarningOutlined />}
                valueStyle={{
                  color: triggeredCount > 0 ? "#ff4d4f" : "#52c41a",
                }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          {/* By Rating Plan */}
          <Col xs={24} lg={12}>
            <Card title="📦 Tổng SIM theo gói cước">
              <Table
                dataSource={ratingPlanTableData}
                size="small"
                pagination={false}
                columns={[
                  {
                    title: "Gói cước",
                    dataIndex: "name",
                    key: "name",
                    render: (v) => <Tag color="blue">{v}</Tag>,
                  },
                  { title: "Số lượng SIM", dataIndex: "count", key: "count" },
                  {
                    title: "Tổng dung lượng đã dùng",
                    dataIndex: "totalUsed",
                    key: "totalUsed",
                    render: (v) => formatMB(v),
                  },
                ]}
              />
            </Card>
          </Col>

          {/* Summary by Status */}
          <Col xs={24} lg={12}>
            <Card title="📊 Tỉ lệ trạng thái SIM">
              <div style={{ marginBottom: 16 }}>
                <Text>Mới ({newSims} SIM)</Text>
                <Progress
                  percent={Math.round((newSims / total) * 100) || 0}
                  strokeColor="#8c8c8c"
                  style={{ marginBottom: 8 }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <Text>Đã hoạt động ({active} SIM)</Text>
                <Progress
                  percent={Math.round((active / total) * 100) || 0}
                  strokeColor="#faad14"
                  status="active"
                  style={{ marginBottom: 8 }}
                />
              </div>
              <div>
                <Text>Đã xác nhận ({confirmed} SIM)</Text>
                <Progress
                  percent={Math.round((confirmed / total) * 100) || 0}
                  strokeColor="#52c41a"
                />
              </div>
              <div
                style={{
                  marginTop: 16,
                  borderTop: "1px solid #f0f0f0",
                  paddingTop: 12,
                }}
              >
                <Statistic
                  title="Tổng dung lượng đã sử dụng"
                  value={formatMB(
                    ratingPlanGroups.reduce(
                      (acc, g) => acc + (g._sum.usedMB ?? 0),
                      0,
                    ),
                  )}
                />
              </div>
            </Card>
          </Col>

          {/* Recent Active SIMs */}
          <Col xs={24}>
            <Card
              title="⚡ SIM vừa kích hoạt (chờ xác nhận)"
              extra={
                <Button size="small" onClick={() => navigate("/sims")}>
                  Xem tất cả
                </Button>
              }
            >
              <Table
                dataSource={recentActive}
                rowKey="id"
                size="small"
                pagination={false}
                locale={{
                  emptyText: (
                    <Empty
                      description="Không có SIM nào đang chờ xác nhận"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  ),
                }}
                columns={[
                  {
                    title: "Số điện thoại",
                    dataIndex: "phoneNumber",
                    key: "phone",
                  },
                  {
                    title: "Gói cước",
                    dataIndex: "ratingPlanName",
                    key: "ratingPlan",
                    render: (v) => <Tag color="blue">{v ?? "—"}</Tag>,
                  },
                  {
                    title: "Trạng thái",
                    dataIndex: "status",
                    key: "status",
                    render: (v) => <SimStatusBadge status={v} />,
                  },
                  {
                    title: "Dung lượng đã dùng",
                    dataIndex: "usedMB",
                    key: "used",
                    render: (v) => formatMB(v),
                  },
                  {
                    title: "Thời gian kích hoạt",
                    dataIndex: "firstUsedAt",
                    key: "firstUsed",
                    render: (v) => v ?? "—",
                  },
                ]}
              />
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  );
};

export default Dashboard;
