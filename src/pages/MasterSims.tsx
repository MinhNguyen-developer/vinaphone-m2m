import React, { useEffect, useMemo, useState } from "react";
import { Card, Table, Tag, Typography, Space, Button } from "antd";
import { SearchOutlined, TeamOutlined } from "@ant-design/icons";
import type {
  ColumnsType,
  TablePaginationConfig,
  SorterResult,
} from "antd/es/table/interface";
import type { MonthlyDataUsage, SimCard } from "../types";
import { useMasterSims } from "../hooks/useMasterSims";
import SimGroupMembersModal from "../components/SIM/SimGroupMembersModal";
import SimMasterMembersModal from "../components/SIM/SimMasterMembersModal";
import dayjs from "dayjs";
import formatNumber from "../utils/formatNumber";
import { DebouncedInput } from "../components/DebouncedInput";
import { CustomTableFilter } from "../components/CustomTableFilter";
import { ServerSelect } from "../components/ServerSelect";
import { type FilterField, useFilters } from "../hooks/useFilters";
import { queryKeys } from "../hooks/queryKeys";
import { ratingPlansApi } from "../api/rating-plans.api";

const { Title, Text } = Typography;

// ─── Filter keys ─────────────────────────────────────────────────────────────

const ALL_FILTER_KEYS = [
  "search",
  "msisdn",
  "imsi",
  "contractCode",
  "ratingPlanId",
  "sort",
] as const;
type FilterKey = (typeof ALL_FILTER_KEYS)[number];

const VISIBLE_FILTER_KEYS = ALL_FILTER_KEYS.filter(
  (k) => k !== "sort",
) as FilterKey[];

// ─── Component ───────────────────────────────────────────────────────────────

const MasterSims: React.FC = () => {
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 10,
    pageSizeOptions: ["10", "20", "50"],
    showSizeChanger: true,
  });

  const [modalSim, setModalSim] = useState<SimCard | null>(null);
  const [groupModalId, setGroupModalId] = useState<string | null>(null);
  const [groupModalName, setGroupModalName] = useState<string | null>(null);

  // ── Filter fields ─────────────────────────────────────────────────────
  const filterFields = useMemo<FilterField<FilterKey, any>[]>(
    () => [
      {
        filterKey: "search",
        label: "Từ khóa",
        colSpan: { xs: 24, sm: 12, md: 6, lg: 4 },
        render: (value, onChange) => (
          <DebouncedInput
            placeholder="Tìm kiếm SĐT"
            prefix={<SearchOutlined />}
            value={(value as string) ?? ""}
            onChange={onChange}
          />
        ),
      },
      {
        filterKey: "msisdn",
        label: "MSISDN",
        colSpan: { xs: 24, sm: 12, md: 5, lg: 3 },
        render: (value, onChange) => (
          <DebouncedInput
            placeholder="MSISDN"
            value={(value as string) ?? ""}
            onChange={onChange}
          />
        ),
      },
      {
        filterKey: "imsi",
        label: "IMSI",
        colSpan: { xs: 24, sm: 12, md: 5, lg: 3 },
        render: (value, onChange) => (
          <DebouncedInput
            placeholder="IMSI"
            value={(value as string) ?? ""}
            onChange={onChange}
          />
        ),
      },
      {
        filterKey: "contractCode",
        label: "Mã hợp đồng",
        colSpan: { xs: 24, sm: 12, md: 5, lg: 3 },
        render: (value, onChange) => (
          <DebouncedInput
            placeholder="Mã hợp đồng"
            value={(value as string) ?? ""}
            onChange={onChange}
          />
        ),
      },
      {
        filterKey: "ratingPlanId",
        label: "Gói cước",
        colSpan: { xs: 24, sm: 12, md: 4, lg: 3 },
        render: (value, onChange) => (
          <ServerSelect
            queryKey={queryKeys.ratingPlans.list()}
            placeholder="Gói cước"
            value={(value as string) || undefined}
            popupMatchSelectWidth={400}
            fetchFn={({ page, pageSize, search }) =>
              ratingPlansApi.getList({ page, pageSize, search })
            }
            onChange={(v) => onChange(v)}
            allowClear
            style={{ width: "100%" }}
            getOptionValue={(rp) => String(rp.ratingPlanId)}
            getOptionLabel={(rp) => `${rp.name} - (${rp.code})`}
          />
        ),
        toUrlParams: (v) => ({
          ratingPlanId: v != null ? String(v) : undefined,
        }),
        fromUrlParams: (p) => p.get("ratingPlanId") ?? undefined,
      },
      // Hidden — only for URL sync
      {
        filterKey: "sort",
        label: "Sắp xếp",
        render: () => null,
      },
    ],
    [],
  );

  const { filterValues, filterBar, filterToolbox, setFilterValue } =
    useFilters<FilterKey>({
      fields: filterFields,
      storageKey: "master-sim-filters",
      defaultVisibleKeys: VISIBLE_FILTER_KEYS,
    });

  // ── Reset page on filter change ───────────────────────────────────────
  const nonSortFilterKey = JSON.stringify(
    Object.fromEntries(
      Object.entries(filterValues).filter(([k]) => k !== "sort"),
    ),
  );
  useEffect(() => {
    setPagination((prev) => ({ ...prev, current: 1 }));
  }, [nonSortFilterKey]);

  // ── Query params ──────────────────────────────────────────────────────
  const queryParams = useMemo(() => {
    const toNum = (v: unknown) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };
    return {
      page: pagination.current,
      pageSize: pagination.pageSize,
      search: (filterValues.search as string) || undefined,
      msisdn: (filterValues.msisdn as string) || undefined,
      imsi: (filterValues.imsi as string) || undefined,
      contractCode: (filterValues.contractCode as string) || undefined,
      ratingPlanId: toNum(filterValues.ratingPlanId),
      sort: (filterValues.sort as string) || undefined,
    };
  }, [filterValues, pagination]);

  const { data: { data: members = [], total } = {}, isLoading } =
    useMasterSims(queryParams);

  // ── Table change (pagination + sort) ─────────────────────────────────
  const handleTableChange = (
    newPagination: TablePaginationConfig,
    _filters: Record<string, unknown>,
    sorter: SorterResult<SimCard> | SorterResult<SimCard>[],
  ) => {
    setPagination(newPagination);
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    const sortValue =
      s.columnKey && s.order
        ? `${String(s.columnKey)}:${s.order === "ascend" ? "asc" : "desc"}`
        : undefined;
    setFilterValue("sort", sortValue ?? "");
  };

  const sortStr = filterValues.sort as string | undefined;
  const sortOrder = (field: string) =>
    sortStr?.startsWith(`${field}:`)
      ? sortStr.endsWith(":asc")
        ? ("ascend" as const)
        : ("descend" as const)
      : null;

  // ── Columns ───────────────────────────────────────────────────────────
  const columns: ColumnsType<SimCard> = [
    {
      title: "Số điện thoại",
      dataIndex: "phoneNumber",
      key: "phoneNumber",
      fixed: "left",
      sorter: true,
      sortOrder: sortOrder("phoneNumber"),
      render: (v, record) => (
        <Space size={4}>
          <Text
            strong
            style={{ color: "#1677ff", cursor: "pointer" }}
            onClick={() => setModalSim(record)}
          >
            {v}
          </Text>
        </Space>
      ),
      filterDropdown: ({ confirm, close }) => (
        <CustomTableFilter
          filterKey="search"
          setFilterValue={setFilterValue}
          close={close}
          confirm={confirm}
        />
      ),
      filterIcon: () => (
        <SearchOutlined
          style={{ color: !!filterValues.search ? "#1677ff" : undefined }}
        />
      ),
    },
    {
      title: "IMSI",
      dataIndex: "imsi",
      key: "imsi",
      sorter: true,
      sortOrder: sortOrder("imsi"),
      render: (v) =>
        v ? (
          <Text code style={{ fontSize: 11 }}>
            {v}
          </Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Mã hợp đồng",
      dataIndex: "contractCode",
      key: "contractCode",
      sorter: true,
      sortOrder: sortOrder("contractCode"),
      render: (v) =>
        v ? <Tag color="geekblue">{v}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: "Gói cước",
      dataIndex: "ratingPlanName",
      key: "ratingPlanName",
      sorter: true,
      sortOrder: sortOrder("ratingPlanName"),
      render: (v, r) =>
        (v ?? r.productCode) ? (
          <Tag color="blue">{v ?? r.productCode}</Tag>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Dung lượng sử dụng (tháng)",
      dataIndex: "monthlyDataUsages",
      key: "monthlyDataUsages",
      sorter: true,
      sortOrder: sortOrder("usedMB"),
      render: (v?: MonthlyDataUsage[]) => {
        const currentMonth = dayjs().format("YYYY-MM");
        const currentUsage = v?.find((u) => u.month === currentMonth);
        return currentUsage ? (
          <Text style={{ fontSize: 11 }}>
            {formatNumber(currentUsage.dataUsedMB)} /{" "}
            {formatNumber(currentUsage.totalData)} MB
          </Text>
        ) : (
          <Text type="secondary">—</Text>
        );
      },
    },
    {
      title: "Thuê bao thành viên",
      key: "sogMembers",
      width: 180,
      render: (_v, record) => {
        if (!record.sogGroupId || record.sogIsOwner !== true)
          return <Text type="secondary">—</Text>;
        return (
          <Button
            size="small"
            icon={<TeamOutlined />}
            onClick={() => {
              setGroupModalId(record.sogGroupId!);
              setGroupModalName(record.sogGroupName ?? null);
            }}
          >
            Xem thành viên
          </Button>
        );
      },
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
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          👑 Sim Chủ
        </Title>
        <Space wrap>{filterToolbox}</Space>
      </div>

      <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
        Danh sách sim chủ.
      </Text>

      {/* Filters */}
      <Card style={{ marginBottom: 12 }}>{filterBar}</Card>

      <Card>
        <Table
          title={() => (
            <Title level={5}>{`Tổng: ${total ?? 0} thuê bao`}</Title>
          )}
          dataSource={members}
          columns={columns}
          scroll={{ x: "max-content" }}
          rowKey="id"
          onChange={handleTableChange}
          size="small"
          pagination={{ ...pagination, total }}
          loading={isLoading}
        />
      </Card>

      <SimMasterMembersModal sim={modalSim} onClose={() => setModalSim(null)} />

      <SimGroupMembersModal
        groupId={groupModalId}
        groupName={groupModalName}
        onClose={() => {
          setGroupModalId(null);
          setGroupModalName(null);
        }}
      />
    </div>
  );
};

export default MasterSims;
