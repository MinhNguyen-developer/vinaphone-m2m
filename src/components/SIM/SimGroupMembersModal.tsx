import React, { useCallback, useMemo, useRef, useState } from "react";
import { Modal, Table, Tag, Typography, Spin, Space, Input } from "antd";
import type { TablePaginationConfig } from "antd";
import { TeamOutlined, SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import debounce from "lodash/debounce";
import type { QueryGroupMembersParams, SimGroupMember } from "../../types";
import { useSimGroupMembers } from "../../hooks/useSims";

const { Text } = Typography;

const STATUS_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Mới", color: "default" },
  2: { label: "Hoạt động", color: "green" },
  3: { label: "Tạm khoá", color: "orange" },
  4: { label: "Huỷ", color: "red" },
};

interface Props {
  groupId: string | null;
  groupName?: string | null;
  onClose: () => void;
}

const columns: ColumnsType<SimGroupMember> = [
  {
    title: "Số điện thoại",
    dataIndex: "msisdn",
    key: "msisdn",
    render: (v) => <Text strong>{v}</Text>,
  },
  {
    title: "Gói cước",
    dataIndex: "ratingPlanName",
    key: "ratingPlan",
    render: (v) =>
      v ? <Tag color="blue">{v}</Tag> : <Text type="secondary">—</Text>,
  },
  {
    title: "Trạng thái",
    dataIndex: "status",
    key: "status",
    render: (v) => {
      if (v == null) return <Text type="secondary">—</Text>;
      const s = STATUS_LABELS[v as number];
      return s ? <Tag color={s.color}>{s.label}</Tag> : <Tag>{v}</Tag>;
    },
  },
];

const SimGroupMembersModal: React.FC<Props> = ({
  groupId,
  groupName,
  onClose,
}) => {
  // Debounce search input
  const [msisdnFilter, setMsisdnFilter] = useState("");
  const [debouncedFilter, setDebouncedFilter] = useState("");
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 10,
    showSizeChanger: true,
  });

  const applyDebounce = useMemo(
    () =>
      debounce((value: string) => {
        setDebouncedFilter(value);
        setPagination((prev) => ({ ...prev, current: 1 }));
      }, 500),
    [],
  );

  // Cancel pending debounce on unmount
  const applyDebounceRef = useRef(applyDebounce);
  applyDebounceRef.current = applyDebounce;
  React.useEffect(() => () => applyDebounceRef.current.cancel(), []);

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setMsisdnFilter(e.target.value);
      applyDebounce(e.target.value);
    },
    [applyDebounce],
  );
  const queryParams: QueryGroupMembersParams = {
    page: pagination?.current,
    pageSize: pagination?.pageSize,
    msisdn: debouncedFilter,
  };

  const { data, isLoading } = useSimGroupMembers(groupId, queryParams);

  return (
    <Modal
      open={!!groupId}
      onCancel={onClose}
      footer={null}
      width={640}
      centered
      destroyOnHidden
      title={
        <Space>
          <TeamOutlined style={{ color: "#1677ff" }} />
          <span>
            Thành viên nhóm – <Tag color="blue">{groupName ?? groupId}</Tag>
          </span>
        </Space>
      }
    >
      {isLoading ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          <Input
            placeholder="Tìm số điện thoại..."
            prefix={<SearchOutlined />}
            value={msisdnFilter}
            onChange={handleSearch}
            onClear={() => {
              setMsisdnFilter("");
              applyDebounce("");
            }}
            allowClear
            style={{ marginBottom: 12 }}
          />
          <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
            {data?.total} thành viên trong nhóm này
          </Text>
          <Table
            dataSource={data?.data}
            columns={columns}
            rowKey={(r) => r.id}
            size="small"
            pagination={{ ...pagination, total: data?.total }}
            onChange={(pag) => setPagination(pag)}
          />
        </>
      )}
    </Modal>
  );
};

export default SimGroupMembersModal;
