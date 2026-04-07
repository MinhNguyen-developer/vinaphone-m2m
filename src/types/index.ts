// ===== STATUS =====
export const SimStatus = {
  NEW: 'Mới',
  ACTIVE: 'Đã hoạt động',
  CONFIRMED: 'Đã xác nhận',
} as const;
export type SimStatus = (typeof SimStatus)[keyof typeof SimStatus];

// ===== INTERFACES =====

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
  productCode: string;      // Mã sản phẩm: vina1200, vina1201...
  groupIds: string[];       // Thuộc nhiều nhóm
  status: SimStatus;
  usedMB: number;           // Dung lượng đã dùng (MB)
  firstUsedAt?: string;     // Thời điểm phát sinh dung lượng đầu tiên (editable)
  confirmedAt?: string;
  createdAt: string;
  usageHistory: UsageHistory[];
  alerts: AlertConfig[];
  note?: string;
}

export interface MasterSim {
  id: string;
  code: string;            // m2m3, m2m4, m2m7...
  phoneNumber: string;
  packageName: string;
  packageCapacityMB: number; // Dung lượng gói chủ (không phải dung lượng sử dụng)
  description?: string;
}

export interface SimStore {
  sims: SimCard[];
  groups: ProductGroup[];
  masterSims: MasterSim[];
  alerts: AlertConfig[];
}
