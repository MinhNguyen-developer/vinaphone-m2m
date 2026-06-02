// ===== DASHBOARD =====
export interface DashboardOverview {
  totalSims: number;
  newSims: number;
  needConfirmationSims: number;
  confirmedSims: number;
  simsWithAlert: number;
}

export interface SimGroupByRatingPlan {
  ratingPlanId: number | null;
  ratingPlanName: string | null;
  _count: { _all: number };
  _sum: { usedMB: number | null };
}

// ===== STATUS =====
export const SimStatus = {
  NEW: 1,
  ACTIVE: 2,
  CONFIRMED: 3,
  CANCELLED: 4,
  SUSPENDED: 5,
  PENDING_CANCEL: 6,
} as const;
export type SimStatus = (typeof SimStatus)[keyof typeof SimStatus];

// ===== CORE INTERFACES =====

export interface ProductGroup {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface UsageHistory {
  month: string; // format: 'YYYY-MM'
  usedMB: number;
}

export interface AlertConfig {
  id: string;
  simId?: string; // if set on a single SIM
  groupId?: string; // if set on a group
  productCode?: string; // if set on a product code
  ratingPlanId?: number; // if set on a rating plan
  simCodeLabel?: string | null; // if set on a sim code
  thresholdMB: number;
  label: string;
  /** 1 = Mới (active), 2 = Đã kiểm tra */
  status: number;
}

export interface QueryAlertParams {
  label?: string;
  /** 1 = Mới, 2 = Đã kiểm tra */
  status?: number;
  page?: number;
  pageSize?: number;
}

export interface QueryTriggeredParams {
  groupId?: string;
  simCodeLabel?: string;
  sort?: string;
}

export interface BulkCheckResult {
  phoneNumber: string;
  usedMB: number;
  alertLabel: string;
  thresholdMB: number;
  groupNames: string[];
}

export interface BulkCheckResponse {
  checked: number;
  notFound: number;
  notFoundPhones: string[];
  results: BulkCheckResult[];
}

export interface BulkCheckStatusResponse {
  checked: number;
  requested: number;
}

export interface MonthlyDataUsage {
  id: string;
  month: string;
  msisdn: string;
  smsNoiMangUsed: number | null;
  smsNgoaiMangUsed: number | null;
  dataUsedMB: number | null;
  smsQuocTeUsed: number | null;
  totalData: number | null;
  totalSmsNoiMang: number | null;
  totalSmsNgoaiMang: number | null;
  totalSmsQuocTe: number | null;
}

export interface SimGroup {
  simId: string;
  groupId: string;
  group?: Group;
  sim?: SimCard;
}
export interface Group {
  // Nhóm thiết bị
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
}
export interface SimBasic {
  id: string;
  phoneNumber: string;
  ratingPlanName: string | null;
  productCode: string;
  status: SimStatus;
  usedMB: number;
  firstUsedAt: string | null;
}

export interface SimCard {
  id: string;
  phoneNumber: string;
  imsi?: string;
  iccid?: string | null;
  contractCode?: string;
  contractDate?: string | null;
  activatedDate?: string | null;
  contractInfo?: string | null;
  systemStatus?: string;
  connectionStatus?: string | null;
  masterSimCode?: string;
  productCode: string;
  /** ratingPlanName from Vinaphone */
  ratingPlanName?: string;
  ratingPlanId?: number | null;
  groupIds: string[] | undefined;
  /** groupName from Vinaphone */
  groupName?: string | null;
  status: SimStatus;
  /** Numeric status from Vinaphone: 1=Mới,2=Đang hoạt động,3=Tạm khoá,4=Huỷ */
  vinaphoneStatus?: number;
  usedMB: number;
  customerName?: string;
  customerCode?: string;
  apnName?: string | null;
  apnId?: number | null;
  ip?: string | null;
  provinceCode?: string | null;
  imei?: string | null;
  simType?: number;
  serviceType?: number | null;
  firstUsedAt?: string;
  vinaphoneActivatedAt?: string;
  confirmedAt?: string;
  createdAt: string;
  note?: string;
  // ── SOG (nhóm gói cước Vinaphone) ─────────────────────────────────
  /** ID nhóm từ trường sog */
  sogGroupId?: string | null;
  /** Tên gói cước của nhóm */
  sogGroupName?: string | null;
  /** Mã gói (ma_goi) */
  sogMaGoi?: string | null;
  /** true = chủ nhóm, false = thành viên, null/undefined = không có sog */
  sogIsOwner?: boolean | null;
  usageHistory?: UsageHistory[];
  alerts?: AlertConfig[];
  monthlyDataUsages?: MonthlyDataUsage[];
  simGroups?: Partial<SimGroup>[];
  simCode?: { id: string; code: string } | null;
  simCodeLabel?: string | null;
}

export interface SimGroupMember {
  id: string;
  groupId: string;
  msisdn: string;
  ratingPlanName?: string | null;
  status?: number | null;
  syncedAt?: string | null;
}

export interface MasterSim {
  id: string;
  groupId: string;
  msisdn: string;
  ratingPlanName?: string | null;
  status?: number | null;
  syncedAt?: string | null;
}

// ===== API REQUEST / RESPONSE TYPES =====

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SimListParams {
  page?: number;
  pageSize?: number;
  // quickSearch fields (synced with URL)
  msisdn?: string;
  imsi?: string;
  ratingPlanId?: number;
  ratingPlanType?: string;
  contractCode?: string;
  contractor?: string;
  status?: number;
  simGroupId?: number;
  customer?: string;
  dateFrom?: string;
  dateTo?: string;
  apnId?: number;
  simType?: number;
  provinceCode?: string;
  sort?: string;
  // legacy / local-only
  productCode?: string;
  masterSimCode?: string;
  search?: string;
  systemStatus?: string;
  groupId?: string | string[];
}

export interface QueryPaginatedparams {
  page?: number;
  pageSize?: number;
}

export interface QueryGroupMembersParams extends QueryPaginatedparams {
  msisdn?: string;
  sort?: string;
}

export interface QueryGroupDevicesParams extends QueryPaginatedparams {
  search?: string;
  sort?: string;
}

export interface QueryMasterSimParams extends QueryPaginatedparams {
  search?: string;
  msisdn?: string;
  imsi?: string;
  contractCode?: string;
  ratingPlanId?: number;
  sort?: string;
  groupId?: string;
}

export interface UsageHistoryParams {
  fromMonth?: string;
  toMonth?: string;
}

export interface SimUsageHistoryResponse {
  phoneNumber: string;
  imsi?: string;
  history: MonthlyDataUsage[];
}

export type MasterSimWithRemaining = MasterSim;

export interface GroupWithCount extends ProductGroup {
  simCount: number;
  totalUsedMB: number;
}

export interface TriggeredAlert {
  sim: SimCard;
  alert: AlertConfig;
  checked: boolean;
}

export interface TriggeredAlertsResponse {
  data: TriggeredAlert[];
  total: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  expires_in: string;
}

/** @deprecated - kept for internal store types only */
export interface SimStore {
  sims: SimCard[];
  groups: ProductGroup[];
  masterSims: MasterSim[];
  alerts: AlertConfig[];
}

export interface RatingPlanListParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface RatingPlan {
  id: string;
  ratingPlanId: number;
  code: string;
  name: string;
}

export interface GroupSimListParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface GroupSim {
  id: string;
  groupId: number;
  name: string;
  groupKey: string;
}
