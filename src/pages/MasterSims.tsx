import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Table,
  Tag,
  Typography,
  Space,
  Button,
  Progress,
  Tooltip,
} from "antd";
import { SearchOutlined, TeamOutlined } from "@ant-design/icons";
import type {
  ColumnsType,
  TablePaginationConfig,
  SorterResult,
} from "antd/es/table/interface";
import type { MonthlyDataUsage, SimCard, SimGroup } from "../types";
import { useMasterSims } from "../hooks/useMasterSims";
import SimGroupMembersModal from "../components/SIM/SimGroupMembersModal";
import SimMasterMembersModal from "../components/SIM/SimMasterMembersModal";
import dayjs from "dayjs";
import formatNumber from "../utils/formatNumber";
import { getProgressRemainingColor } from "../utils";
import { DebouncedInput } from "../components/DebouncedInput";
import { CustomTableFilter } from "../components/CustomTableFilter";
import { ServerSelect } from "../components/ServerSelect";
import { type FilterField, useFilters } from "../hooks/useFilters";
import { queryKeys } from "../hooks/queryKeys";
import { ratingPlansApi } from "../api/rating-plans.api";
import { groupsApi } from "../api/groups.api";

const { Title, Text } = Typography;

// ─── Filter keys ─────────────────────────────────────────────────────────────

const ALL_FILTER_KEYS = [
  "search",
  "contractCode",
  "ratingPlanId",
  "groupId",
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

  const [modalSimId, setModalSimId] = useState<string | null>(null);
  const [groupModalId, setGroupModalId] = useState<string | null>(null);
  const [groupModalName, setGroupModalName] = useState<string | null>(null);
  const [clientSort, setClientSort] = useState<{
    key: string;
    order: "ascend" | "descend";
  } | null>(null);

  // ── Filter fields ─────────────────────────────────────────────────────
  const filterFields = useMemo<FilterField<FilterKey, any>[]>(
    () => [
      {
        filterKey: "search",
        label: "Số điện thoại",
        colSpan: { xs: 24, sm: 12, md: 6, lg: 4 },
        render: (value, onChange) => (
          <DebouncedInput
            placeholder="Tìm kiếm SĐT, IMSI"
            prefix={<SearchOutlined />}
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
      {
        filterKey: "groupId",
        label: "Nhóm thiết bị",
        colSpan: { xs: 24, sm: 12, md: 4, lg: 3 },
        render: (value, onChange) => (
          <ServerSelect
            queryKey={queryKeys.groups.all}
            placeholder="Nhóm thiết bị"
            value={(value as string) || undefined}
            fetchFn={({ page, pageSize, search }) =>
              groupsApi.getList({ page, pageSize, search })
            }
            onChange={(v) => onChange(v)}
            allowClear
            style={{ width: "100%" }}
            getOptionValue={(g) => g.id}
            getOptionLabel={(g) => g.name}
          />
        ),
      },
      // Hidden — only for URL sync
      {
        filterKey: "sort",
        label: "Sắp xếp",
        hidden: true,
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
      contractCode: (filterValues.contractCode as string) || undefined,
      ratingPlanId: toNum(filterValues.ratingPlanId),
      groupId: (filterValues.groupId as string) || undefined,
      sort: (filterValues.sort as string) || undefined,
    };
  }, [filterValues, pagination]);

  const { data: { data: members = [], total } = {}, isLoading } =
    useMasterSims(queryParams);

  const currentMonth = dayjs().format("YYYY-MM");
  const displayMembers = useMemo(() => {
    if (!clientSort) return members;
    const dir = clientSort.order === "ascend" ? 1 : -1;
    return [...members].sort((a, b) => {
      if (clientSort.key === "remainingMB") {
        const getRemaining = (r: SimCard) => {
          const u = r.monthlyDataUsages?.find((x) => x.month === currentMonth);
          if (!u || u.totalData == null) return -Infinity;
          return (u.totalData ?? 0) - (u.dataUsedMB ?? 0);
        };
        return (getRemaining(a) - getRemaining(b)) * dir;
      }
      if (clientSort.key === "currentUsedMB") {
        const getUsed = (r: SimCard) =>
          r.monthlyDataUsages?.find((x) => x.month === currentMonth)
            ?.dataUsedMB ?? -Infinity;
        return (getUsed(a) - getUsed(b)) * dir;
      }
      return 0;
    });
  }, [members, clientSort, currentMonth]);

  // ── Table change (pagination + sort) ─────────────────────────────────
  const handleTableChange = (
    newPagination: TablePaginationConfig,
    _filters: Record<string, unknown>,
    sorter: SorterResult<SimCard> | SorterResult<SimCard>[],
  ) => {
    setPagination(newPagination);
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    if (s.columnKey === "remainingMB" || s.columnKey === "currentUsedMB") {
      setClientSort(
        s.order ? { key: String(s.columnKey), order: s.order } : null,
      );
      setFilterValue("sort", "");
      return;
    }
    setClientSort(null);
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
            onClick={() => setModalSimId(record.id)}
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
      render: (v: string | null) => {
        const imsi = v?.slice(-10);
        return v ? (
          <Text copyable={{ text: imsi }} style={{ fontSize: 11 }}>
            {imsi}
          </Text>
        ) : (
          <Text type="secondary">—</Text>
        );
      },
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
      title: "Nhóm thiết bị",
      key: "simGroups",
      render: (_v, record) => {
        const groups = (record.simGroups ?? []) as Partial<SimGroup>[];
        if (!groups.length) return <Text type="secondary">—</Text>;
        return (
          <Space size={4} wrap>
            {groups.map((g) => (
              <Tag color="purple" key={g.group?.id ?? g.groupId}>
                {g.group?.name}
              </Tag>
            ))}
          </Space>
        );
      },
      sorter: true,
      sortOrder: sortOrder("simGroups"),
    },
    {
      title: "Dung lượng sử dụng còn lại",
      key: "remainingMB",
      sorter: true,
      sortOrder: clientSort?.key === "remainingMB" ? clientSort.order : null,
      render: (_v, record) => {
        const currentUsage = record.monthlyDataUsages?.find(
          (u) => u.month === currentMonth,
        );
        if (!currentUsage || currentUsage.totalData == null)
          return <Text type="secondary">—</Text>;
        const remaining =
          (currentUsage.totalData ?? 0) - (currentUsage.dataUsedMB ?? 0);
        return (
          <Text
            style={{
              color: getProgressRemainingColor({
                total: currentUsage.totalData,
                used: currentUsage.dataUsedMB ?? 0,
              }),
              fontSize: 11,
            }}
          >
            {formatNumber(remaining)} MB
          </Text>
        );
      },
    },
    {
      title: "Dung lượng sử dụng (tháng)",
      dataIndex: "monthlyDataUsages",
      key: "currentUsedMB",
      sorter: true,
      sortOrder: clientSort?.key === "currentUsedMB" ? clientSort.order : null,
      render: (v?: MonthlyDataUsage[]) => {
        const currentUsage = v?.find((u) => u.month === currentMonth);
        if (!currentUsage) return <Text type="secondary">—</Text>;
        const used = currentUsage.dataUsedMB ?? 0;
        const total = currentUsage.totalData;
        if (!total)
          return <Text style={{ fontSize: 11 }}>{formatNumber(used)} MB</Text>;
        const pct = Math.min(Math.round((used / total) * 100), 100);
        return (
          <Tooltip title={`${formatNumber(used)} / ${formatNumber(total)} MB`}>
            <Progress
              percent={pct}
              size="small"
              strokeColor={getProgressRemainingColor({ total, used })}
              format={() => (
                <span
                  style={{ color: getProgressRemainingColor({ total, used }) }}
                >
                  {formatNumber(used)}/{formatNumber(total)}
                </span>
              )}
              style={{ minWidth: 140 }}
            />
          </Tooltip>
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
      </div>

      <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
        Danh sách sim chủ.
      </Text>

      {/* Filters */}
      <Card style={{ marginBottom: 12 }}>
        <Space wrap size="medium">
          {filterToolbox}
          {filterBar}
        </Space>
      </Card>

      <Card>
        <Table
          title={() => (
            <Title level={5}>{`Tổng: ${total ?? 0} thuê bao`}</Title>
          )}
          dataSource={displayMembers}
          columns={columns}
          scroll={{ x: "max-content" }}
          rowKey="id"
          onChange={handleTableChange}
          size="small"
          pagination={{ ...pagination, total }}
          loading={isLoading}
        />
      </Card>

      <SimMasterMembersModal
        simId={modalSimId}
        onClose={() => setModalSimId(null)}
      />

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
