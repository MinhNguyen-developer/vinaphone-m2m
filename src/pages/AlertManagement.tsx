import React, { useMemo, useState } from 'react';
import { Card, Table, Tag, Typography, Alert, Tabs, Switch, Select, Button, Space, Tooltip } from 'antd';
import { BellFilled, BellOutlined, CheckCircleFilled, CheckCircleOutlined } from '@ant-design/icons';
import { useStore } from '../store/useStore';
import type { AlertConfig, SimCard } from '../types';
import { formatMB } from '../utils';
import SimStatusBadge from '../components/SIM/SimStatusBadge';

const { Title, Text } = Typography;
const { Option } = Select;

const AlertManagement: React.FC = () => {
  const { sims, groups, alerts, checkedAlertPairs, toggleAlertCheck, clearCheckedAlerts } = useStore();
  const [filterProductCode, setFilterProductCode] = useState<string>('all');

  const productCodes = useMemo(() => [...new Set(sims.map((s) => s.productCode))], [sims]);

  const triggeredSims = useMemo(() => {
    const result: { sim: SimCard; alert: AlertConfig }[] = [];
    sims.forEach((sim) => {
      if (filterProductCode !== 'all' && sim.productCode !== filterProductCode) return;
      alerts.forEach((alert) => {
        if (!alert.active) return;
        const match =
          alert.simId === sim.id ||
          (alert.groupId && sim.groupIds.includes(alert.groupId)) ||
          (alert.productCode && alert.productCode === sim.productCode);
        if (match && sim.usedMB >= alert.thresholdMB) {
          if (!result.find((r) => r.sim.id === sim.id && r.alert.id === alert.id))
            result.push({ sim, alert });
        }
      });
    });
    return result;
  }, [sims, alerts, filterProductCode]);

  const alertColumns = [
    { title: 'Tên cảnh báo', dataIndex: 'label', key: 'label' },
    { title: 'Ngưỡng', dataIndex: 'thresholdMB', key: 'threshold', render: (v: number) => <Tag color="red">{formatMB(v)}</Tag> },
    {
      title: 'Áp dụng cho', key: 'target',
      render: (_: unknown, record: AlertConfig) => {
        if (record.simId) { const sim = sims.find((s) => s.id === record.simId); return <Tag color="cyan">SIM: {sim?.phoneNumber ?? record.simId}</Tag>; }
        if (record.groupId) { const g = groups.find((x) => x.id === record.groupId); return <Tag color="purple">Nhóm: {g?.name ?? record.groupId}</Tag>; }
        if (record.productCode) return <Tag color="blue">Mã: {record.productCode}</Tag>;
        return <Tag>Tất cả</Tag>;
      },
    },
    { title: 'Kích hoạt', dataIndex: 'active', key: 'active', render: (v: boolean) => <Switch checked={v} size="small" disabled /> },
  ];

  const triggeredColumns = [
    {
      title: '',
      key: 'checked',
      width: 48,
      render: (_: unknown, r: { sim: SimCard; alert: AlertConfig }) => {
        const key = `${r.sim.id}-${r.alert.id}`;
        const done = checkedAlertPairs.includes(key);
        return (
          <Tooltip title={done ? 'Đánh dấu chưa kiểm tra' : 'Đánh dấu đã kiểm tra'}>
            <Button
              type="text"
              icon={done ? <CheckCircleFilled style={{ color: '#52c41a', fontSize: 18 }} /> : <CheckCircleOutlined style={{ color: '#bfbfbf', fontSize: 18 }} />}
              onClick={() => toggleAlertCheck(key)}
            />
          </Tooltip>
        );
      },
    },
    { title: 'Số điện thoại', key: 'phone', render: (_: unknown, r: { sim: SimCard; alert: AlertConfig }) => <Text strong style={{ textDecoration: checkedAlertPairs.includes(`${r.sim.id}-${r.alert.id}`) ? 'line-through' : undefined, color: checkedAlertPairs.includes(`${r.sim.id}-${r.alert.id}`) ? '#999' : undefined }}>{r.sim.phoneNumber}</Text> },
    { title: 'Mã sản phẩm', key: 'code', render: (_: unknown, r: { sim: SimCard; alert: AlertConfig }) => <Tag color="blue">{r.sim.productCode}</Tag> },
    { title: 'Trạng thái', key: 'status', render: (_: unknown, r: { sim: SimCard; alert: AlertConfig }) => <SimStatusBadge status={r.sim.status} /> },
    { title: 'Dung lượng đã dùng', key: 'used', render: (_: unknown, r: { sim: SimCard; alert: AlertConfig }) => <Text style={{ color: '#ff4d4f' }} strong>{formatMB(r.sim.usedMB)}</Text> },
    { title: 'Ngưỡng cảnh báo', key: 'threshold', render: (_: unknown, r: { sim: SimCard; alert: AlertConfig }) => <Tag color="red">{formatMB(r.alert.thresholdMB)}</Tag> },
    { title: 'Cảnh báo', key: 'alertLabel', render: (_: unknown, r: { sim: SimCard; alert: AlertConfig }) => r.alert.label },
  ];

  const checkedCount = triggeredSims.filter((r) => checkedAlertPairs.includes(`${r.sim.id}-${r.alert.id}`)).length;

  const items = [
    {
      key: 'triggered',
      label: <span><BellFilled style={{ color: '#ff4d4f' }} /> Danh sách cảnh báo ({triggeredSims.length})</span>,
      children: (
        <>
          <Card style={{ marginBottom: 12 }}>
            <Space wrap>
              <Select value={filterProductCode} onChange={setFilterProductCode} style={{ width: 200 }}>
                <Option value="all">Tất cả mã sản phẩm</Option>
                {productCodes.map((c) => <Option key={c} value={c}>{c}</Option>)}
              </Select>
              {checkedCount > 0 && (
                <Button size="small" onClick={clearCheckedAlerts}>
                  Xóa đánh dấu ({checkedCount})
                </Button>
              )}
              {checkedCount > 0 && <Tag color="green">✓ Đã kiểm tra: {checkedCount}/{triggeredSims.length}</Tag>}
            </Space>
          </Card>
          {triggeredSims.length === 0
            ? <Alert message="✅ Không có SIM nào vượt ngưỡng cảnh báo." type="success" showIcon />
            : (
              <Card>
                <Alert message={`⚠️ ${triggeredSims.length} SIM đang vượt ngưỡng. Cần kiểm tra!`} type="error" showIcon style={{ marginBottom: 16 }} />
                <Table
                  dataSource={triggeredSims}
                  rowKey={(r) => `${r.sim.id}-${r.alert.id}`}
                  size="middle"
                  columns={triggeredColumns}
                  rowClassName={(r) => checkedAlertPairs.includes(`${r.sim.id}-${r.alert.id}`) ? 'row-checked' : ''}
                />
              </Card>
            )}
        </>
      ),
    },
    {
      key: 'config',
      label: <span><BellOutlined /> Cấu hình cảnh báo ({alerts.length})</span>,
      children: (
        <Card title="Danh sách cảnh báo đã cài đặt">
          <Table dataSource={alerts} columns={alertColumns} rowKey="id" size="middle" pagination={false} />
        </Card>
      ),
    },
  ];

  return (
    <div>
      <Title level={3}>🔔 Cảnh báo dung lượng</Title>
      <Tabs defaultActiveKey="triggered" items={items} />
      <style>{`
        .row-checked td { opacity: 0.6; }
      `}</style>
    </div>
  );
};

export default AlertManagement;
