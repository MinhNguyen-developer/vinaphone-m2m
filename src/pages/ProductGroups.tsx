import React, { useMemo, useState } from 'react';
import { Card, Table, Tag, Typography, Space, Badge, Select, Button } from 'antd';
import { TeamOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useStore } from '../store/useStore';
import SimStatusBadge from '../components/SIM/SimStatusBadge';
import { formatMB } from '../utils';

const { Title, Text } = Typography;

const ProductGroups: React.FC = () => {
  const { groups, sims } = useStore();
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [sortUsage, setSortUsage] = useState<'asc' | 'desc' | 'none'>('none');

  const groupStats = useMemo(
    () =>
      groups.map((g) => {
        const gs = sims.filter((s) => s.groupIds.includes(g.id));
        return { ...g, simCount: gs.length, totalUsedMB: gs.reduce((a, s) => a + s.usedMB, 0) };
      }),
    [groups, sims]
  );

  const simsInGroup = useMemo(() => {
    if (!selectedGroup) return [];
    let result = sims.filter((s) => s.groupIds.includes(selectedGroup));
    if (sortUsage === 'asc') result = [...result].sort((a, b) => a.usedMB - b.usedMB);
    else if (sortUsage === 'desc') result = [...result].sort((a, b) => b.usedMB - a.usedMB);
    return result;
  }, [selectedGroup, sims, sortUsage]);

  type GroupRow = (typeof groupStats)[0];
  type SimRow = (typeof sims)[0];

  const groupColumns: ColumnsType<GroupRow> = [
    {
      title: 'Tên nhóm', dataIndex: 'name', key: 'name',
      render: (v, record) => (
        <Button type="link" onClick={() => setSelectedGroup(record.id)} style={{ padding: 0 }}>
          <TeamOutlined /> {v}
        </Button>
      ),
    },
    { title: 'Mô tả', dataIndex: 'description', key: 'desc', render: (v) => v ?? <Text type="secondary">—</Text> },
    { title: 'Số SIM', dataIndex: 'simCount', key: 'count', render: (v) => <Badge count={v} showZero style={{ background: '#1890ff' }} /> },
    { title: 'Tổng dung lượng', dataIndex: 'totalUsedMB', key: 'total', render: (v) => formatMB(v) },
    { title: 'Ngày tạo', dataIndex: 'createdAt', key: 'created' },
  ];

  const simColumns: ColumnsType<SimRow> = [
    { title: 'Số điện thoại', dataIndex: 'phoneNumber', key: 'phone' },
    { title: 'Mã sản phẩm', dataIndex: 'productCode', key: 'code', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: (v: any) => <SimStatusBadge status={v} /> },
    {
      title: 'Dung lượng đã dùng', dataIndex: 'usedMB', key: 'used',
      sorter: (a, b) => a.usedMB - b.usedMB,
      render: (v: number) => formatMB(v),
    },
    {
      title: 'Thuộc nhóm', dataIndex: 'groupIds', key: 'groups',
      render: (gids: string[]) => (
        <>{gids.map((gid) => { const g = groups.find((x) => x.id === gid); return g ? <Tag key={gid} color="purple">{g.name}</Tag> : null; })}</>
      ),
    },
  ];

  const selectedGroupInfo = groups.find((g) => g.id === selectedGroup);

  return (
    <div>
      <Title level={3}>🗂️ Nhóm sản phẩm</Title>

      <Card title="Danh sách nhóm" style={{ marginBottom: 16 }}>
        <Table dataSource={groupStats} columns={groupColumns} rowKey="id" size="middle" pagination={false} />
      </Card>

      {selectedGroup && (
        <Card
          title={
            <Space>
              <span>📱 SIM trong nhóm: <strong>{selectedGroupInfo?.name}</strong></span>
              <Select value={sortUsage} onChange={setSortUsage} style={{ width: 180 }}>
                <Select.Option value="none">Sắp xếp dung lượng</Select.Option>
                <Select.Option value="asc">↑ Tăng dần</Select.Option>
                <Select.Option value="desc">↓ Giảm dần</Select.Option>
              </Select>
            </Space>
          }
          extra={<Button size="small" onClick={() => setSelectedGroup(null)}>Đóng</Button>}
        >
          <Table dataSource={simsInGroup} columns={simColumns} rowKey="id" size="small" pagination={{ pageSize: 10 }} locale={{ emptyText: 'Nhóm chưa có SIM nào' }} />
        </Card>
      )}
    </div>
  );
};

export default ProductGroups;
