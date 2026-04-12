import React, { useState } from 'react';
import { Card, Table, Tag, Typography, Row, Col, Statistic, Progress, Drawer, Space, Spin } from 'antd';
import { CrownOutlined, MobileOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { MasterSimWithRemaining, SimCard } from '../types';
import { formatMB } from '../utils';
import SimStatusBadge from '../components/SIM/SimStatusBadge';
import { useMasterSimMembers, useMasterSims } from '../hooks/useMasterSims';

const { Title, Text } = Typography;

const MasterSims: React.FC = () => {
  const { data: masterSims = [], isLoading } = useMasterSims();
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const { data: memberSims = [], isLoading: membersLoading } = useMasterSimMembers(selectedCode);

  const selectedMaster = masterSims.find((m) => m.code === selectedCode) ?? null;

  const getUsagePct = (m: MasterSimWithRemaining) =>
    m.packageCapacityMB > 0
      ? Math.min(Math.round((m.usedMB / m.packageCapacityMB) * 100), 100)
      : 0;

  const getPctColor = (pct: number) =>
    pct >= 90 ? '#ff4d4f' : pct >= 70 ? '#faad14' : '#52c41a';

  const columns: ColumnsType<MasterSimWithRemaining> = [
    {
      title: 'Mã SIM chủ', dataIndex: 'code', key: 'code',
      render: (v) => (
        <Tag
          color="gold"
          icon={<CrownOutlined />}
          style={{ fontSize: 14, padding: '4px 12px', cursor: 'pointer' }}
          onClick={() => setSelectedCode(v)}
        >
          {v}
        </Tag>
      ),
    },
    { title: 'Số điện thoại', dataIndex: 'phoneNumber', key: 'phone' },
    { title: 'Tên gói', dataIndex: 'packageName', key: 'package', render: (v) => <Tag color="green">{v}</Tag> },
    {
      title: 'Đã dùng / Tổng gói', key: 'usage',
      render: (_, m) => {
        const pct = getUsagePct(m);
        return (
          <Space direction="vertical" style={{ width: 160 }} size={2}>
            <Text style={{ color: getPctColor(pct) }}>
              {formatMB(m.usedMB)} / <strong>{formatMB(m.packageCapacityMB)}</strong>
            </Text>
            <Progress percent={pct} size="small" strokeColor={getPctColor(pct)} showInfo={false} />
          </Space>
        );
      },
    },
    {
      title: 'Còn lại', key: 'remaining',
      render: (_, m) => {
        const remaining = m.remainingMB;
        return <Text strong style={{ color: remaining > 0 ? '#52c41a' : '#ff4d4f' }}>{formatMB(remaining)}</Text>;
      },
    },
    {
      title: 'SIM thành viên', key: 'members',
      render: (_, m) => (
        <Tag
          icon={<MobileOutlined />}
          color="blue"
          style={{ cursor: 'pointer' }}
          onClick={() => setSelectedCode(m.code)}
        >
          Xem
        </Tag>
      ),
    },
    { title: 'Mô tả', dataIndex: 'description', key: 'desc', render: (v) => v ?? <Text type="secondary">—</Text> },
  ];

  const memberColumns: ColumnsType<SimCard> = [
    { title: 'Số điện thoại', dataIndex: 'phoneNumber', key: 'phone', render: (v) => <Text strong>{v}</Text> },
    { title: 'IMSI', dataIndex: 'imsi', key: 'imsi', render: (v) => v ? <Text code style={{ fontSize: 12 }}>{v}</Text> : '—' },
    { title: 'Mã hợp đồng', dataIndex: 'contractCode', key: 'contract', render: (v) => v ? <Tag color="geekblue">{v}</Tag> : '—' },
    { title: 'Mã sản phẩm', dataIndex: 'productCode', key: 'code', render: (v) => <Tag color="blue">{v}</Tag> },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: (v) => <SimStatusBadge status={v} /> },
    { title: 'Đã dùng', dataIndex: 'usedMB', key: 'used', render: (v) => formatMB(v) },
  ];

  return (
    <div>
      <Title level={3}>👑 SIM chủ M2M</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Bấm vào mã SIM chủ hoặc nút "Xem" để xem danh sách SIM thành viên.
      </Text>

      {isLoading && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" tip="Đang tải SIM chủ..." />
        </div>
      )}

      {!isLoading && masterSims.length === 0 && (
        <Card style={{ marginBottom: 24 }}>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <span style={{ fontSize: 48 }}>👑</span>
            <p style={{ color: '#999', marginTop: 12 }}>Chưa có SIM chủ nào.</p>
          </div>
        </Card>
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {masterSims.map((m) => {
          const pct = getUsagePct(m);
          const remaining = m.remainingMB;
          return (
            <Col xs={24} sm={12} lg={8} key={m.id}>
              <Card
                style={{ borderLeft: `4px solid ${getPctColor(pct)}`, cursor: 'pointer' }}
                title={<span><CrownOutlined style={{ color: '#faad14', marginRight: 8 }} />{m.code.toUpperCase()}</span>}
                extra={<Tag color="blue" icon={<MobileOutlined />}>SIM</Tag>}
                onClick={() => setSelectedCode(m.code)}
                hoverable
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic title="Đã sử dụng" value={formatMB(m.usedMB)} valueStyle={{ color: getPctColor(pct), fontSize: 18 }} />
                  </Col>
                  <Col span={12}>
                    <Statistic title="Còn lại" value={formatMB(remaining)} valueStyle={{ color: '#52c41a', fontSize: 18 }} />
                  </Col>
                </Row>
                <div style={{ marginTop: 8 }}><Text type="secondary">Gói: </Text><Tag color="green">{m.packageName}</Tag></div>
                <div style={{ marginTop: 4 }}><Text type="secondary">SĐT: </Text><Text>{m.phoneNumber}</Text></div>
                <Progress
                  percent={pct}
                  status={pct >= 90 ? 'exception' : 'active'}
                  strokeColor={getPctColor(pct)}
                  format={() => `${pct}% (${formatMB(m.usedMB)} / ${formatMB(m.packageCapacityMB)})`}
                  style={{ marginTop: 12 }}
                />
              </Card>
            </Col>
          );
        })}
      </Row>

      <Card title="Danh sách SIM chủ">
        <Table dataSource={masterSims} columns={columns} rowKey="id" size="middle" pagination={false} loading={isLoading} />
      </Card>

      {/* Member SIMs Drawer */}
      <Drawer
        title={
          selectedMaster
            ? `SIM thành viên của ${selectedMaster.code.toUpperCase()} (${memberSims.length} SIM)`
            : 'SIM thành viên'
        }
        open={!!selectedCode}
        onClose={() => setSelectedCode(null)}
        width={800}
        extra={
          selectedMaster && (
            <Tag color="green">
              Còn lại: {formatMB(selectedMaster.remainingMB)} / {formatMB(selectedMaster.packageCapacityMB)}
            </Tag>
          )
        }
      >
        {membersLoading
          ? <Spin style={{ display: 'block', margin: '40px auto' }} />
          : memberSims.length === 0 ? (
          <Text type="secondary">Không có SIM thành viên nào.</Text>
        ) : (
          <Table
            dataSource={memberSims}
            columns={memberColumns}
            rowKey="id"
            size="small"
            scroll={{ x: 600 }}
            pagination={{ pageSize: 10 }}
          />
        )}
      </Drawer>
    </div>
  );
};

export default MasterSims;

