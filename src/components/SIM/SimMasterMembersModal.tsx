import React from "react";
import {
  Modal,
  Card,
  Table,
  Tag,
  Typography,
  Descriptions,
  Space,
  Spin,
  Progress,
} from "antd";
import { CrownOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { formatMB, getUsageColor } from "../../utils";
import SimStatusBadge from "./SimStatusBadge";
import { useSimDetail } from "../../hooks/useSims";
import type { ColumnsType } from "antd/lib/table";
import SimGroupMembersTable from "./SimGroupMembersTable";

const { Title, Text } = Typography;

type SogData = {
  key: string;
  sogGroupName: string | null | undefined;
  sogIsOwner: boolean | null | undefined;
  used: number;
  total: number | null;
  pct: number | null;
};

interface Props {
  simId: string | null;
  onClose: () => void;
}

const SimMasterMembersModal: React.FC<Props> = ({ simId, onClose }) => {
  const { data: sim, isLoading: simLoading } = useSimDetail(simId);

  const currentMonth = dayjs().format("YYYY-MM");

  // SOG row: the current sim's own rating plan usage
  const sogRow = sim?.sogGroupId
    ? (() => {
        const monthly = sim.monthlyDataUsages?.find(
          (m) => m.month === currentMonth,
        );
        const used = monthly?.dataUsedMB ?? sim.usedMB ?? 0;
        const total =
          (monthly as { totalData?: number | null })?.totalData ?? null;
        const pct =
          total && total > 0
            ? Math.min(Math.round((used / total) * 100), 100)
            : null;
        return { sim, used, total, pct };
      })()
    : null;

  const columns: ColumnsType<SogData> = [
    {
      title: "Tên Gói Cước",
      dataIndex: "sogGroupName",
      key: "sogGroupName",
      render: (v) => <Text>{v ?? "—"}</Text>,
    },
    {
      title: "Loại Gói Cước",
      dataIndex: "sogIsOwner",
      key: "sogIsOwner",
      width: 140,
      render: (v) =>
        v == null ? (
          <Text type="secondary">—</Text>
        ) : v ? (
          <Tag color="gold">Chủ nhóm</Tag>
        ) : (
          <Tag color="cyan">Thành viên</Tag>
        ),
    },
    {
      title: "Dung Lượng Sử Dụng (MB)",
      key: "usage",
      width: 240,
      render: (_v, r) =>
        r.sogIsOwner ? (
          <Space orientation="vertical" size={2} style={{ width: "100%" }}>
            <Text
              style={{
                color: r.pct != null ? getUsageColor(r.pct) : undefined,
              }}
            >
              {r.total
                ? `${r.used.toLocaleString()} / ${r.total.toLocaleString()}`
                : r.used.toLocaleString()}
            </Text>
            {r.pct != null && (
              <Progress
                percent={r.pct}
                size="small"
                showInfo={false}
                strokeColor={r.pct >= 90 ? "#ff4d4f" : "#1890ff"}
              />
            )}
          </Space>
        ) : (
          "-"
        ),
    },
  ];

  const sogDataSource: SogData[] = sim
    ? [
        {
          key: sim.id,
          sogGroupName: sim.sogGroupName ?? sim.sogMaGoi,
          sogIsOwner: sim.sogIsOwner,
          used: sogRow?.used ?? 0,
          total: sogRow?.total ?? null,
          pct: sogRow?.pct ?? null,
        },
      ]
    : [];

  return (
    <Modal
      open={!!simId}
      onCancel={onClose}
      footer={null}
      width={860}
      centered
      destroyOnHidden
      title={
        sim?.sogIsOwner ? (
          <Space>
            <CrownOutlined style={{ color: "#faad14" }} />
            <span>
              SIM chủ <Tag color="gold">{sim.phoneNumber}</Tag>
            </span>
          </Space>
        ) : (
          <span>{sim ? `SIM ${sim.phoneNumber}` : "Đang tải..."}</span>
        )
      }
    >
      <Spin spinning={simLoading} description="Đang tải...">
        <Space orientation="vertical" size="medium">
          <Descriptions column={2} size="small">
            <Descriptions.Item label="Số điện thoại">
              {sim?.phoneNumber}
            </Descriptions.Item>
            <Descriptions.Item label="IMSI">
              {sim?.imsi ?? "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Mã hợp đồng">
              {sim?.contractCode ?? "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <SimStatusBadge status={sim?.status || 1} />
            </Descriptions.Item>
            {sim?.sogGroupId ? (
              <Descriptions.Item label="Nhóm gói cước" span={2}>
                {sim.sogGroupName ?? sim.sogMaGoi ?? sim.sogGroupId}
              </Descriptions.Item>
            ) : (
              <Descriptions.Item label="SIM chủ" span={2}>
                <Text type="secondary">Chưa gán SIM chủ</Text>
              </Descriptions.Item>
            )}
          </Descriptions>

          {/* SOG group table */}
          {sogRow && (
            <Card
              size="small"
              title={
                <Space orientation="vertical">
                  <Title level={5}>Thông tin nhóm gói cước</Title>
                  <Text
                    style={{
                      fontWeight: "lighter",
                    }}
                  >
                    Dung lượng đã sử dụng: {formatMB(sim?.usedMB || 0)}
                  </Text>
                </Space>
              }
              style={{ marginBottom: 16 }}
            >
              <Table
                dataSource={sogDataSource}
                rowKey="key"
                size="small"
                loading={simLoading}
                pagination={false}
                columns={columns}
                expandable={{
                  rowExpandable: (r) =>
                    r.sogIsOwner === true && !!sim?.sogGroupId,
                  expandedRowRender: () => (
                    <SimGroupMembersTable groupId={sim!.sogGroupId!} />
                  ),
                  defaultExpandAllRows: true,
                }}
              />
            </Card>
          )}
        </Space>
      </Spin>
    </Modal>
  );
};

export default SimMasterMembersModal;
