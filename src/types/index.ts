// ===== STATUS =====
export const SimStatus = {
  NEW: "Mới",
  ACTIVE: "Đã hoạt động",
  CONFIRMED: "Đã xác nhận",
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
  thresholdMB: number;
  label: string;
  active: boolean;
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
  code: string; // m2m3, m2m4, m2m7...
  phoneNumber: string;
  packageName: string;
  packageCapacityMB: number; // Tổng dung lượng gói (MB)
  usedMB: number; // Dung lượng đã sử dụng tổng cộng bởi các SIM thành viên (MB)
  description?: string;
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
}

export interface QueryGroupMembersParams {
  page?: number;
  pageSize?: number;
  msisdn?: string;
}

export interface UsageHistoryParams {
  fromMonth?: string;
  toMonth?: string;
}

export interface SimUsageHistoryResponse {
  phoneNumber: string;
  imsi?: string;
  history: UsageHistory[];
}

export interface MasterSimWithRemaining extends MasterSim {
  remainingMB: number;
}

export interface GroupWithCount extends ProductGroup {
  simCount: number;
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
