import React, { useMemo } from 'react';
import { Card, Col, Row, Statistic, Table, Tag, Typography, Progress, Alert, Button } from 'antd';
import {
  MobileOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { SimStatus } from '../types';
import { formatMB } from '../utils';
import SimStatusBadge from '../components/SIM/SimStatusBadge';
import { useSims } from '../hooks/useSims';
import { useTriggeredAlerts } from '../hooks/useAlerts';

const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data: simsData } = useSims({ pageSize: 200 });
  const { data: triggeredData } = useTriggeredAlerts();

  const sims = simsData?.data ?? [];
  const triggeredCount = triggeredData?.total ?? 0;

  const stats = useMemo(() => {
    const total = sims.length;
    const newSims = sims.filter((s) => s.status === SimStatus.NEW).length;
    const active = sims.filter((s) => s.status === SimStatus.ACTIVE).length;
    const confirmed = sims.filter((s) => s.status === SimStatus.CONFIRMED).length;
    const totalUsedMB = sims.reduce((acc, s) => acc + s.usedMB, 0);

    const byProductCode: Record<string, number> = {};
    sims.forEach((s) => {
      byProductCode[s.productCode] = (byProductCode[s.productCode] || 0) + 1;
    });

    return { total, newSims, active, confirmed, totalUsedMB, byProductCode };
  }, [sims]);

  const productCodeData = useMemo(
    () =>
      Object.entries(stats.byProductCode).map(([code, count]) => ({
        key: code,
        code,
        count,
        totalUsed: sims
          .filter((s) => s.productCode === code)
          .reduce((a, s) => a + s.usedMB, 0),
      })),
    [stats.byProductCode, sims],
  );

  const recentActive = useMemo(
    () =>
      sims
        .filter((s) => s.status === SimStatus.ACTIVE)
        .sort((a, b) => (b.firstUsedAt ?? '').localeCompare(a.firstUsedAt ?? ''))
        .slice(0, 5),
    [sims],
  );

  return (
    <div>
      <Title level={3}>📊 Tổng quan hệ thống M2M</Title>

      {triggeredCount > 0 && (
        <Alert
          message={
            <span>
              ⚠️ Có <strong>{triggeredCount}</strong> SIM đang vượt ngưỡng cảnh báo!{' '}
              <Button type="link" onClick={() => navigate('/alerts')} style={{ padding: 0 }}>
                Xem danh sách →
              </Button>
            </span>
          }
          type="error"
          showIcon
          style={{ marginBottom: 24 }}
          closable
        />
      )}

      {/* Stat Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Tổng số SIM"
              value={stats.total}
              prefix={<MobileOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="SIM đã xác nhận"
              value={stats.confirmed}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="SIM đang hoạt động (chờ xác nhận)"
              value={stats.active}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="SIM cảnh báo vượt ngưỡng"
              value={triggeredCount}
              prefix={<WarningOutlined />}
              valueStyle={{ color: triggeredCount > 0 ? '#ff4d4f' : '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* By Product Code */}
        <Col xs={24} lg={12}>
          <Card title="📦 Tổng SIM theo mã sản phẩm">
            <Table
              dataSource={productCodeData}
              size="small"
              pagination={false}
              columns={[
                {
                  title: 'Mã sản phẩm', dataIndex: 'code', key: 'code',
                  render: (v) => <Tag color="blue">{v}</Tag>,
                },
                { title: 'Số lượng SIM', dataIndex: 'count', key: 'count' },
                {
                  title: 'Tổng dung lượng đã dùng', dataIndex: 'totalUsed', key: 'totalUsed',
                  render: (v) => formatMB(v),
                },
              ]}
            />
          </Card>
        </Col>

        {/* Summary by Status */}
        <Col xs={24} lg={12}>
          <Card title="📊 Tỉ lệ trạng thái SIM">
            <div style={{ marginBottom: 16 }}>
              <Text>Mới ({stats.newSims} SIM)</Text>
              <Progress
                percent={Math.round((stats.newSims / stats.total) * 100) || 0}
                strokeColor="#8c8c8c"
                style={{ marginBottom: 8 }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text>Đã hoạt động ({stats.active} SIM)</Text>
              <Progress
                percent={Math.round((stats.active / stats.total) * 100) || 0}
                strokeColor="#faad14"
                status="active"
                style={{ marginBottom: 8 }}
              />
            </div>
            <div>
              <Text>Đã xác nhận ({stats.confirmed} SIM)</Text>
              <Progress
                percent={Math.round((stats.confirmed / stats.total) * 100) || 0}
                strokeColor="#52c41a"
              />
            </div>
            <div style={{ marginTop: 16, borderTop: '1px solid #f0f0f0', paddingTop: 12 }}>
              <Statistic title="Tổng dung lượng đã sử dụng" value={formatMB(stats.totalUsedMB)} />
            </div>
          </Card>
        </Col>

        {/* Recent Active SIMs */}
        <Col xs={24}>
          <Card
            title="⚡ SIM vừa kích hoạt (chờ xác nhận)"
            extra={
              <Button size="small" onClick={() => navigate('/sims')}>Xem tất cả</Button>
            }
          >
            <Table
              dataSource={recentActive}
              rowKey="id"
              size="small"
              pagination={false}
              locale={{ emptyText: 'Không có SIM nào đang chờ xác nhận' }}
              columns={[
                { title: 'Số điện thoại', dataIndex: 'phoneNumber', key: 'phone' },
                {
                  title: 'Mã sản phẩm', dataIndex: 'productCode', key: 'code',
                  render: (v) => <Tag color="blue">{v}</Tag>,
                },
                {
                  title: 'Trạng thái', dataIndex: 'status', key: 'status',
                  render: (v) => <SimStatusBadge status={v} />,
                },
                {
                  title: 'Dung lượng đã dùng', dataIndex: 'usedMB', key: 'used',
                  render: (v) => formatMB(v),
                },
                {
                  title: 'Thời gian kích hoạt', dataIndex: 'firstUsedAt', key: 'firstUsed',
                  render: (v) => v ?? '—',
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
