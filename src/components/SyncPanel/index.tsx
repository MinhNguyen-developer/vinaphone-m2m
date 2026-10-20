import React from "react";
import dayjs from "dayjs";
import {
  Alert,
  Button,
  Progress,
  Space,
  Tooltip,
  Card,
  Typography,
} from "antd";
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
    statusError,
    triggerErrors,
  } = useSync();

  const syncItems = [
    { key: "syncSims", label: "SIM", status: statuses?.syncSims },
    {
      key: "syncRatingPlans",
      label: "Gói cước",
      status: statuses?.syncRatingPlans,
    },
    {
      key: "syncGroupSims",
      label: "Nhóm thuê bao",
      status: statuses?.syncGroupSims,
    },
    {
      key: "syncMonthlyUsage",
      label: "Dung lượng tháng",
      status: statuses?.syncMonthlyUsage,
    },
  ] as const;
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
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Space wrap align="center">
          <Text strong>Đồng bộ dữ liệu:</Text>

          <Tooltip title="Đồng bộ toàn bộ SIM từ Vinaphone">
            <Button
              icon={
                <SyncOutlined spin={isSimsSyncing} />
              }
              loading={isSimsSyncing}
              onClick={() => syncSims.mutate()}
            >
              SIM
            </Button>
          </Tooltip>

          <Tooltip title="Đồng bộ danh sách gói cước">
            <Button
              icon={
                <SyncOutlined spin={isRatingPlansSyncing} />
              }
              loading={isRatingPlansSyncing}
              onClick={() => syncRatingPlans.mutate()}
            >
              Gói cước
            </Button>
          </Tooltip>

          <Tooltip title="Đồng bộ nhóm thuê bao">
            <Button
              icon={
                <SyncOutlined spin={isGroupSimsSyncing} />
              }
              loading={isGroupSimsSyncing}
              onClick={() => syncGroupSims.mutate()}
            >
              Nhóm thuê bao
            </Button>
          </Tooltip>

          <Tooltip title="Đồng bộ dung lượng tháng (detail-plan). Có thể mất vài phút.">
            <Button
              icon={
                <SyncOutlined spin={isMonthlyUsageSyncing} />
              }
              loading={isMonthlyUsageSyncing}
              onClick={() => syncMonthlyUsage.mutate()}
            >
              Dung lượng tháng
            </Button>
          </Tooltip>

          <div style={{ width: 1, height: 20, background: "#d9d9d9" }} />
        </Space>

        {statusError && (
          <Alert
            showIcon
            type="error"
            message="Không thể tải tiến trình đồng bộ."
          />
        )}

        {syncItems.map(({ key, label, status }) => {
          const triggerError = triggerErrors[key];
          if (triggerError) {
            return (
              <Alert key={key} showIcon type="error" message={triggerError} />
            );
          }
          if (status?.state === "running") {
            return (
              <Alert
                key={key}
                showIcon
                type="info"
                message={`Đang đồng bộ ${label}`}
                description={
                  <>
                    <Progress percent={status.progressPercent} status="active" />
                    <Text type="secondary">{status.progress}</Text>
                  </>
                }
              />
            );
          }
          if (status?.state === "failed") {
            return (
              <Alert
                key={key}
                showIcon
                type="error"
                message={`Đồng bộ ${label} thất bại.`}
                description={
                  <>
                    <Progress
                      percent={status.progressPercent}
                      status="exception"
                    />
                    {import.meta.env.DEV && status.error && (
                      <Text type="danger">{status.error}</Text>
                    )}
                  </>
                }
              />
            );
          }
          if (status?.state === "completed") {
            return (
              <Alert
                key={key}
                showIcon
                type="success"
                message={`Đồng bộ ${label} hoàn tất.`}
                description={
                  <>
                    <Text>{status.progress}</Text>
                    {status.lastSyncedAt && (
                      <div>
                        <Text type="secondary">
                          Lần đồng bộ cuối: {dayjs(status.lastSyncedAt).format("YYYY-MM-DD hh:mm")}
                        </Text>
                      </div>
                    )}
                  </>
                }
              />
            );
          }
          return null;
        })}
      </Space>
    </Card>
  );
};
