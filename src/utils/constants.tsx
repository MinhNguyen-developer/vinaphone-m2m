import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
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
];
