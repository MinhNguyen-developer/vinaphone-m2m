import React, { useState } from 'react';
import { Card, Table, Tag, Typography, Alert, Tabs, Switch, Select, Button, Space, Tooltip, Spin } from 'antd';
import { BellFilled, BellOutlined, CheckCircleFilled, CheckCircleOutlined } from '@ant-design/icons';
import type { AlertConfig, TriggeredAlert } from '../types';
import { formatMB } from '../utils';
import SimStatusBadge from '../components/SIM/SimStatusBadge';
import { useAlerts, useCheckAlert, useTriggeredAlerts } from '../hooks/useAlerts';
import { useSims } from '../hooks/useSims';
import { useGroups } from '../hooks/useGroups';

const { Title, Text } = Typography;
const { Option } = Select;

const AlertManagement: React.FC = () => {
  const { data: simsData } = useSims({ pageSize: 200 });
  const { data: groups = [] } = useGroups();
  const { data: alerts = [], isLoading: alertsLoading } = useAlerts();
  const [filterProductCode, setFilterProductCode] = useState<string>('all');
  const { data: triggeredData, isLoading: triggeredLoading } = useTriggeredAlerts(
    filterProductCode !== 'all' ? filterProductCode : undefined,
  );
  const checkAlert = useCheckAlert();

  const sims = simsData?.data ?? [];
  const triggeredList: TriggeredAlert[] = triggeredData?.data ?? [];

  const productCodes = [...new Set(sims.map((s) => s.productCode))];

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
      render: (_: unknown, r: TriggeredAlert) => {
        const done = r.checked;
        return (
          <Tooltip title={done ? 'Đánh dấu chưa kiểm tra' : 'Đánh dấu đã kiểm tra'}>
            <Button
              type="text"
              loading={checkAlert.isPending}
              icon={
                done
                  ? <CheckCircleFilled style={{ color: '#52c41a', fontSize: 18 }} />
                  : <CheckCircleOutlined style={{ color: '#bfbfbf', fontSize: 18 }} />
              }
              onClick={() =>
                checkAlert.mutate({ simId: r.sim.id, alertId: r.alert.id, checked: !done })
              }
            />
          </Tooltip>
        );
      },
    },
    {
      title: 'Số điện thoại', key: 'phone',
      render: (_: unknown, r: TriggeredAlert) => (
        <Text strong style={{ textDecoration: r.checked ? 'line-through' : undefined, color: r.checked ? '#999' : undefined }}>
          {r.sim.phoneNumber}
        </Text>
      ),
    },
    { title: 'Mã sản phẩm', key: 'code', render: (_: unknown, r: TriggeredAlert) => <Tag color="blue">{r.sim.productCode}</Tag> },
    { title: 'Trạng thái', key: 'status', render: (_: unknown, r: TriggeredAlert) => <SimStatusBadge status={r.sim.status} /> },
    { title: 'Dung lượng đã dùng', key: 'used', render: (_: unknown, r: TriggeredAlert) => <Text style={{ color: '#ff4d4f' }} strong>{formatMB(r.sim.usedMB)}</Text> },
    { title: 'Ngưỡng cảnh báo', key: 'threshold', render: (_: unknown, r: TriggeredAlert) => <Tag color="red">{formatMB(r.alert.thresholdMB)}</Tag> },
    { title: 'Cảnh báo', key: 'alertLabel', render: (_: unknown, r: TriggeredAlert) => r.alert.label },
  ];

  const checkedCount = triggeredList.filter((r) => r.checked).length;

  const items = [
    {
      key: 'triggered',
      label: <span><BellFilled style={{ color: '#ff4d4f' }} /> Danh sách cảnh báo ({triggeredList.length})</span>,
      children: (
        <>
          <Card style={{ marginBottom: 12 }}>
            <Space wrap>
              <Select value={filterProductCode} onChange={setFilterProductCode} style={{ width: 200 }}>
                <Option value="all">Tất cả mã sản phẩm</Option>
                {productCodes.map((c) => <Option key={c} value={c}>{c}</Option>)}
              </Select>
              {checkedCount > 0 && <Tag color="green">✓ Đã kiểm tra: {checkedCount}/{triggeredList.length}</Tag>}
            </Space>
          </Card>
          {triggeredLoading
            ? <Spin style={{ display: 'block', margin: '40px auto' }} />
            : triggeredList.length === 0
              ? <Alert message="✅ Không có SIM nào vượt ngưỡng cảnh báo." type="success" showIcon />
              : (
                <Card>
                  <Alert message={`⚠️ ${triggeredList.length} SIM đang vượt ngưỡng. Cần kiểm tra!`} type="error" showIcon style={{ marginBottom: 16 }} />
                  <Table
                    dataSource={triggeredList}
                    rowKey={(r) => `${r.sim.id}-${r.alert.id}`}
                    size="middle"
                    columns={triggeredColumns}
                    rowClassName={(r) => (r.checked ? 'row-checked' : '')}
                  />
                </Card>
              )
          }
        </>
      ),
    },
    {
      key: 'config',
      label: <span><BellOutlined /> Cấu hình cảnh báo ({alerts.length})</span>,
      children: (
        <Card title="Danh sách cảnh báo đã cài đặt">
          <Table dataSource={alerts} columns={alertColumns} rowKey="id" size="middle" pagination={false} loading={alertsLoading} />
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
