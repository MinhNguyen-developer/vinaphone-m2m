import React, { useState, useMemo } from 'react';
import { Card, Select, Typography, Table, Tag, Space, Empty, Row, Col, Statistic, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { useStore } from '../store/useStore';
import { formatMB, getUsageColor } from '../utils';
import SimStatusBadge from '../components/SIM/SimStatusBadge';

const { Title, Text } = Typography;
const { Option } = Select;

const UsageHistory: React.FC = () => {
  const { sims, groups } = useStore();
  const [selectedSimId, setSelectedSimId] = useState<string | null>(null);
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [filterCode, setFilterCode] = useState<string>('all');
  const [searchPhone, setSearchPhone] = useState('');

  const productCodes = useMemo(() => [...new Set(sims.map((s) => s.productCode))], [sims]);

  const filteredSims = useMemo(
    () => sims.filter((s) => {
      if (filterGroup !== 'all' && !s.groupIds.includes(filterGroup)) return false;
      if (filterCode !== 'all' && s.productCode !== filterCode) return false;
      if (searchPhone && !s.phoneNumber.includes(searchPhone)) return false;
      return true;
    }),
    [sims, filterGroup, filterCode, searchPhone]
  );

  const selectedSim = useMemo(() => sims.find((s) => s.id === selectedSimId) ?? null, [sims, selectedSimId]);

  const chartData = useMemo(() => {
    if (!selectedSim) return [];
    return [...selectedSim.usageHistory]
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((h) => ({ month: h.month, usedMB: h.usedMB }));
  }, [selectedSim]);

  const totalUsed = useMemo(
    () => selectedSim?.usageHistory.reduce((a, h) => a + h.usedMB, 0) ?? 0,
    [selectedSim]
  );

  const historyColumns = [
    { title: 'Tháng', dataIndex: 'month', key: 'month', render: (v: string) => <Tag color="blue">{v}</Tag> },
    {
      title: 'Dung lượng sử dụng', dataIndex: 'usedMB', key: 'used',
      render: (v: number) => <Text style={{ color: getUsageColor(v > 5000 ? 100 : v > 1000 ? 70 : 30) }}>{formatMB(v)}</Text>,
    },
  ];

  type SimRow = typeof sims[0];

  const simTableColumns = [
    {
      title: 'Số điện thoại', dataIndex: 'phoneNumber', key: 'phone',
      render: (v: string, record: SimRow) => (
        <Text strong style={{ cursor: 'pointer', color: selectedSimId === record.id ? '#1890ff' : undefined }} onClick={() => setSelectedSimId(record.id)}>{v}</Text>
      ),
    },
    { title: 'Mã sản phẩm', dataIndex: 'productCode', key: 'code', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: (v: any) => <SimStatusBadge status={v} /> },
    { title: 'Dung lượng hiện tại', dataIndex: 'usedMB', key: 'used', render: (v: number) => formatMB(v) },
    { title: 'Số tháng lịch sử', key: 'months', render: (_: unknown, record: SimRow) => record.usageHistory.length + ' tháng' },
  ];

  return (
    <div>
      <Title level={3}>📅 Lịch sử sử dụng dung lượng</Title>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="Tìm theo số điện thoại"
            prefix={<SearchOutlined />}
            value={searchPhone}
            onChange={(e) => setSearchPhone(e.target.value)}
            allowClear
            style={{ width: 200 }}
          />
          <Select value={filterGroup} onChange={setFilterGroup} style={{ width: 200 }}>
            <Option value="all">Tất cả nhóm</Option>
            {groups.map((g) => <Option key={g.id} value={g.id}>{g.name}</Option>)}
          </Select>
          <Select value={filterCode} onChange={setFilterCode} style={{ width: 200 }}>
            <Option value="all">Tất cả mã sản phẩm</Option>
            {productCodes.map((c) => <Option key={c} value={c}>{c}</Option>)}
          </Select>
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={10}>
          <Card title={`📱 Chọn SIM (${filteredSims.length})`}>
            <Table dataSource={filteredSims} columns={simTableColumns} rowKey="id" size="small" pagination={{ pageSize: 8 }} rowClassName={(r) => (r.id === selectedSimId ? 'row-selected' : '')} onRow={(record) => ({ onClick: () => setSelectedSimId(record.id) })} />
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          {selectedSim ? (
            <Space direction="vertical" style={{ width: '100%' }} size={16}>
              <Card title={`📊 Lịch sử: ${selectedSim.phoneNumber}`}>
                <Row gutter={16}>
                  <Col span={8}><Statistic title="Mã sản phẩm" value={selectedSim.productCode} /></Col>
                  <Col span={8}><Statistic title="Tổng đã dùng" value={formatMB(totalUsed)} /></Col>
                  <Col span={8}><Statistic title="Số tháng" value={selectedSim.usageHistory.length + ' tháng'} /></Col>
                </Row>
                <div style={{ marginTop: 8 }}><SimStatusBadge status={selectedSim.status} /></div>
              </Card>

              {chartData.length > 0 && (
                <Card title="📈 Biểu đồ dung lượng theo tháng">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(v) => `${v}MB`} />
                      <RechartTooltip formatter={(v) => [formatMB(Number(v) || 0), 'Dung lượng']} />
                      <Bar dataKey="usedMB" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={index} fill={getUsageColor(entry.usedMB > 5000 ? 100 : entry.usedMB > 1000 ? 70 : 30)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              )}

              <Card title="📋 Chi tiết lịch sử theo tháng">
                <Table
                  dataSource={[...selectedSim.usageHistory].sort((a, b) => b.month.localeCompare(a.month))}
                  columns={historyColumns}
                  rowKey="month"
                  size="small"
                  pagination={false}
                  locale={{ emptyText: 'Chưa có lịch sử' }}
                />
              </Card>
            </Space>
          ) : (
            <Card><Empty description="Chọn một SIM để xem lịch sử sử dụng" /></Card>
          )}
        </Col>
      </Row>

      <style>{`
        .row-selected td { background: #e6f4ff !important; }
        .row-selected:hover td { background: #bae0ff !important; }
      `}</style>
    </div>
  );
};

export default UsageHistory;
