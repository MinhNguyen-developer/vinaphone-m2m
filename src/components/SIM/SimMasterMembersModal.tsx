import React from 'react';
import {
  Modal, Card, Table, Tag, Typography, Row, Col, Statistic, Progress, Descriptions, Space,
} from 'antd';
import { CrownOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useStore } from '../../store/useStore';
import type { SimCard } from '../../types';
import { formatMB, getUsageColor } from '../../utils';
import SimStatusBadge from './SimStatusBadge';

const { Text } = Typography;

interface Props {
  sim: SimCard | null;
  onClose: () => void;
}

const SimMasterMembersModal: React.FC<Props> = ({ sim, onClose }) => {
  const { sims, masterSims } = useStore();

  const master = sim?.masterSimCode
    ? masterSims.find((m) => m.code === sim.masterSimCode)
    : null;

  const members = sim?.masterSimCode
    ? sims.filter((s) => s.masterSimCode === sim.masterSimCode)
    : [];

  const memberColumns: ColumnsType<SimCard> = [
    {
      title: 'Số điện thoại',
      dataIndex: 'phoneNumber',
      key: 'phone',
      render: (v, r) => (
        <Text strong style={{ color: r.id === sim?.id ? '#1890ff' : undefined }}>
          {v}
          {r.id === sim?.id && (
            <Tag color="blue" style={{ marginLeft: 6, fontSize: 11 }}>Đang xem</Tag>
          )}
        </Text>
      ),
    },
    {
      title: 'IMSI',
      dataIndex: 'imsi',
      key: 'imsi',
      render: (v) => v ? <Text code style={{ fontSize: 11 }}>{v}</Text> : '—',
    },
    {
      title: 'Mã hợp đồng',
      dataIndex: 'contractCode',
      key: 'contract',
      render: (v) => v ? <Tag color="geekblue">{v}</Tag> : '—',
    },
    {
      title: 'Mã SP',
      dataIndex: 'productCode',
      key: 'code',
      render: (v) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (v) => <SimStatusBadge status={v} />,
    },
    {
      title: 'Đã dùng',
      dataIndex: 'usedMB',
      key: 'used',
      render: (v) => (
        <Text style={{ color: getUsageColor(v > 5000 ? 90 : v > 1000 ? 60 : 20) }}>
          {formatMB(v)}
        </Text>
      ),
    },
  ];

  return (
    <Modal
      open={!!sim}
      onCancel={onClose}
      footer={null}
      width={860}
      centered
      destroyOnClose
      title={
        sim?.masterSimCode ? (
          <Space>
            <CrownOutlined style={{ color: '#faad14' }} />
            <span>
              SIM thành viên – SIM chủ{' '}
              <Tag color="gold">{sim.masterSimCode.toUpperCase()}</Tag>
            </span>
          </Space>
        ) : (
          <span>SIM {sim?.phoneNumber} – Chưa gán SIM chủ</span>
        )
      }
    >
      {sim && (
        <>
          {/* Master SIM capacity summary */}
          {master && (
            <Card
              size="small"
              style={{ marginBottom: 16, borderLeft: '4px solid #faad14', background: '#fffbe6' }}
            >
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic
                    title="Tên gói"
                    value={master.packageName}
                    valueStyle={{ fontSize: 14 }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Tổng dung lượng"
                    value={formatMB(master.packageCapacityMB)}
                    valueStyle={{ fontSize: 14, color: '#1890ff' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Đã sử dụng"
                    value={formatMB(master.usedMB)}
                    valueStyle={{ fontSize: 14, color: '#fa8c16' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Còn lại"
                    value={formatMB(master.packageCapacityMB - master.usedMB)}
                    valueStyle={{ fontSize: 14, color: '#52c41a' }}
                  />
                </Col>
              </Row>
              <Progress
                percent={Math.min(
                  Math.round((master.usedMB / master.packageCapacityMB) * 100),
                  100
                )}
                size="small"
                strokeColor={master.usedMB / master.packageCapacityMB >= 0.9 ? '#ff4d4f' : '#1890ff'}
                style={{ marginTop: 8 }}
              />
            </Card>
          )}

          {/* Member SIM table */}
          {members.length > 0 ? (
            <>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                Tổng cộng <strong>{members.length}</strong> SIM thành viên. Hàng xanh là SIM đang xem.
              </Text>
              <Table
                dataSource={members}
                columns={memberColumns}
                rowKey="id"
                size="small"
                pagination={false}
                scroll={{ x: 600 }}
                rowClassName={(r) => (r.id === sim.id ? 'sim-member-row-self' : '')}
              />
            </>
          ) : (
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="Số điện thoại">{sim.phoneNumber}</Descriptions.Item>
              <Descriptions.Item label="IMSI">{sim.imsi ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Mã hợp đồng">{sim.contractCode ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Mã sản phẩm">{sim.productCode}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <SimStatusBadge status={sim.status} />
              </Descriptions.Item>
              <Descriptions.Item label="Dung lượng đã dùng">{formatMB(sim.usedMB)}</Descriptions.Item>
              <Descriptions.Item label="SIM chủ" span={2}>
                <Text type="secondary">Chưa gán SIM chủ</Text>
              </Descriptions.Item>
            </Descriptions>
          )}
        </>
      )}
    </Modal>
  );
};

export default SimMasterMembersModal;
