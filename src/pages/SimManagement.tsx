import React, { useMemo, useState } from 'react';
import {
  Table, Select, Tag, Space, Typography, Card, Badge, Input, Row, Col, Progress,
} from 'antd';
import { SearchOutlined, FilterOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useStore } from '../store/useStore';
import { SimStatus } from '../types';
import type { SimCard } from '../types';
import { formatMB, getUsageColor } from '../utils';
import SimStatusBadge from '../components/SIM/SimStatusBadge';

const { Title, Text } = Typography;
const { Option } = Select;

const SimManagement: React.FC = () => {
  const { sims, groups, alerts } = useStore();

  const [filterProductCode, setFilterProductCode] = useState<string>('all');
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortUsage, setSortUsage] = useState<'asc' | 'desc' | 'none'>('none');
  const [searchText, setSearchText] = useState('');

  const productCodes = useMemo(() => [...new Set(sims.map((s) => s.productCode))], [sims]);

  const countByCode = useMemo(() => {
    const map: Record<string, number> = {};
    sims.forEach((s) => { map[s.productCode] = (map[s.productCode] || 0) + 1; });
    return map;
  }, [sims]);

  const alertSimIds = useMemo(() => {
    const ids = new Set<string>();
    sims.forEach((sim) => {
      alerts.forEach((alert) => {
        if (!alert.active) return;
        const match =
          alert.simId === sim.id ||
          (alert.groupId && sim.groupIds.includes(alert.groupId)) ||
          (alert.productCode && alert.productCode === sim.productCode);
        if (match && sim.usedMB >= alert.thresholdMB) ids.add(sim.id);
      });
    });
    return ids;
  }, [sims, alerts]);

  const filteredSims = useMemo(() => {
    let result = sims.filter((s) => {
      if (filterProductCode !== 'all' && s.productCode !== filterProductCode) return false;
      if (filterGroup !== 'all' && !s.groupIds.includes(filterGroup)) return false;
      if (filterStatus !== 'all' && s.status !== filterStatus) return false;
      if (searchText && !s.phoneNumber.includes(searchText) && !s.productCode.includes(searchText))
        return false;
      return true;
    });
    if (sortUsage === 'asc') result = [...result].sort((a, b) => a.usedMB - b.usedMB);
    else if (sortUsage === 'desc') result = [...result].sort((a, b) => b.usedMB - a.usedMB);
    return result;
  }, [sims, filterProductCode, filterGroup, filterStatus, sortUsage, searchText]);

  const columns: ColumnsType<SimCard> = [
    {
      title: 'Số điện thoại',
      dataIndex: 'phoneNumber',
      key: 'phone',
      render: (v, record) => (
        <Space>
          {alertSimIds.has(record.id) && <Badge status="error" title="Vượt ngưỡng cảnh báo" />}
          <Text strong>{v}</Text>
        </Space>
      ),
    },
    {
      title: 'Mã sản phẩm',
      dataIndex: 'productCode',
      key: 'code',
      render: (v) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: 'Nhóm',
      dataIndex: 'groupIds',
      key: 'groups',
      render: (gids: string[]) => (
        <>
          {gids.map((gid) => {
            const g = groups.find((x) => x.id === gid);
            return g ? <Tag key={gid} color="purple">{g.name}</Tag> : null;
          })}
          {gids.length === 0 && <Text type="secondary">—</Text>}
        </>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (v) => <SimStatusBadge status={v} />,
    },
    {
      title: 'Dung lượng đã dùng',
      dataIndex: 'usedMB',
      key: 'used',
      sorter: (a, b) => a.usedMB - b.usedMB,
      render: (v, record) => {
        const relevantAlerts = alerts.filter(
          (a) =>
            a.active &&
            (a.simId === record.id ||
              (a.groupId && record.groupIds.includes(a.groupId)) ||
              (a.productCode && a.productCode === record.productCode))
        );
        const maxThreshold = relevantAlerts.length
          ? Math.max(...relevantAlerts.map((a) => a.thresholdMB))
          : 0;
        const pct = maxThreshold > 0 ? Math.min(Math.round((v / maxThreshold) * 100), 100) : 0;
        return (
          <div style={{ minWidth: 120 }}>
            <Text style={{ color: getUsageColor(pct) }}>{formatMB(v)}</Text>
            {maxThreshold > 0 && (
              <Progress percent={pct} size="small" strokeColor={getUsageColor(pct)} showInfo={false} style={{ margin: 0 }} />
            )}
          </div>
        );
      },
    },
    {
      title: 'Thời gian kích hoạt',
      dataIndex: 'firstUsedAt',
      key: 'firstUsed',
      render: (v) => v ?? <Text type="secondary">Chưa có</Text>,
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'created',
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      key: 'note',
      render: (v) => v ?? <Text type="secondary">—</Text>,
    },
  ];

  return (
    <div>
      <Title level={3}>📱 Danh sách SIM M2M</Title>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="Tìm số điện thoại / mã sản phẩm"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Select style={{ width: '100%' }} value={filterProductCode} onChange={setFilterProductCode}>
              <Option value="all">Tất cả mã sản phẩm</Option>
              {productCodes.map((c) => (
                <Option key={c} value={c}>{c} ({countByCode[c]} SIM)</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Select style={{ width: '100%' }} value={filterGroup} onChange={setFilterGroup}>
              <Option value="all">Tất cả nhóm</Option>
              {groups.map((g) => <Option key={g.id} value={g.id}>{g.name}</Option>)}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Select style={{ width: '100%' }} value={filterStatus} onChange={setFilterStatus}>
              <Option value="all">Tất cả trạng thái</Option>
              {Object.values(SimStatus).map((s) => <Option key={s} value={s}>{s}</Option>)}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={3}>
            <Select style={{ width: '100%' }} value={sortUsage} onChange={setSortUsage} prefix={<FilterOutlined />}>
              <Option value="none">Sắp xếp dung lượng</Option>
              <Option value="asc">↑ Tăng dần</Option>
              <Option value="desc">↓ Giảm dần</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
        {productCodes.map((code) => (
          <Col key={code}>
            <Tag
              color={filterProductCode === code ? 'blue' : 'default'}
              style={{ cursor: 'pointer', padding: '4px 12px' }}
              onClick={() => setFilterProductCode(filterProductCode === code ? 'all' : code)}
            >
              {code}: <strong>{countByCode[code]}</strong> SIM
            </Tag>
          </Col>
        ))}
      </Row>

      <Card>
        <Text style={{ display: 'block', marginBottom: 12 }}>
          Hiển thị <strong>{filteredSims.length}</strong> / {sims.length} SIM
        </Text>
        <Table
          dataSource={filteredSims}
          columns={columns}
          rowKey="id"
          size="middle"
          scroll={{ x: 900 }}
          rowClassName={(record) => (alertSimIds.has(record.id) ? 'row-alert' : '')}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Card>

      <style>{`
        .row-alert td { background-color: #fff2f0 !important; }
        .row-alert:hover td { background-color: #ffe7e7 !important; }
      `}</style>
    </div>
  );
};

export default SimManagement;
