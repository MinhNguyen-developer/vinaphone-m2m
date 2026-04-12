import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import AppLayout from './components/Layout/AppLayout';
import Dashboard from './pages/Dashboard';
import SimManagement from './pages/SimManagement';
import ProductGroups from './pages/ProductGroups';
import AlertManagement from './pages/AlertManagement';
import MasterSims from './pages/MasterSims';
import UsageHistory from './pages/UsageHistory';
import Login from './pages/Login';
import { useAuthStore } from './store/useAuthStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/** Redirects unauthenticated users to /login */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
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
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
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
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </ConfigProvider>
    </QueryClientProvider>
  );
};

export default App;
