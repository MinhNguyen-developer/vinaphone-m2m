import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  LockOutlined,
  RollbackOutlined,
  StopOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import type { SimStatus } from "../types";

type StatusOption = {
  value: SimStatus;
  label: string;
  color: string;
  icon: React.ReactNode;
};

export const VIN_STATUS_OPTIONS: StatusOption[] = [
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
    label: "Đã khoá",
    color: "#fa8c16",
    icon: <LockOutlined />,
  },
  {
    value: 6,
    label: "Chờ huỷ",
    color: "#ff7a45",
    icon: <ClockCircleOutlined />,
  },
  {
    value: 7,
    label: "Đã thu hồi",
    color: "#d9d9d9",
    icon: <RollbackOutlined />,
  },
  {
    value: 8,
    label: "Chờ khoá",
    color: "#d9d9d9",
    icon: <ClockCircleOutlined />,
  },
];
