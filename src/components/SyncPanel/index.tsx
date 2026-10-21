import React from "react";
import { Button, Space, Tooltip, Card, Typography } from "antd";
import { SyncOutlined } from "@ant-design/icons";
import { useSync } from "../../hooks/useSync";

const { Text } = Typography;

export const SyncPanel: React.FC = () => {
  const {
    syncSims,
    syncRatingPlans,
    syncGroupSims,
    syncMonthlyUsage,
    statuses,
  } = useSync();

  const isSimsSyncing =
    syncSims.isPending || statuses?.syncSims.state === "running";
  const isRatingPlansSyncing =
    syncRatingPlans.isPending || statuses?.syncRatingPlans.state === "running";
  const isGroupSimsSyncing =
    syncGroupSims.isPending || statuses?.syncGroupSims.state === "running";
  const isMonthlyUsageSyncing =
    syncMonthlyUsage.isPending ||
    statuses?.syncMonthlyUsage.state === "running";

  return (
    <Card size="small" style={{ marginBottom: 16 }}>
      <Space wrap align="center">
        <Text strong>Đồng bộ dữ liệu:</Text>

        <Tooltip title="Đồng bộ toàn bộ SIM từ Vinaphone">
          <Button
            icon={<SyncOutlined />}
            disabled={isSimsSyncing}
            onClick={() => syncSims.mutate()}
          >
            SIM
          </Button>
        </Tooltip>

        <Tooltip title="Đồng bộ danh sách gói cước">
          <Button
            icon={<SyncOutlined />}
            disabled={isRatingPlansSyncing}
            onClick={() => syncRatingPlans.mutate()}
          >
            Gói cước
          </Button>
        </Tooltip>

        <Tooltip title="Đồng bộ nhóm thuê bao">
          <Button
            icon={<SyncOutlined />}
            disabled={isGroupSimsSyncing}
            onClick={() => syncGroupSims.mutate()}
          >
            Nhóm thuê bao
          </Button>
        </Tooltip>

        <Tooltip title="Đồng bộ dung lượng tháng (detail-plan). Có thể mất vài phút.">
          <Button
            icon={<SyncOutlined />}
            disabled={isMonthlyUsageSyncing}
            onClick={() => syncMonthlyUsage.mutate()}
          >
            Dung lượng tháng
          </Button>
        </Tooltip>
      </Space>
    </Card>
  );
};
