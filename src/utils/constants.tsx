import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  LockOutlined,
  StopOutlined,
  SyncOutlined,
} from "@ant-design/icons";

export const VIN_STATUS_OPTIONS = [
  {
    value: 1,
    label: "Mới",
    color: "#1890ff",
    icon: <ExclamationCircleOutlined />,
  },
  {
    value: 2,
    label: "Đang hoạt động",
    color: "#52c41a",
    icon: <SyncOutlined />,
  },
  {
    value: 3,
    label: "Đã xác nhận",
    color: "#faad14",
    icon: <CheckCircleOutlined />,
  },
  {
    value: 4,
    label: "Đã hủy",
    color: "#ff4d4f",
    icon: <StopOutlined />,
  },
  {
    value: 5,
    label: "Tạm khoá",
    color: "#fa8c16",
    icon: <LockOutlined />,
  },
  {
    value: 6,
    label: "Chờ huỷ",
    color: "#ff7a45",
    icon: <ClockCircleOutlined />,
  },
];
