import React from "react";
import { Button, Space, Tooltip, Card, Typography } from "antd";
import { SyncOutlined } from "@ant-design/icons";
import { useSync } from "../../hooks/useSync";

const { Text } = Typography;

export const SyncPanel: React.FC = () => {
  const { syncSims, syncRatingPlans, syncGroupSims, syncMonthlyUsage } =
    useSync();

  // Auto-refresh: invalidate all queries on the chosen interval

  return (
    <Card size="small" style={{ marginBottom: 16 }}>
      <Space wrap align="center">
        <Text strong>Đồng bộ dữ liệu:</Text>

        <Tooltip title="Đồng bộ toàn bộ SIM từ Vinaphone">
          <Button
            icon={<SyncOutlined spin={syncSims.isPending} />}
            loading={syncSims.isPending}
            onClick={() => syncSims.mutate()}
          >
            SIM
          </Button>
        </Tooltip>

        <Tooltip title="Đồng bộ danh sách gói cước">
          <Button
            icon={<SyncOutlined spin={syncRatingPlans.isPending} />}
            loading={syncRatingPlans.isPending}
            onClick={() => syncRatingPlans.mutate()}
          >
            Gói cước
          </Button>
        </Tooltip>

        <Tooltip title="Đồng bộ nhóm thuê bao">
          <Button
            icon={<SyncOutlined spin={syncGroupSims.isPending} />}
            loading={syncGroupSims.isPending}
            onClick={() => syncGroupSims.mutate()}
          >
            Nhóm thuê bao
          </Button>
        </Tooltip>

        <Tooltip title="Đồng bộ dung lượng tháng (detail-plan). Có thể mất vài phút.">
          <Button
            icon={<SyncOutlined spin={syncMonthlyUsage.isPending} />}
            loading={syncMonthlyUsage.isPending}
            onClick={() => syncMonthlyUsage.mutate()}
          >
            Dung lượng tháng
          </Button>
        </Tooltip>

        <div style={{ width: 1, height: 20, background: "#d9d9d9" }} />
      </Space>
    </Card>
  );
};
