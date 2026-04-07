import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import AppLayout from './components/Layout/AppLayout';
import Dashboard from './pages/Dashboard';
import SimManagement from './pages/SimManagement';
import ProductGroups from './pages/ProductGroups';
import AlertManagement from './pages/AlertManagement';
import MasterSims from './pages/MasterSims';
import UsageHistory from './pages/UsageHistory';

const App: React.FC = () => {
  return (
    <ConfigProvider
      locale={viVN}
      theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 8,
        },
      }}
    >
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/sims" element={<SimManagement />} />
            <Route path="/groups" element={<ProductGroups />} />
            <Route path="/alerts" element={<AlertManagement />} />
            <Route path="/master-sims" element={<MasterSims />} />
            <Route path="/history" element={<UsageHistory />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;
