import React, { useState, useMemo } from 'react';
import { Card, Select, Typography, Table, Tag, Space, Empty, Row, Col, Statistic, Input, Spin } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { useSims, useSimUsageHistory } from '../hooks/useSims';
import { useGroups } from '../hooks/useGroups';
import { formatMB, getUsageColor } from '../utils';
import SimStatusBadge from '../components/SIM/SimStatusBadge';

const { Title, Text } = Typography;
const { Option } = Select;

const UsageHistory: React.FC = () => {
  const { data: simsData, isLoading: simsLoading } = useSims({ pageSize: 200 });
  const { data: groups = [] } = useGroups();

  const sims = simsData?.data ?? [];

  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [filterCode, setFilterCode] = useState<string>('all');
  const [searchPhone, setSearchPhone] = useState('');

  const { data: historyData, isLoading: historyLoading } = useSimUsageHistory(selectedPhone);

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

  const selectedSim = useMemo(
    () => sims.find((s) => s.phoneNumber === selectedPhone) ?? null,
    [sims, selectedPhone],
  );

  const history = historyData?.history ?? [];

  const chartData = useMemo(
    () => [...history].sort((a, b) => a.month.localeCompare(b.month)),
    [history],
  );

  const totalUsed = useMemo(
    () => history.reduce((a, h) => a + h.usedMB, 0),
    [history],
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
        <Text strong style={{ cursor: 'pointer', color: selectedPhone === record.phoneNumber ? '#1890ff' : undefined }} onClick={() => setSelectedPhone(record.phoneNumber)}>{v}</Text>
      ),
    },
    { title: 'Mã sản phẩm', dataIndex: 'productCode', key: 'code', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: (v: any) => <SimStatusBadge status={v} /> },
    { title: 'Dung lượng hiện tại', dataIndex: 'usedMB', key: 'used', render: (v: number) => formatMB(v) },
    { title: 'Số tháng lịch sử', key: 'months', render: (_: unknown, record: SimRow) => (history.length > 0 && selectedPhone === record.phoneNumber ? history.length : '—') + ' tháng' },
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
            <Table
              dataSource={filteredSims}
              columns={simTableColumns}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 8 }}
              loading={simsLoading}
              locale={{ emptyText: <Empty description="Không có SIM nào" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
              rowClassName={(r) => (r.phoneNumber === selectedPhone ? 'row-selected' : '')}
              onRow={(record) => ({ onClick: () => setSelectedPhone(record.phoneNumber) })}
            />
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          {selectedSim ? (
            historyLoading
              ? <Spin style={{ display: 'block', margin: '40px auto' }} />
              : (
            <Space direction="vertical" style={{ width: '100%' }} size={16}>
              <Card title={`📊 Lịch sử: ${selectedSim.phoneNumber}`}>
                <Row gutter={16}>
                  <Col span={8}><Statistic title="Mã sản phẩm" value={selectedSim.productCode} /></Col>
                  <Col span={8}><Statistic title="Tổng đã dùng" value={formatMB(totalUsed)} /></Col>
                      <Col span={8}><Statistic title="Số tháng" value={history.length + ' tháng'} /></Col>
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
                  dataSource={[...history].sort((a, b) => b.month.localeCompare(a.month))}
                  columns={historyColumns}
                  rowKey="month"
                  size="small"
                  pagination={false}
                  locale={{ emptyText: 'Chưa có lịch sử' }}
                />
              </Card>
            </Space>
              )
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
