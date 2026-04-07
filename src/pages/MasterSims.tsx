import React from 'react';
import { Card, Table, Tag, Typography, Row, Col, Statistic, Progress } from 'antd';
import { CrownOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useStore } from '../store/useStore';
import type { MasterSim } from '../types';
import { formatMB } from '../utils';

const { Title, Text } = Typography;

const MasterSims: React.FC = () => {
  const { masterSims } = useStore();

  const columns: ColumnsType<MasterSim> = [
    { title: 'Mã SIM chủ', dataIndex: 'code', key: 'code', render: (v) => <Tag color="gold" icon={<CrownOutlined />} style={{ fontSize: 14, padding: '4px 12px' }}>{v}</Tag> },
    { title: 'Số điện thoại', dataIndex: 'phoneNumber', key: 'phone' },
    { title: 'Tên gói', dataIndex: 'packageName', key: 'package', render: (v) => <Tag color="green">{v}</Tag> },
    { title: 'Dung lượng gói', dataIndex: 'packageCapacityMB', key: 'capacity', render: (v) => <Text strong style={{ color: '#1890ff', fontSize: 16 }}>{formatMB(v)}</Text> },
    { title: 'Mô tả', dataIndex: 'description', key: 'desc', render: (v) => v ?? <Text type="secondary">—</Text> },
  ];

  return (
    <div>
      <Title level={3}>👑 SIM chủ M2M</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Danh sách SIM chủ (m2m3, m2m4, m2m7...) – hiển thị dung lượng của gói chủ.
      </Text>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {masterSims.map((m) => (
          <Col xs={24} sm={12} lg={8} key={m.id}>
            <Card style={{ borderLeft: '4px solid #faad14' }} title={<span><CrownOutlined style={{ color: '#faad14', marginRight: 8 }} />{m.code.toUpperCase()}</span>}>
              <Statistic title="Dung lượng gói chủ" value={formatMB(m.packageCapacityMB)} valueStyle={{ color: '#1890ff', fontSize: 20 }} />
              <div style={{ marginTop: 8 }}><Text type="secondary">SĐT: </Text><Text>{m.phoneNumber}</Text></div>
              <div><Text type="secondary">Gói: </Text><Tag color="green">{m.packageName}</Tag></div>
              {m.description && <div style={{ marginTop: 4 }}><Text type="secondary">{m.description}</Text></div>}
              <Progress percent={100} status="active" strokeColor="#1890ff" format={() => formatMB(m.packageCapacityMB)} style={{ marginTop: 12 }} />
            </Card>
          </Col>
        ))}
      </Row>

      <Card title="Danh sách SIM chủ">
        <Table dataSource={masterSims} columns={columns} rowKey="id" size="middle" pagination={false} />
      </Card>
    </div>
  );
};

export default MasterSims;
