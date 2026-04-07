import React, { useState, useMemo } from 'react';
import { Layout, Menu, Badge, Typography } from 'antd';
import {
  DashboardOutlined,
  MobileOutlined,
  GroupOutlined,
  BellOutlined,
  CrownOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../../store/useStore';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

interface Props {
  children: React.ReactNode;
}

const AppLayout: React.FC<Props> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { checkAndTriggerAlerts } = useStore();

  const alertCount = useMemo(() => checkAndTriggerAlerts().length, [checkAndTriggerAlerts]);

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: 'Tổng quan' },
    { key: '/sims', icon: <MobileOutlined />, label: 'Danh sách SIM M2M' },
    { key: '/groups', icon: <GroupOutlined />, label: 'Nhóm sản phẩm' },
    {
      key: '/alerts',
      icon: (
        <Badge count={alertCount} size="small" offset={[6, 0]}>
          <BellOutlined />
        </Badge>
      ),
      label: 'Cảnh báo dung lượng',
    },
    { key: '/master-sims', icon: <CrownOutlined />, label: 'SIM chủ (M2M)' },
    { key: '/history', icon: <HistoryOutlined />, label: 'Lịch sử sử dụng' },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
        width={220}
        style={{ background: '#001529' }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            padding: '0 12px',
          }}
        >
          {!collapsed && (
            <Title level={5} style={{ color: '#fff', margin: 0, fontSize: 14 }}>
              📡 Vinaphone M2M
            </Title>
          )}
          {collapsed && <span style={{ color: '#fff', fontSize: 20 }}>📡</span>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ marginTop: 8 }}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          }}
        >
          <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
            Hệ thống quản lý SIM M2M – Vinaphone
          </Title>
          {alertCount > 0 && (
            <Badge
              count={`${alertCount} cảnh báo`}
              style={{ background: '#ff4d4f', marginLeft: 24, cursor: 'pointer' }}
              onClick={() => navigate('/alerts')}
            />
          )}
        </Header>

        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            background: '#f0f2f5',
            borderRadius: 8,
            minHeight: 360,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
