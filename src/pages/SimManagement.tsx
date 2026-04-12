import React, { useMemo, useState } from 'react';
import {
  Table, Select, Tag, Space, Typography, Card, Badge, Input, Row, Col, Progress,
  Button, Tooltip, message,
} from 'antd';
import { SearchOutlined, FilterOutlined, DownloadOutlined, ExportOutlined } from '@ant-design/icons';
import type { ColumnsType, TableRowSelection } from 'antd/es/table/interface';
import * as XLSX from 'xlsx';
import { SimStatus } from '../types';
import type { SimCard } from '../types';
import { useSims } from '../hooks/useSims';
import { useGroups } from '../hooks/useGroups';
import { useAlerts, useTriggeredAlerts } from '../hooks/useAlerts';
import { formatMB, getUsageColor } from '../utils';
import SimStatusBadge from '../components/SIM/SimStatusBadge';
import SimMasterMembersModal from '../components/SIM/SimMasterMembersModal';

const { Title, Text } = Typography;
const { Option } = Select;

// ---- Export XLSX ----
const exportXLSX = (data: SimCard[], filename: string) => {
  const rows = data.map((s) => ({
    'Số điện thoại': s.phoneNumber,
    'IMSI': s.imsi ?? '',
    'Mã hợp đồng': s.contractCode ?? '',
    'Mã sản phẩm': s.productCode,
    'Trạng thái (quản lý)': s.status,
    'Trạng thái (hệ thống)': s.systemStatus ?? '',
    'Dung lượng đã dùng (MB)': s.usedMB,
    'Thời gian kích hoạt': s.firstUsedAt ?? '',
    'Ngày tạo': s.createdAt,
    'Ghi chú': s.note ?? '',
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  // Auto column widths
  ws['!cols'] = [18, 18, 18, 14, 20, 18, 24, 22, 12, 20].map((w) => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Danh sách SIM');
  XLSX.writeFile(wb, filename);
  message.success(`Đã xuất ${data.length} SIM → ${filename}`);
};

const SimManagement: React.FC = () => {
  const { data: simsData, isLoading } = useSims({ pageSize: 200 });
  const { data: groups = [] } = useGroups();
  const { data: alerts = [] } = useAlerts();
  const { data: triggeredData } = useTriggeredAlerts();

  const sims = simsData?.data ?? [];

  const [filterProductCode, setFilterProductCode] = useState<string>('all');
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortUsage, setSortUsage] = useState<'asc' | 'desc' | 'none'>('none');
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [modalSim, setModalSim] = useState<SimCard | null>(null);

  const productCodes = useMemo(() => [...new Set(sims.map((s) => s.productCode))], [sims]);

  const countByCode = useMemo(() => {
    const map: Record<string, number> = {};
    sims.forEach((s) => { map[s.productCode] = (map[s.productCode] || 0) + 1; });
    return map;
  }, [sims]);

  // SIM IDs currently over thresholds, sourced from the API
  const alertSimIds = useMemo(() => {
    const ids = new Set<string>();
    triggeredData?.data.forEach((t) => ids.add(t.sim.id));
    return ids;
  }, [triggeredData]);

  const filteredSims = useMemo(() => {
    let result = sims.filter((s) => {
      if (filterProductCode !== 'all' && s.productCode !== filterProductCode) return false;
      if (filterGroup !== 'all' && !s.groupIds.includes(filterGroup)) return false;
      if (filterStatus !== 'all' && s.status !== filterStatus) return false;
      if (searchText && !s.phoneNumber.includes(searchText) && !s.productCode.includes(searchText) && !(s.imsi ?? '').includes(searchText))
        return false;
      return true;
    });
    if (sortUsage === 'asc') result = [...result].sort((a, b) => a.usedMB - b.usedMB);
    else if (sortUsage === 'desc') result = [...result].sort((a, b) => b.usedMB - a.usedMB);
    return result;
  }, [sims, filterProductCode, filterGroup, filterStatus, sortUsage, searchText]);

  const rowSelection: TableRowSelection<SimCard> = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
  };

  const handleExport = (exportAll: boolean) => {
    if (!exportAll && selectedRowKeys.length === 0) {
      message.warning('Vui lòng tích chọn ít nhất 1 SIM!');
      return;
    }
    const data = exportAll
      ? filteredSims
      : filteredSims.filter((s) => selectedRowKeys.includes(s.id));
    exportXLSX(data, `sim-m2m-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const columns: ColumnsType<SimCard> = [
    {
      title: 'Số điện thoại',
      dataIndex: 'phoneNumber',
      key: 'phone',
      fixed: 'left',
      render: (v, record) => (
        <Space>
          {alertSimIds.has(record.id) && <Badge status="error" title="Vượt ngưỡng cảnh báo" />}
          <Text
            strong
            style={{ color: '#1890ff', cursor: 'pointer' }}
            onClick={() => setModalSim(record)}
          >
            {v}
          </Text>
        </Space>
      ),
    },
    {
      title: 'IMSI',
      dataIndex: 'imsi',
      key: 'imsi',
      render: (v) => v ? <Text code style={{ fontSize: 12 }}>{v}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title: 'Mã hợp đồng',
      dataIndex: 'contractCode',
      key: 'contract',
      render: (v) => v ? <Tag color="geekblue">{v}</Tag> : <Text type="secondary">—</Text>,
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
      title: 'Trạng thái (quản lý)',
      dataIndex: 'status',
      key: 'status',
      render: (v) => <SimStatusBadge status={v} />,
    },
    {
      title: 'Trạng thái (hệ thống)',
      dataIndex: 'systemStatus',
      key: 'sysStatus',
      render: (v) => v ? <Tag color="cyan">{v}</Tag> : <Text type="secondary">—</Text>,
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Title level={3} style={{ margin: 0 }}>📱 Danh sách SIM M2M</Title>
        <Space wrap>
          <Tooltip title="Xuất tất cả SIM trong bộ lọc hiện tại">
            <Button icon={<DownloadOutlined />} onClick={() => handleExport(true)}>
              Xuất danh sách ({filteredSims.length})
            </Button>
          </Tooltip>
          <Tooltip title="Xuất các SIM đang được tích chọn">
            <Button
              type="primary"
              icon={<ExportOutlined />}
              onClick={() => handleExport(false)}
              disabled={selectedRowKeys.length === 0}
            >
              Xuất đã chọn{selectedRowKeys.length > 0 ? ` (${selectedRowKeys.length})` : ''}
            </Button>
          </Tooltip>
        </Space>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="SĐT / mã sản phẩm / IMSI"
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
          Hiển thị <strong>{filteredSims.length}</strong> / {simsData?.total ?? sims.length} SIM
          {selectedRowKeys.length > 0 && <Tag color="blue" style={{ marginLeft: 12 }}>Đang chọn {selectedRowKeys.length}</Tag>}
        </Text>
        <Table
          dataSource={filteredSims}
          columns={columns}
          rowKey="id"
          size="middle"
          scroll={{ x: 1400 }}
          rowSelection={rowSelection}
          rowClassName={(record) => (alertSimIds.has(record.id) ? 'row-alert' : '')}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          loading={isLoading}
        />
      </Card>

      <style>{`
        .row-alert td { background-color: #fff2f0 !important; }
        .row-alert:hover td { background-color: #ffe7e7 !important; }
        .sim-member-row-self td { background-color: #e6f4ff !important; font-weight: 600; }
      `}</style>

      <SimMasterMembersModal sim={modalSim} onClose={() => setModalSim(null)} />
    </div>
  );
};

export default SimManagement;
