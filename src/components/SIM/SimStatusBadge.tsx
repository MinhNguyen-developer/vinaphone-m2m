import React from "react";
import { Tag } from "antd";
import { SimStatus } from "../../types";

interface Props {
  status: SimStatus;
}

const statusConfig: Record<SimStatus, { color: string; label: string }> = {
  [SimStatus.NEW]: { color: "default", label: "🆕 Mới" },
  [SimStatus.ACTIVE]: { color: "processing", label: "⚡ Đã hoạt động" },
  [SimStatus.CONFIRMED]: { color: "success", label: "✅ Đã xác nhận" },
  [SimStatus.CANCELLED]: { color: "error", label: "❌ Đã hủy" },
  [SimStatus.LOCKED]: { color: "warning", label: "⛔ Đã khoá" },
  [SimStatus.PENDING_CANCEL]: { color: "orange", label: "⏳ Chờ huỷ" },
  [SimStatus.REVOKED]: { color: "red", label: "🛑 Đã thu hồi" },
  [SimStatus.PENDING_LOCK]: { color: "yellow", label: "⏳ Chờ khoá" },
};

const SimStatusBadge: React.FC<Props> = ({ status }) => {
  const cfg = statusConfig[status] ?? { color: "default", label: status };
  return <Tag color={cfg.color}>{cfg.label}</Tag>;
};

export default SimStatusBadge;
