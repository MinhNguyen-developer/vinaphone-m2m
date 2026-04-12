// ===== STATUS =====
export const SimStatus = {
  NEW: 'Mới',
  ACTIVE: 'Đã hoạt động',
  CONFIRMED: 'Đã xác nhận',
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
  simId?: string;       // if set on a single SIM
  groupId?: string;     // if set on a group
  productCode?: string; // if set on a product code
  thresholdMB: number;
  label: string;
  active: boolean;
}

export interface SimCard {
  id: string;
  phoneNumber: string;      // Số điện thoại SIM
  imsi?: string;            // Số IMSI (15 chữ số, định danh duy nhất trên mạng)
  contractCode?: string;    // Mã hợp đồng với khách hàng
  systemStatus?: string;    // Trạng thái từ hệ thống Vinaphone (# trạng thái quản lý nội bộ)
  masterSimCode?: string;   // Mã SIM chủ quản lý SIM thành viên này (vd: m2m3, m2m4)
  productCode: string;      // Mã sản phẩm: vina1200, vina1201...
  groupIds: string[];       // Thuộc nhiều nhóm
  status: SimStatus;
  usedMB: number;           // Dung lượng đã dùng (MB)
  firstUsedAt?: string;     // Thời điểm phát sinh dung lượng đầu tiên (editable)
  confirmedAt?: string;
  createdAt: string;
  /** Only present when fetched individually via /sims/:phone/usage-history */
  usageHistory?: UsageHistory[];
  /** Only present when fetched individually – use /alerts for the full list */
  alerts?: AlertConfig[];
  note?: string;
}

export interface MasterSim {
  id: string;
  code: string;              // m2m3, m2m4, m2m7...
  phoneNumber: string;
  packageName: string;
  packageCapacityMB: number; // Tổng dung lượng gói (MB)
  usedMB: number;            // Dung lượng đã sử dụng tổng cộng bởi các SIM thành viên (MB)
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
  productCode?: string;
  masterSimCode?: string;
  systemStatus?: string;
  status?: string;
  search?: string;
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
