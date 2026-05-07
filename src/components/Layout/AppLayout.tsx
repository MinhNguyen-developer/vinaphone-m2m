import React, { useState } from "react";
import { Layout, Menu, Badge, Typography, Drawer, Button, Grid } from "antd";
import {
  DashboardOutlined,
  MobileOutlined,
  GroupOutlined,
  BellOutlined,
  CrownOutlined,
  HistoryOutlined,
  MenuOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTriggeredAlerts } from "../../hooks/useAlerts";
import { useAuthStore } from "../../store/useAuthStore";

const { Header, Sider, Content } = Layout;
const { Title } = Typography;
const { useBreakpoint } = Grid;

interface Props {
  children: React.ReactNode;
}

const AppLayout: React.FC<Props> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { data: triggeredData } = useTriggeredAlerts();
  const logout = useAuthStore((s) => s.logout);
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const alertCount = triggeredData?.total ?? 0;

  const menuItems = [
    {
      key: "/",
      icon: <DashboardOutlined />,
      label: <Link to="/">Tổng quan</Link>,
    },
    {
      key: "/sims",
      icon: <MobileOutlined />,
      label: <Link to="/sims">Danh sách SIM M2M</Link>,
    },
    {
      key: "/groups",
      icon: <GroupOutlined />,
      label: <Link to="/groups">Nhóm sản phẩm</Link>,
    },
    {
      key: "/alerts",
      icon: (
        <Badge count={alertCount} size="small" offset={[6, collapsed ? 10 : 0]}>
          <BellOutlined />
        </Badge>
      ),
      label: <Link to="/alerts">Cảnh báo dung lượng</Link>,
    },
    {
      key: "/master-sims",
      icon: <CrownOutlined />,
      label: <Link to="/master-sims">SIM chủ (M2M)</Link>,
    },
    {
      key: "/history",
      icon: <HistoryOutlined />,
      label: <Link to="/history">Lịch sử sử dụng</Link>,
    },
  ];

  const handleNavClick = () => {
    if (isMobile) setDrawerOpen(false);
  };

  const logo = (
    <div
      style={{
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        padding: "0 12px",
      }}
    >
      {!collapsed ? (
        <Title level={5} style={{ color: "#fff", margin: 0, fontSize: 14 }}>
          📡 Vinaphone M2M
        </Title>
      ) : (
        <span style={{ color: "#fff", fontSize: 20 }}>📡</span>
      )}
    </div>
  );

  const menu = (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[location.pathname]}
      items={menuItems}
      onClick={handleNavClick}
      style={{ marginTop: 8 }}
    />
  );

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* Desktop Sider */}
      {!isMobile && (
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          theme="dark"
          width={220}
          style={{
            background: "#001529",
            position: "fixed",
            height: "100vh",
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 100,
            overflow: "auto",
          }}
        >
          {logo}
          {menu}
        </Sider>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={220}
          styles={{
            body: { padding: 0, background: "#001529" },
            header: {
              background: "#001529",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
            },
          }}
          title={
            <span style={{ color: "#fff", fontSize: 14 }}>
              📡 Vinaphone M2M
            </span>
          }
          closable
        >
          {menu}
        </Drawer>
      )}

      <Layout
        style={{
          marginLeft: isMobile ? 0 : collapsed ? 80 : 220,
          transition: "margin-left 0.2s",
        }}
      >
        <Header
          style={{
            background: "#fff",
            padding: "0 16px",
            display: "flex",
            alignItems: "center",
            boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
            gap: 12,
            position: "sticky",
            top: 0,
            zIndex: 99,
            width: "100%",
          }}
        >
          {isMobile && (
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setDrawerOpen(true)}
              style={{ fontSize: 18 }}
            />
          )}
          <Title
            level={4}
            style={{
              margin: 0,
              color: "#1890ff",
              fontSize: isMobile ? 14 : 18,
              flex: 1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {isMobile
              ? "Vinaphone M2M"
              : "Hệ thống quản lý SIM M2M – Vinaphone"}
          </Title>
          {alertCount > 0 && (
            <Badge
              count={`${alertCount} cảnh báo`}
              style={{
                background: "#ff4d4f",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
              onClick={() => navigate("/alerts")}
            />
          )}
          <Button
            type="text"
            icon={<LogoutOutlined />}
            onClick={() => {
              logout();
              navigate("/login");
            }}
            title="Đăng xuất"
          />
        </Header>

        <Content
          style={{
            margin: isMobile ? "12px 8px" : "24px 16px",
            padding: isMobile ? 12 : 24,
            background: "#f0f2f5",
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
