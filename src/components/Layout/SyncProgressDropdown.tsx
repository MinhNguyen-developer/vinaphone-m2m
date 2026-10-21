import { useState, type FC } from "react";
import dayjs from "dayjs";
import {
  Alert,
  Badge,
  Button,
  Dropdown,
  Progress,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import { BellOutlined } from "@ant-design/icons";
import type { SyncJobName } from "../../api/sync.api";
import { useSync } from "../../hooks/useSync";

const { Text } = Typography;

const syncJobs: { key: SyncJobName; label: string }[] = [
  { key: "syncSims", label: "SIM" },
  { key: "syncRatingPlans", label: "Gói cước" },
  { key: "syncGroupSims", label: "Nhóm thuê bao" },
  { key: "syncMonthlyUsage", label: "Dung lượng tháng" },
];

const statusLabels = {
  idle: { label: "Chưa đồng bộ", color: "default" },
  running: { label: "Đang đồng bộ", color: "processing" },
  completed: { label: "Hoàn tất", color: "success" },
  failed: { label: "Thất bại", color: "error" },
} as const;

export const SyncProgressDropdown: FC = () => {
  const [open, setOpen] = useState(false);
  const { statuses, statusError, triggerErrors } = useSync();
  const runningJobs = syncJobs.flatMap(({ key, label }) => {
    const status = statuses?.[key];
    return status?.state === "running" ? [{ key, label, status }] : [];
  });

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      trigger={["click"]}
      placement="bottomRight"
      popupRender={() => (
        <div
          id="sync-progress-dropdown"
          role="region"
          aria-label="Trạng thái đồng bộ"
          style={{
            width: "min(360px, calc(100vw - 24px))",
            maxHeight: "min(60vh, 420px)",
            overflowY: "auto",
            padding: 16,
            background: "#fff",
            borderRadius: 8,
            boxShadow: "0 6px 16px rgba(0, 0, 0, 0.12)",
          }}
        >
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Space style={{ width: "100%", justifyContent: "space-between" }}>
              <Text strong>Trạng thái đồng bộ</Text>
              {runningJobs.length > 0 && (
                <Text type="secondary">{runningJobs.length}</Text>
              )}
            </Space>

            {statusError && (
              <Alert
                showIcon
                type="error"
                message="Không thể cập nhật tiến trình đồng bộ."
              />
            )}

            {!statuses && !statusError && (
              <Space>
                <Spin size="small" />
                <Text type="secondary">Đang tải trạng thái đồng bộ…</Text>
              </Space>
            )}

            {statuses && runningJobs.length === 0 && (
              <Text type="secondary">Không có tác vụ đang chạy.</Text>
            )}

            {statuses && (
              <div role="list" style={{ display: "grid", gap: 12 }}>
                {syncJobs.map(({ key, label }) => {
                  const status = statuses[key];
                  const triggerError = triggerErrors[key];
                  const currentState = triggerError ? "failed" : status.state;

                  return (
                    <div key={key} role="listitem">
                      <Space
                        style={{
                          width: "100%",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text strong>{label}</Text>
                        <Tag color={statusLabels[currentState].color}>
                          {statusLabels[currentState].label}
                        </Tag>
                      </Space>

                      {triggerError && (
                        <Text type="danger">{triggerError}</Text>
                      )}
                      {!triggerError && status.state === "running" && (
                        <>
                          <Progress
                            percent={status.progressPercent}
                            status="active"
                          />
                          <Text type="secondary">{status.progress}</Text>
                        </>
                      )}
                      {!triggerError && status.state === "completed" && (
                        <Text>{status.progress}</Text>
                      )}
                      {!triggerError &&
                        status.state === "failed" &&
                        import.meta.env.DEV &&
                        status.error && (
                          <Text type="danger">{status.error}</Text>
                        )}
                      {status.lastSyncedAt && (
                        <div>
                          <Text type="secondary">
                            Lần đồng bộ cuối: {dayjs(status.lastSyncedAt).format("YYYY-MM-DD hh:mm")}
                          </Text>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Space>
        </div>
      )}
    >
      <Badge count={runningJobs.length} size="small" offset={[-3, 4]}>
        <Button
          type="text"
          shape="circle"
          icon={<BellOutlined />}
          aria-label={`Trạng thái đồng bộ; đang chạy ${runningJobs.length} tác vụ`}
          aria-expanded={open}
          aria-controls="sync-progress-dropdown"
          aria-haspopup="true"
          style={{ minWidth: 44, height: 44, fontSize: 18 }}
        />
      </Badge>
    </Dropdown>
  );
};
