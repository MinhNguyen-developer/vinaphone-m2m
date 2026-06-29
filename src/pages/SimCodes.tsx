import React, { useEffect, useMemo, useState } from "react";
import { Button, Card, Empty, Flex, Modal, Table, Tag, Typography } from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import type {
  ColumnsType,
  TablePaginationConfig,
  SorterResult,
} from "antd/es/table/interface";
import type { SimCodeItem } from "../api/simCodes.api";
import { useSimCodes, useDeleteSimCode } from "../hooks/useSimCodes";
import { type FilterField, useFilters } from "../hooks/useFilters";
import { DebouncedInput } from "../components/DebouncedInput";
import SimCodeDrawer from "../components/SIM/SimCodeDrawer";
import SimCodeSimsModal from "../components/SIM/SimCodeSimsModal";
import { TableActions } from "../components/TableActions";

const { Title, Text } = Typography;

type DrawerMode = "create" | "edit";

const ALL_FILTER_KEYS = ["search"] as const;
type FilterKey = (typeof ALL_FILTER_KEYS)[number];

const SimCodes: React.FC = () => {
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 20,
    pageSizeOptions: ["10", "20", "50"],
    showSizeChanger: true,
  });
  const [sort, setSort] = useState<string | undefined>(undefined);

  const handleTableChange = (
    newPagination: TablePaginationConfig,
    _filters: Record<string, unknown>,
    sorter: SorterResult<SimCodeItem> | SorterResult<SimCodeItem>[],
  ) => {
    setPagination(newPagination);
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    setSort(
      s.columnKey && s.order
        ? `${String(s.columnKey)}:${s.order === "ascend" ? "asc" : "desc"}`
        : undefined,
    );
  };

  // ── Filters ───────────────────────────────────────────────────────────
  const filterFields = useMemo<FilterField<FilterKey, any>[]>(
    () => [
      {
        filterKey: "search",
        label: "Mã SIM",
        colSpan: { xs: 24, sm: 12, md: 6, lg: 4 },
        render: (value, onChange) => (
          <DebouncedInput
            placeholder="Tìm theo mã SIM"
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
    storageKey: "sim-code-filters",
    defaultVisibleKeys: ALL_FILTER_KEYS,
  });

  useEffect(() => {
    setPagination((prev) => ({ ...prev, current: 1 }));
  }, [filterValues.search]);

  // ── Query ─────────────────────────────────────────────────────────────
  const queryParams = useMemo(
    () => ({
      page: pagination.current,
      pageSize: pagination.pageSize,
      search: (filterValues.search as string) || undefined,
      sort,
    }),
    [filterValues.search, pagination, sort],
  );

  const {
    data: response,
    isLoading,
    isFetching,
    isRefetching,
  } = useSimCodes(queryParams);

  const items = response?.data ?? [];
  const total = response?.total ?? 0;

  // ── Mutations ─────────────────────────────────────────────────────────
  const { mutateAsync: deleteSimCode, isPending: deleting } =
    useDeleteSimCode();

  // ── Drawer state ──────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("create");
  const [editingItem, setEditingItem] = useState<SimCodeItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SimCodeItem | null>(null);
  const [detailItem, setDetailItem] = useState<SimCodeItem | null>(null);

  const openCreate = () => {
    setEditingItem(null);
    setDrawerMode("create");
    setDrawerOpen(true);
  };

  const openEdit = (item: SimCodeItem) => {
    setEditingItem(item);
    setDrawerMode("edit");
    setDrawerOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteSimCode(deleteTarget.id);
    setDeleteTarget(null);
  };

  // ── Columns ───────────────────────────────────────────────────────────
  const columns: ColumnsType<SimCodeItem> = [
    {
      title: "Mã SIM",
      dataIndex: "code",
      key: "code",
      sorter: true,
      sortOrder: sort?.startsWith("code:")
        ? sort.endsWith(":asc")
          ? "ascend"
          : "descend"
        : null,
      render: (v, record) => (
        <Typography.Link onClick={() => setDetailItem(record)}>
          {v}
        </Typography.Link>
      ),
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      key: "description",
      render: (v) => v || <Text type="secondary">—</Text>,
    },
    {
      title: "Số SIM",
      key: "simCount",
      width: 120,
      sorter: true,
      sortOrder: sort?.startsWith("simCount:")
        ? sort.endsWith(":asc")
          ? "ascend"
          : "descend"
        : null,
      render: (_, record) => (
        <Tag color="blue">{record._count?.sims ?? 0} SIM</Tag>
      ),
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 140,
      sorter: true,
      sortOrder: sort?.startsWith("createdAt:")
        ? sort.endsWith(":asc")
          ? "ascend"
          : "descend"
        : null,
      render: (v) =>
        v ? String(v).slice(0, 10) : <Text type="secondary">—</Text>,
    },
    {
      title: "Hành động",
      key: "actions",
      width: 100,
      align: "center",
      render: (_, record) => (
        <TableActions
          items={[
            {
              key: "edit",
              label: "Sửa",
              icon: <EditOutlined />,
              onClick: () => openEdit(record),
            },
            {
              key: "delete",
              label: "Xoá",
              danger: true,
              icon: <DeleteOutlined />,
              onClick: () => setDeleteTarget(record),
            },
          ]}
        />
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
          🏷️ Quản lý Mã SIM
        </Title>
      </div>

      <Card style={{ marginBottom: 12 }}>{filterBar}</Card>

      <Card>
        <Flex justify="end" style={{ marginBottom: 12 }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Thêm mã SIM
          </Button>
        </Flex>
        <Table
          dataSource={items}
          columns={columns}
          rowKey="id"
          size="middle"
          loading={isLoading || isFetching || isRefetching}
          onChange={handleTableChange}
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
                description="Chưa có mã SIM nào"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ),
          }}
        />
      </Card>

      <SimCodeDrawer
        open={drawerOpen}
        mode={drawerMode}
        editingItem={editingItem}
        onClose={() => setDrawerOpen(false)}
      />

      <SimCodeSimsModal
        simCode={detailItem}
        onClose={() => setDetailItem(null)}
      />

      {/* Delete Confirm */}
      <Modal
        title="Xác nhận xoá"
        open={!!deleteTarget}
        onOk={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        okText="Xoá"
        okButtonProps={{ danger: true, loading: deleting }}
        cancelText="Huỷ"
      >
        <p>
          Bạn có chắc muốn xoá mã SIM <strong>"{deleteTarget?.code}"</strong>?
        </p>
        <p style={{ color: "#ff4d4f" }}>
          Các SIM đang dùng mã này sẽ được gỡ liên kết.
        </p>
      </Modal>
    </div>
  );
};

export default SimCodes;
