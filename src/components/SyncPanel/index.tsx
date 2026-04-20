import React, { useEffect, useRef, useState } from "react";
import { Button, Select, Space, Tooltip, Card, Typography } from "antd";
import { SyncOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { useSync } from "../../hooks/useSync";
import { queryKeys } from "../../hooks/queryKeys";

const { Text } = Typography;

const REFRESH_OPTIONS = [
  { label: "Tắt tự làm mới", value: 0 },
  { label: "10 giây", value: 10_000 },
  { label: "1 phút", value: 60_000 },
  { label: "5 phút", value: 300_000 },
];

export const SyncPanel: React.FC = () => {
  const { syncSims, syncRatingPlans, syncGroupSims } = useSync();
  const [refreshInterval, setRefreshInterval] = useState<number>(0);
  const qc = useQueryClient();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-refresh: invalidate all queries on the chosen interval
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (refreshInterval > 0) {
      timerRef.current = setInterval(() => {
        void qc.invalidateQueries({ queryKey: queryKeys.sims.all });
        void qc.invalidateQueries({ queryKey: queryKeys.ratingPlans.all });
        void qc.invalidateQueries({ queryKey: queryKeys.groupSims.all });
      }, refreshInterval);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [refreshInterval, qc]);

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

        <div style={{ width: 1, height: 20, background: "#d9d9d9" }} />

        <Space size={4}>
          <ClockCircleOutlined
            style={{ color: refreshInterval > 0 ? "#1677ff" : "#8c8c8c" }}
          />
          <Select
            value={refreshInterval}
            onChange={setRefreshInterval}
            options={REFRESH_OPTIONS}
            style={{ width: 160 }}
            size="small"
          />
        </Space>
      </Space>
    </Card>
  );
};
