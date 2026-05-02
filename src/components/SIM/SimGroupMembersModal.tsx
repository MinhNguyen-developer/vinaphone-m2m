import React, { useCallback, useMemo, useRef, useState } from "react";
import { Modal, Table, Tag, Typography, Spin, Space, Input } from "antd";
import type { TablePaginationConfig } from "antd";
import { TeamOutlined, SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import debounce from "lodash/debounce";
import type { QueryGroupMembersParams, SimCard } from "../../types";
import { useSimGroupMembers } from "../../hooks/useSims";
import { VIN_STATUS_OPTIONS } from "../../utils/constants";
import formatNumber from "../../utils/formatNumber";

const { Text } = Typography;

interface Props {
  groupId: string | null;
  groupName?: string | null;
  onClose: () => void;
}

const columns: ColumnsType<SimCard> = [
  {
    title: "Số điện thoại",
    dataIndex: "phoneNumber",
    key: "phoneNumber",
    render: (v) => <Text strong>{v}</Text>,
  },
  {
    title: "Dung lượng",
    dataIndex: "usedMB",
    key: "usedMB",
    sorter: (a, b) => (a.usedMB ?? 0) - (b.usedMB ?? 0),
    render: (v) =>
      v != null ? (
        <Text style={{ fontSize: 11 }}>{formatNumber(v)} MB</Text>
      ) : (
        <Text type="secondary">—</Text>
      ),
  },
  {
    title: "Trạng thái",
    dataIndex: "status",
    key: "status",
    render: (v) => {
      if (v == null) return <Text type="secondary">—</Text>;
      const s = VIN_STATUS_OPTIONS.find((o) => o.value === v);
      return s ? (
        <Tag color={s.color} icon={s.icon}>
          {s.label}
        </Tag>
      ) : (
        <Tag>{v}</Tag>
      );
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
          <Table<SimCard>
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
