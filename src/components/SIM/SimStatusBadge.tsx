import React from 'react';
import { Tag } from 'antd';
import { SimStatus } from '../../types';

interface Props {
  status: SimStatus;
}

const statusConfig: Record<SimStatus, { color: string; label: string }> = {
  [SimStatus.NEW]: { color: 'default', label: '🆕 Mới' },
  [SimStatus.ACTIVE]: { color: 'processing', label: '⚡ Đã hoạt động' },
  [SimStatus.CONFIRMED]: { color: 'success', label: '✅ Đã xác nhận' },
};

const SimStatusBadge: React.FC<Props> = ({ status }) => {
  const cfg = statusConfig[status] ?? { color: 'default', label: status };
  return <Tag color={cfg.color}>{cfg.label}</Tag>;
};

export default SimStatusBadge;
