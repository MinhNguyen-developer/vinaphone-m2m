import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Empty,
  Modal,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import type {
  ColumnsType,
  TablePaginationConfig,
} from "antd/es/table/interface";
import type { GroupWithCount } from "../types";
import { formatMB } from "../utils";
import { useGroups, useDeleteGroup } from "../hooks/useGroups";
import GroupDrawer from "../components/Group/GroupDrawer";
import { type FilterField, useFilters } from "../hooks/useFilters";
import { DebouncedInput } from "../components/DebouncedInput";

const { Title, Text } = Typography;

type DrawerMode = "create" | "edit";

// ─── Filter keys ─────────────────────────────────────────────────────────────

const ALL_FILTER_KEYS = ["name"] as const;
type FilterKey = (typeof ALL_FILTER_KEYS)[number];

// ─── Component ───────────────────────────────────────────────────────────────

const ProductGroups: React.FC = () => {
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 20,
    pageSizeOptions: ["10", "20", "50"],
    showSizeChanger: true,
  });

  // ── Filter fields ─────────────────────────────────────────────────────
  const filterFields = useMemo<FilterField<FilterKey, any>[]>(
    () => [
      {
        filterKey: "name",
        label: "Tên nhóm",
        colSpan: { xs: 24, sm: 12, md: 6, lg: 4 },
        render: (value, onChange) => (
          <DebouncedInput
            placeholder="Tìm theo tên nhóm"
            prefix={<SearchOutlined />}
            value={(value as string) ?? ""}
            onChange={onChange}
          />
        ),
      },
    ],
    [],
  );

  const { filterValues, filterBar } = useFilters<FilterKey>({
    fields: filterFields,
    storageKey: "group-filters",
    defaultVisibleKeys: ALL_FILTER_KEYS,
  });

  // Reset to page 1 on filter change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, current: 1 }));
  }, [filterValues.name]);

  // ── Query params ──────────────────────────────────────────────────────
  const queryParams = useMemo(
    () => ({
      page: pagination.current,
      pageSize: pagination.pageSize,
      search: (filterValues.name as string) || undefined,
    }),
    [filterValues.name, pagination],
  );

  const {
    data: groupsResponse,
    isLoading: groupsLoading,
    isFetching: groupsFetching,
    isRefetching: groupsRefetching,
  } = useGroups(queryParams);

  const groups = groupsResponse?.data ?? [];
  const total = groupsResponse?.total ?? 0;

  const { mutateAsync: deleteGroup, isPending: deleting } = useDeleteGroup();

  // ── Drawer state ──────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("create");
  const [editingGroup, setEditingGroup] = useState<GroupWithCount | null>(null);

  // ── Delete state ──────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<GroupWithCount | null>(null);

  // ── Handlers ──────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingGroup(null);
    setDrawerMode("create");
    setDrawerOpen(true);
  };

  const openEdit = (group: GroupWithCount) => {
    setEditingGroup(group);
    setDrawerMode("edit");
    setDrawerOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteGroup(deleteTarget.id);
    message.success(`Đã xoá nhóm "${deleteTarget.name}"`);
    setDeleteTarget(null);
  };

  // ── Columns ───────────────────────────────────────────────────────────
  const groupColumns: ColumnsType<GroupWithCount> = [
    {
      title: "Tên nhóm",
      dataIndex: "name",
      key: "name",
      fixed: "left",
      render: (v, record) => (
        <Space>
          <TeamOutlined />
          <Text strong>{v}</Text>
          <Tag color="blue">{record.simCount} SIM</Tag>
        </Space>
      ),
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      key: "description",
      render: (v) => v || <Text type="secondary">—</Text>,
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 140,
      render: (v) => (v ? String(v).slice(0, 10) : "—"),
    },
    {
      title: "Tổng dung lượng",
      key: "totalUsedMB",
      width: 160,
      render: (_, record) => formatMB(record.totalUsedMB),
    },
    {
      title: "Hành động",
      key: "actions",
      width: 140,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEdit(record)}
          >
            Sửa
          </Button>
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => setDeleteTarget(record)}
          >
            Xoá
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          🗂️ Nhóm sản phẩm
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Thêm nhóm
        </Button>
      </div>

      <Card style={{ marginBottom: 12 }}>{filterBar}</Card>

      <Card>
        <Table
          dataSource={groups}
          columns={groupColumns}
          rowKey="id"
          size="middle"
          loading={groupsLoading || groupsFetching || groupsRefetching}
          pagination={{
            ...pagination,
            total,
            onChange: (page, pageSize) =>
              setPagination((prev) => ({ ...prev, current: page, pageSize })),
          }}
          scroll={{ x: "max-content" }}
          locale={{
            emptyText: (
              <Empty
                description="Chưa có nhóm sản phẩm nào"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ),
          }}
        />
      </Card>

      <GroupDrawer
        open={drawerOpen}
        mode={drawerMode}
        editingGroup={editingGroup}
        onClose={() => setDrawerOpen(false)}
      />

      <Modal
        title="Xác nhận xoá nhóm"
        open={!!deleteTarget}
        onOk={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        okText="Xoá"
        okButtonProps={{ danger: true, loading: deleting }}
        cancelText="Huỷ"
      >
        <p>
          Bạn có chắc muốn xoá nhóm <strong>"{deleteTarget?.name}"</strong>{" "}
          không?
        </p>
        <p style={{ color: "#ff4d4f" }}>
          Hành động này sẽ xoá toàn bộ quan hệ SIM trong nhóm và không thể hoàn
          tác.
        </p>
      </Modal>
    </div>
  );
};

export default ProductGroups;
