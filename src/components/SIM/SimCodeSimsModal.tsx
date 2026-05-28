import React, { useState } from "react";
import { Modal, Table, Tag, Typography } from "antd";
import type {
  TablePaginationConfig,
  SorterResult,
} from "antd/es/table/interface";
import type { ColumnsType } from "antd/es/table";
import { useQuery } from "@tanstack/react-query";
import type { SimCodeItem, SimCodeSimItem } from "../../api/simCodes.api";
import { simCodesApi } from "../../api/simCodes.api";
import { formatMB } from "../../utils";
import { VIN_STATUS_OPTIONS } from "../../utils/constants";

const { Text } = Typography;

interface SimCodeSimsModalProps {
  simCode: SimCodeItem | null;
  onClose: () => void;
}

const statusMap = Object.fromEntries(
  VIN_STATUS_OPTIONS.map((s) => [s.value, s]),
);

const SimCodeSimsModal: React.FC<SimCodeSimsModalProps> = ({
  simCode,
  onClose,
}) => {
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 20,
    pageSizeOptions: ["10", "20", "50"],
    showSizeChanger: true,
  });
  const [sort, setSort] = useState<string | undefined>(undefined);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["sim-codes", simCode?.id, "sims-detail", pagination, sort],
    queryFn: () =>
      simCodesApi.getSimsDetail(simCode!.id, {
        page: pagination.current,
        pageSize: pagination.pageSize,
        sort,
      }),
    enabled: !!simCode,
    keepPreviousData: true,
  } as any);

  const sims: SimCodeSimItem[] = (data as any)?.data ?? [];
  const total: number = (data as any)?.total ?? 0;

  const handleTableChange = (
    newPagination: TablePaginationConfig,
    _filters: Record<string, unknown>,
    sorter: SorterResult<SimCodeSimItem> | SorterResult<SimCodeSimItem>[],
  ) => {
    setPagination(newPagination);
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    setSort(
      s.columnKey && s.order
        ? `${String(s.columnKey)}:${s.order === "ascend" ? "asc" : "desc"}`
        : undefined,
    );
  };

  const columns: ColumnsType<SimCodeSimItem> = [
    {
      title: "Số điện thoại",
      dataIndex: "phoneNumber",
      key: "phoneNumber",
      sorter: true,
      sortOrder: sort?.startsWith("phoneNumber:")
        ? sort.endsWith(":asc")
          ? "ascend"
          : "descend"
        : null,
      render: (v) => <Text strong>{v}</Text>,
    },
    {
      title: "Gói cước",
      dataIndex: "ratingPlanName",
      key: "ratingPlanName",
      render: (v) => v ?? <Text type="secondary">—</Text>,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      sorter: true,
      sortOrder: sort?.startsWith("status:")
        ? sort.endsWith(":asc")
          ? "ascend"
          : "descend"
        : null,
      render: (v: number) => {
        const s = statusMap[v];
        return s ? (
          <Tag color={s.color} icon={s.icon}>
            {s.label}
          </Tag>
        ) : (
          <Text type="secondary">—</Text>
        );
      },
    },
    {
      title: "Dung lượng",
      dataIndex: "usedMB",
      key: "usedMB",
      sorter: true,
      sortOrder: sort?.startsWith("usedMB:")
        ? sort.endsWith(":asc")
          ? "ascend"
          : "descend"
        : null,
      render: (v: number) => formatMB(v),
    },
    {
      title: "Ngày kích hoạt",
      dataIndex: "firstUsedAt",
      key: "firstUsedAt",
      sorter: true,
      sortOrder: sort?.startsWith("firstUsedAt:")
        ? sort.endsWith(":asc")
          ? "ascend"
          : "descend"
        : null,
      render: (v) =>
        v ? String(v).slice(0, 16) : <Text type="secondary">—</Text>,
    },
  ];

  return (
    <Modal
      title={
        simCode ? (
          <span>
            SIM thuộc mã{" "}
            <Text strong style={{ color: "#1890ff" }}>
              {simCode.code}
            </Text>
            {simCode._count != null && (
              <Text type="secondary" style={{ marginLeft: 8, fontSize: 13 }}>
                ({simCode._count.sims} SIM)
              </Text>
            )}
          </span>
        ) : null
      }
      open={!!simCode}
      onCancel={onClose}
      footer={null}
      width={860}
      destroyOnClose
      afterClose={() => {
        setPagination((p) => ({ ...p, current: 1 }));
        setSort(undefined);
      }}
    >
      <Table
        dataSource={sims}
        columns={columns}
        rowKey="id"
        size="middle"
        loading={isLoading || isFetching}
        onChange={handleTableChange}
        pagination={{
          ...pagination,
          total,
          onChange: (page, pageSize) =>
            setPagination((prev) => ({ ...prev, current: page, pageSize })),
        }}
        scroll={{ x: "max-content" }}
      />
    </Modal>
  );
};

export default SimCodeSimsModal;
