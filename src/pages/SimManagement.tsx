import React, { useEffect, useMemo, useState } from "react";
import {
  Table,
  Select,
  Tag,
  Space,
  Typography,
  Card,
  Button,
  Tooltip,
  message,
  DatePicker,
  Badge,
  Modal,
  Checkbox,
  Divider,
  Input,
  Upload,
  Alert,
  Flex,
} from "antd";
import {
  SearchOutlined,
  DownloadOutlined,
  ExportOutlined,
  TeamOutlined,
  StopOutlined,
  UploadOutlined,
  ReloadOutlined,
  LockOutlined,
  ClockCircleOutlined,
  EditOutlined,
} from "@ant-design/icons";
import type {
  ColumnsType,
  TablePaginationConfig,
  TableRowSelection,
  SorterResult,
} from "antd/es/table/interface";

import dayjs from "dayjs";
import * as XLSX from "xlsx";
import type { SimCard, SimGroup } from "../types";
import {
  useSims,
  useUpdateManySimStatus,
  useUpdateSimStatus,
  useBulkCancelSims,
  useBulkResetSims,
  useBulkLockSims,
  useBulkPendingCancelSims,
  useUpdateSimNote,
  usePatchSim,
} from "../hooks/useSims";
import { simsApi } from "../api/sims.api";
import { simCodesApi } from "../api/simCodes.api";
import { useAlerts, useTriggeredAlerts } from "../hooks/useAlerts";
import { formatMB, getUsageColor } from "../utils";
import SimMasterMembersModal from "../components/SIM/SimMasterMembersModal";
import { TableActions } from "../components/TableActions";
import SimGroupMembersModal from "../components/SIM/SimGroupMembersModal";
import { useRatingPlans } from "../hooks/useRatingPlans";
import { useColumns } from "../hooks/useColumns";
import { type FilterField, useFilters } from "../hooks/useFilters";
import { useGroupSims } from "../hooks/useGroupSims";
import { DebouncedInput } from "../components/DebouncedInput";
import { CustomTableFilter } from "../components/CustomTableFilter";
import { SyncPanel } from "../components/SyncPanel";
import { VIN_STATUS_OPTIONS } from "../utils/constants";
import { ServerSelect } from "../components/ServerSelect";
import { queryKeys } from "../hooks/queryKeys";
import { groupsApi } from "../api/groups.api";
import { ratingPlansApi } from "../api/rating-plans.api";
import usePagination from "../hooks/usePagination";

import type { RcFile } from "antd/es/upload";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// ─── Column keys ────────────────────────────────────────────────────────────

const ALL_COLUMN_KEYS = [
  "phone",
  "imsi",
  "groupName",
  "contract",
  "ratingPlan",
  "sogMembership",
  "sogMembers",
  "usedMB",
  "activated",
  "note",
  "simCode",
  "status",
  "simGroups",
  "action",
  "vinaphoneActivatedAt",
] as const;
type ColumnKey = (typeof ALL_COLUMN_KEYS)[number];

const COLUMN_LABELS: Record<ColumnKey, string> = {
  phone: "Số điện thoại",
  imsi: "IMSI",
  groupName: "Nhóm thuê bao",
  contract: "Mã hợp đồng",
  ratingPlan: "Gói cước",
  sogMembership: "Loại gói cước",
  sogMembers: "Thuê bao thành viên",
  usedMB: "Dung lượng",
  activated: "Ngày kích hoạt",
  vinaphoneActivatedAt: "Ngày kích hoạt (Vinaphone)",
  note: "Ghi chú",
  simCode: "Mã SIM",
  status: "Trạng thái",
  simGroups: "Nhóm thiết bị",
  action: "Hành động",
};

const DEFAULT_VISIBLE: ColumnKey[] = [
  "phone",
  "imsi",
  "activated",
  "simGroups",
  "simCode",
  "note",
  "status",
  "usedMB",
  "action",
];

const STORAGE_KEY = "sim-column-visibility";

// ─── Filter keys ──────────────────────────────────────────────────────────

const ALL_FILTER_KEYS = [
  "search",
  "imsi",
  "contractCode",
  "ratingPlanId",
  "status",
  "simType",
  "dateRange",
  "groupName",
  "sort",
  "sogIsOwner",
  "groupId",
  "simCode",
] as const;
type FilterKey = (typeof ALL_FILTER_KEYS)[number];

// Filter keys shown in the toolbox checkbox list (sort is internal, not user-visible)
const VISIBLE_FILTER_KEYS = ALL_FILTER_KEYS.filter(
  (k) => k !== "sort",
) as FilterKey[];

// ─── Export ───────────────────────────────────────────────────────────────

interface ExportColumn {
  key: string;
  label: string;
  getValue: (s: SimCard) => string | number;
}

const ALL_EXPORT_COLUMNS: ExportColumn[] = ALL_COLUMN_KEYS.map((key) => {
  const label = COLUMN_LABELS[key];
  const getValue = (s: SimCard): string | number => {
    switch (key) {
      case "phone":
        return s.phoneNumber;
      case "imsi":
        return s.imsi ?? "";
      case "groupName":
        return s.groupName ?? "";
      case "contract":
        return s.contractCode ?? "";
      case "ratingPlan":
        return s.ratingPlanName ?? s.productCode;
      case "sogMembership":
        if (s.sogIsOwner == null) return "";
        return s.sogIsOwner ? "Chủ nhóm" : "Thành viên";
      case "sogMembers":
        return s.sogGroupId && s.sogIsOwner
          ? (s.sogGroupName ?? s.sogGroupId)
          : "";
      case "usedMB":
        return s.usedMB;
      case "activated":
        return s.activatedDate ?? s.firstUsedAt ?? "";
      case "note":
        return s.note ?? "";
      case "status":
        return (
          VIN_STATUS_OPTIONS.find((o) => o.value === s.status)?.label ??
          s.status
        );
      case "simGroups":
        return (s.simGroups ?? [])
          .map((g) => g.group?.name)
          .filter(Boolean)
          .join(", ");
      case "vinaphoneActivatedAt":
        return s.vinaphoneActivatedAt ?? "";
      case "simCode":
        return s.simCodeLabel ?? "";
      case "action":
        return "";
    }
  };
  return { key, label, getValue };
});

const DEFAULT_EXPORT_KEYS: ColumnKey[] = [
  "phone",
  "imsi",
  "contract",
  "ratingPlan",
  "status",
  "usedMB",
];

interface ExportModalProps {
  open: boolean;
  data: SimCard[];
  onClose: () => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ open, data, onClose }) => {
  const [selected, setSelected] = useState<ColumnKey[]>(DEFAULT_EXPORT_KEYS);

  const allKeys = ALL_EXPORT_COLUMNS.map((c) => c.key as ColumnKey);
  const allChecked = selected.length === allKeys.length;
  const indeterminate = selected.length > 0 && !allChecked;

  const handleExport = () => {
    if (selected.length === 0) {
      message.warning("Vui lòng chọn ít nhất 1 cột!");
      return;
    }
    const cols = ALL_EXPORT_COLUMNS.filter((c) =>
      selected.includes(c.key as ColumnKey),
    );
    const rows = data.map((s) =>
      Object.fromEntries(cols.map((c) => [c.label, c.getValue(s)])),
    );
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SIM");
    const filename = `sim-m2m-${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
    message.success(`Đã xuất ${data.length} SIM → ${filename}`);
    onClose();
  };

  return (
    <Modal
      title={`Xuất Excel — ${data.length} SIM`}
      open={open}
      onOk={handleExport}
      onCancel={onClose}
      okText="Xuất"
      cancelText="Huỷ"
      width={480}
    >
      <Divider plain style={{ marginTop: 0 }}>
        Chọn cột xuất
      </Divider>
      <Checkbox
        indeterminate={indeterminate}
        checked={allChecked}
        onChange={(e) => setSelected(e.target.checked ? allKeys : [])}
        style={{ marginBottom: 8, fontWeight: 600 }}
      >
        Chọn tất cả
      </Checkbox>
      <Checkbox.Group
        value={selected}
        onChange={(vals) => setSelected(vals as ColumnKey[])}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "6px 0",
        }}
        options={ALL_EXPORT_COLUMNS.map((c) => ({
          label: c.label,
          value: c.key,
        }))}
      />
    </Modal>
  );
};

// ─── Bulk Reset Modal ─────────────────────────────────────────────────────

interface BulkResetModalProps {
  open: boolean;
  onClose: () => void;
}

const BulkResetModal: React.FC<BulkResetModalProps> = ({ open, onClose }) => {
  const [textValue, setTextValue] = useState("");
  const [parsed, setParsed] = useState<string[]>([]);
  const { mutate: bulkReset, isPending } = useBulkResetSims();

  const parsePhoneNumbers = (raw: string): string[] =>
    raw
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

  const handleTextChange = (val: string) => {
    setTextValue(val);
    setParsed(parsePhoneNumbers(val));
  };

  const handleCsvUpload = (file: RcFile): boolean => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) ?? "";
      const numbers = parsePhoneNumbers(text);
      setTextValue(numbers.join("\n"));
      setParsed(numbers);
    };
    reader.readAsText(file);
    return false;
  };

  const handleConfirm = () => {
    if (parsed.length === 0) {
      message.warning("Vui lòng nhập ít nhất 1 số điện thoại!");
      return;
    }
    bulkReset(parsed, {
      onSuccess: (result) => {
        if (result.reset > 0) {
          message.success(
            `Đã reset ${result.reset}/${result.requested} SIM thành công`,
          );
        }
        if (result.notFound > 0) {
          message.warning(
            `${result.notFound} số điện thoại không tìm thấy trong hệ thống`,
            6,
          );
        }
        setTextValue("");
        setParsed([]);
        if (result.notFound === 0) onClose();
      },
      onError: () => message.error("Reset SIM thất bại!"),
    });
  };

  const handleClose = () => {
    setTextValue("");
    setParsed([]);
    onClose();
  };

  return (
    <Modal
      title="Reset SIM hàng loạt"
      open={open}
      onOk={handleConfirm}
      onCancel={handleClose}
      okText="Xác nhận reset"
      okButtonProps={{ danger: true, loading: isPending }}
      cancelText="Đóng"
      width={520}
    >
      <Space orientation="vertical" style={{ width: "100%" }} size={12}>
        <Alert
          type="warning"
          showIcon
          message="SIM bị reset sẽ chuyển về trạng thái Mới và toàn bộ lịch sử dữ liệu sẽ bị xóa."
        />
        <div>
          <Text strong>Tải lên file CSV</Text>
          <Upload.Dragger
            accept=".csv,.txt"
            beforeUpload={handleCsvUpload}
            showUploadList={false}
            style={{ marginTop: 6 }}
          >
            <p className="ant-upload-drag-icon">
              <UploadOutlined />
            </p>
            <p className="ant-upload-text">
              Kéo thả file vào đây hoặc click để chọn
            </p>
            <p className="ant-upload-hint">
              File CSV 1 cột, không có tiêu đề, mỗi dòng 1 số điện thoại
            </p>
          </Upload.Dragger>
        </div>
        <Divider plain style={{ margin: "4px 0" }}>
          hoặc nhập tay
        </Divider>
        <div>
          <Text strong>Danh sách số điện thoại</Text>
          <Input.TextArea
            rows={4}
            placeholder={"0987654321\n0912345678\n..."}
            value={textValue}
            onChange={(e) => handleTextChange(e.target.value)}
            style={{ marginTop: 6, fontFamily: "monospace", fontSize: 13 }}
          />
          {parsed.length > 0 && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Đã nhận {parsed.length} số điện thoại
            </Text>
          )}
        </div>
      </Space>
    </Modal>
  );
};

// ─── Bulk Cancel Modal ────────────────────────────────────────────────────

interface BulkCancelModalProps {
  open: boolean;
  onClose: () => void;
}

const BulkCancelModal: React.FC<BulkCancelModalProps> = ({ open, onClose }) => {
  const [textValue, setTextValue] = useState("");
  const [parsed, setParsed] = useState<string[]>([]);
  const { mutate: bulkCancel, isPending } = useBulkCancelSims();

  const parsePhoneNumbers = (raw: string): string[] =>
    raw
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

  const handleTextChange = (val: string) => {
    setTextValue(val);
    setParsed(parsePhoneNumbers(val));
  };

  const handleCsvUpload = (file: RcFile): boolean => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) ?? "";
      const numbers = parsePhoneNumbers(text);
      setTextValue(numbers.join("\n"));
      setParsed(numbers);
    };
    reader.readAsText(file);
    return false; // prevent auto-upload
  };

  const handleConfirm = () => {
    if (parsed.length === 0) {
      message.warning("Vui lòng nhập ít nhất 1 số điện thoại!");
      return;
    }
    bulkCancel(parsed, {
      onSuccess: (result) => {
        if (result.cancelled > 0) {
          message.success(
            `Đã hủy ${result.cancelled}/${result.requested} SIM thành công`,
          );
        }
        if (result.notFound > 0) {
          message.warning(
            `${result.notFound} số điện thoại không tìm thấy trong hệ thống`,
            6,
          );
        }
        setTextValue("");
        setParsed([]);
        if (result.notFound === 0) onClose();
      },
      onError: () => message.error("Hủy SIM thất bại!"),
    });
  };

  const handleClose = () => {
    setTextValue("");
    setParsed([]);
    onClose();
  };

  return (
    <Modal
      title="Hủy SIM hàng loạt"
      open={open}
      onOk={handleConfirm}
      onCancel={handleClose}
      okText="Xác nhận hủy"
      okButtonProps={{ danger: true, loading: isPending }}
      cancelText="Đóng"
      width={520}
    >
      <Space orientation="vertical" style={{ width: "100%" }} size={12}>
        <Alert
          type="warning"
          showIcon
          title="SIM bị hủy sẽ chuyển sang trạng thái Đã hủy."
        />
        <div>
          <Text strong>Tải lên file CSV</Text>
          <Upload.Dragger
            accept=".csv,.txt"
            beforeUpload={handleCsvUpload}
            showUploadList={false}
            style={{ marginTop: 6 }}
          >
            <p className="ant-upload-drag-icon">
              <UploadOutlined />
            </p>
            <p className="ant-upload-text">
              Kéo thả file vào đây hoặc click để chọn
            </p>
            <p className="ant-upload-hint">
              File CSV 1 cột, không có tiêu đề, mỗi dòng 1 số điện thoại
            </p>
          </Upload.Dragger>
        </div>
        <Divider plain style={{ margin: "4px 0" }}>
          hoặc nhập tay
        </Divider>
        <div>
          <Text strong>Danh sách số điện thoại</Text>
          <Input.TextArea
            rows={4}
            placeholder={"0987654321\n0912345678\n..."}
            value={textValue}
            onChange={(e) => handleTextChange(e.target.value)}
            style={{ marginTop: 6, fontFamily: "monospace", fontSize: 13 }}
          />
          {parsed.length > 0 && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Đã nhận {parsed.length} số điện thoại
            </Text>
          )}
        </div>
      </Space>
    </Modal>
  );
};

// ─── Bulk Lock Modal ─────────────────────────────────────────────────────

const BulkLockModal: React.FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const [textValue, setTextValue] = useState("");
  const [parsed, setParsed] = useState<string[]>([]);
  const { mutate: bulkLock, isPending } = useBulkLockSims();

  const parsePhoneNumbers = (raw: string): string[] =>
    raw
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

  const handleTextChange = (val: string) => {
    setTextValue(val);
    setParsed(parsePhoneNumbers(val));
  };

  const handleCsvUpload = (file: RcFile): boolean => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) ?? "";
      const numbers = parsePhoneNumbers(text);
      setTextValue(numbers.join("\n"));
      setParsed(numbers);
    };
    reader.readAsText(file);
    return false;
  };

  const handleConfirm = () => {
    if (parsed.length === 0) {
      message.warning("Vui lòng nhập ít nhất 1 số điện thoại!");
      return;
    }
    bulkLock(parsed, {
      onSuccess: (result) => {
        if (result.locked > 0) {
          message.success(
            `Đã tạm khoá ${result.locked}/${result.requested} SIM thành công`,
          );
        }
        if (result.notFound > 0) {
          message.warning(
            `${result.notFound} số điện thoại không tìm thấy trong hệ thống`,
            6,
          );
        }
        setTextValue("");
        setParsed([]);
        if (result.notFound === 0) onClose();
      },
      onError: () => message.error("Tạm khoá SIM thất bại!"),
    });
  };

  const handleClose = () => {
    setTextValue("");
    setParsed([]);
    onClose();
  };

  return (
    <Modal
      title="Tạm khoá SIM hàng loạt"
      open={open}
      onOk={handleConfirm}
      onCancel={handleClose}
      okText="Xác nhận tạm khoá"
      okButtonProps={{ loading: isPending }}
      cancelText="Đóng"
      width={520}
    >
      <Space orientation="vertical" style={{ width: "100%" }} size={12}>
        <Alert
          type="warning"
          showIcon
          message="SIM bị tạm khoá sẽ chuyển sang trạng thái Tạm khoá."
        />
        <div>
          <Text strong>Tải lên file CSV</Text>
          <Upload.Dragger
            accept=".csv,.txt"
            beforeUpload={handleCsvUpload}
            showUploadList={false}
            style={{ marginTop: 6 }}
          >
            <p className="ant-upload-drag-icon">
              <UploadOutlined />
            </p>
            <p className="ant-upload-text">
              Kéo thả file vào đây hoặc click để chọn
            </p>
            <p className="ant-upload-hint">
              File CSV 1 cột, không có tiêu đề, mỗi dòng 1 số điện thoại
            </p>
          </Upload.Dragger>
        </div>
        <Divider plain style={{ margin: "4px 0" }}>
          hoặc nhập tay
        </Divider>
        <div>
          <Text strong>Danh sách số điện thoại</Text>
          <Input.TextArea
            rows={4}
            placeholder={"0987654321\n0912345678\n..."}
            value={textValue}
            onChange={(e) => handleTextChange(e.target.value)}
            style={{ marginTop: 6, fontFamily: "monospace", fontSize: 13 }}
          />
          {parsed.length > 0 && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Đã nhận {parsed.length} số điện thoại
            </Text>
          )}
        </div>
      </Space>
    </Modal>
  );
};

// ─── Bulk Pending Cancel Modal ────────────────────────────────────────────

const BulkPendingCancelModal: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  const [textValue, setTextValue] = useState("");
  const [parsed, setParsed] = useState<string[]>([]);
  const { mutate: bulkPendingCancel, isPending } = useBulkPendingCancelSims();

  const parsePhoneNumbers = (raw: string): string[] =>
    raw
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

  const handleTextChange = (val: string) => {
    setTextValue(val);
    setParsed(parsePhoneNumbers(val));
  };

  const handleCsvUpload = (file: RcFile): boolean => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) ?? "";
      const numbers = parsePhoneNumbers(text);
      setTextValue(numbers.join("\n"));
      setParsed(numbers);
    };
    reader.readAsText(file);
    return false;
  };

  const handleConfirm = () => {
    if (parsed.length === 0) {
      message.warning("Vui lòng nhập ít nhất 1 số điện thoại!");
      return;
    }
    bulkPendingCancel(parsed, {
      onSuccess: (result) => {
        if (result.pendingCancelled > 0) {
          message.success(
            `Đã chuyển ${result.pendingCancelled}/${result.requested} SIM sang Chờ huỷ`,
          );
        }
        if (result.notFound > 0) {
          message.warning(
            `${result.notFound} số điện thoại không tìm thấy trong hệ thống`,
            6,
          );
        }
        setTextValue("");
        setParsed([]);
        if (result.notFound === 0) onClose();
      },
      onError: () => message.error("Chuyển trạng thái thất bại!"),
    });
  };

  const handleClose = () => {
    setTextValue("");
    setParsed([]);
    onClose();
  };

  return (
    <Modal
      title="Chờ huỷ SIM hàng loạt"
      open={open}
      onOk={handleConfirm}
      onCancel={handleClose}
      okText="Xác nhận chờ huỷ"
      okButtonProps={{ loading: isPending }}
      cancelText="Đóng"
      width={520}
    >
      <Space orientation="vertical" style={{ width: "100%" }} size={12}>
        <Alert
          type="warning"
          showIcon
          message="SIM sẽ chuyển sang trạng thái Chờ huỷ."
        />
        <div>
          <Text strong>Tải lên file CSV</Text>
          <Upload.Dragger
            accept=".csv,.txt"
            beforeUpload={handleCsvUpload}
            showUploadList={false}
            style={{ marginTop: 6 }}
          >
            <p className="ant-upload-drag-icon">
              <UploadOutlined />
            </p>
            <p className="ant-upload-text">
              Kéo thả file vào đây hoặc click để chọn
            </p>
            <p className="ant-upload-hint">
              File CSV 1 cột, không có tiêu đề, mỗi dòng 1 số điện thoại
            </p>
          </Upload.Dragger>
        </div>
        <Divider plain style={{ margin: "4px 0" }}>
          hoặc nhập tay
        </Divider>
        <div>
          <Text strong>Danh sách số điện thoại</Text>
          <Input.TextArea
            rows={4}
            placeholder={"0987654321\n0912345678\n..."}
            value={textValue}
            onChange={(e) => handleTextChange(e.target.value)}
            style={{ marginTop: 6, fontFamily: "monospace", fontSize: 13 }}
          />
          {parsed.length > 0 && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Đã nhận {parsed.length} số điện thoại
            </Text>
          )}
        </div>
      </Space>
    </Modal>
  );
};

// ─── Component ────────────────────────────────────────────────────────────

const SimManagement: React.FC = () => {
  const [pagination, setPagination] = usePagination({
    pageSize: 10,
    current: 1,
  });

  const handleTableChange = (
    newPagination: TablePaginationConfig,
    _filters: Record<string, unknown>,
    sorter: SorterResult<SimCard> | SorterResult<SimCard>[],
  ) => {
    setPagination(newPagination);
    // Build sort string: "field:asc" | "field:desc" | undefined
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    const sortValue =
      s.columnKey && s.order
        ? `${String(s.columnKey)}:${s.order === "ascend" ? "asc" : "desc"}`
        : undefined;
    setFilterValue("sort", sortValue ?? "");
  };

  // ── Rating plans (needed for filter dropdown options) ─────────────────
  const { data: ratingPlansData } = useRatingPlans({ page: 1, pageSize: 1000 });

  // --- Group sims (needed for filter dropdown options) ---──────────────
  const { data: groupSimsData } = useGroupSims({ page: 1, pageSize: 10 });

  // ── Filter fields (render closures capture reactive data like ratingPlansData)
  const filterFields = useMemo<FilterField<FilterKey, any>[]>(
    () => [
      {
        filterKey: "search",
        label: "Số điện thoại",
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
        filterKey: "simCode",
        label: "Mã SIM",
        colSpan: { xs: 24, sm: 12, md: 5, lg: 3 },
        render: (value, onChange) => (
          <ServerSelect
            queryKey={queryKeys.simCodes.list()}
            fetchFn={({ page, pageSize, search }) =>
              simCodesApi.getList({ page, pageSize, search })
            }
            placeholder="Mã SIM"
            getOptionLabel={(item) => item.code}
            getOptionValue={(item) => item.id}
            value={value}
            onChange={onChange}
            popupMatchSelectWidth={200}
            allowClear
            style={{
              width: "100%",
            }}
          />
        ),
      },
      {
        filterKey: "groupName",
        label: "Nhóm thuê bao",
        colSpan: { xs: 24, sm: 12, md: 5, lg: 3 },
        render: (value, onChange) => (
          <Select
            style={{ width: "100%" }}
            placeholder="Nhóm thuê bao"
            value={value as string}
            onChange={(e) => onChange(e)}
            allowClear
            options={
              groupSimsData?.data.map((group) => ({
                label: group.name,
                value: group.name,
              })) ?? []
            }
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
            popupMatchSelectWidth={200}
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
        filterKey: "status",
        label: "Trạng thái",
        colSpan: { xs: 24, sm: 12, md: 4, lg: 3 },
        render: (value, onChange) => (
          <Select
            style={{ width: "100%" }}
            value={Number.isNaN(+value) ? value : Number(value)}
            onChange={(v) => onChange(v)}
            placeholder="Trạng thái"
            allowClear
            options={VIN_STATUS_OPTIONS.map((o) => ({
              label: o.label,
              value: o.value,
            }))}
            popupMatchSelectWidth={160}
          />
        ),
        toUrlParams: (v) => ({ status: v != null ? String(v) : undefined }),
        fromUrlParams: (p) => p.get("status") ?? undefined,
      },
      {
        filterKey: "sogIsOwner",
        label: "Thuê bao thành viên",
        colSpan: { xs: 24, sm: 12, md: 4, lg: 3 },
        render: (value, onChange) => (
          <Select
            style={{ width: "100%" }}
            value={Number.isNaN(+value) ? value : Number(value)}
            onChange={(v) => onChange(v)}
            placeholder="Thuê bao thành viên"
            allowClear
            options={[
              {
                label: "Chủ nhóm",
                value: 1,
              },
              {
                label: "Thành viên",
                value: 0,
              },
            ]}
          />
        ),
        toUrlParams: (v) => ({ sogIsOwner: v != null ? String(v) : undefined }),
        fromUrlParams: (p) => p.get("sogIsOwner") ?? undefined,
      },
      {
        filterKey: "groupId",
        label: "Nhóm thiết bị",
        colSpan: { xs: 24, sm: 12, md: 4, lg: 3 },
        render: (value, onChange) => (
          <ServerSelect
            queryKey={queryKeys.groups.all}
            fetchFn={({ page, pageSize, search }) =>
              groupsApi.getList({ page, pageSize, search })
            }
            placeholder="Nhóm thiết bị"
            getOptionValue={(g) => g.id}
            getOptionLabel={(g) => g.name}
            mode="multiple"
            style={{
              minWidth: 160,
            }}
            value={value}
            onChange={(v) => onChange(v)}
          />
        ),
        toUrlParams: (v) => {
          const arr = v as string[] | undefined;
          if (!arr?.length) return { groupId: undefined };
          return { groupId: arr.join(",") };
        },
        fromUrlParams: (p) => {
          const raw = p.get("groupId");
          if (!raw) return undefined;
          return raw.split(",");
        },
      },
      {
        filterKey: "dateRange",
        label: "Ngày kích hoạt",
        defaultValue: [null, null] as [dayjs.Dayjs | null, dayjs.Dayjs | null],
        colSpan: { xs: 24, sm: 24, md: 10, lg: 8 },
        render: (value, onChange) => (
          <RangePicker
            style={{ width: "100%" }}
            value={value as [dayjs.Dayjs | null, dayjs.Dayjs | null]}
            onChange={(v) => onChange(v ? [v[0], v[1]] : [null, null])}
            placeholder={["Ngày kích hoạt từ", "Đến ngày"]}
            format="DD/MM/YYYY"
          />
        ),
        toUrlParams: (v) => {
          const dr = v as [dayjs.Dayjs | null, dayjs.Dayjs | null];
          return {
            activeDateFrom: dr[0]?.format("YYYY-MM-DD"),
            activeDateTo: dr[1]?.format("YYYY-MM-DD"),
          };
        },
        fromUrlParams: (p) =>
          [
            p.get("activeDateFrom") ? dayjs(p.get("activeDateFrom")!) : null,
            p.get("activeDateTo") ? dayjs(p.get("activeDateTo")!) : null,
          ] as [dayjs.Dayjs | null, dayjs.Dayjs | null],
      },
      // Hidden field — not shown in toolbox, only used for URL sync
      {
        filterKey: "sort",
        label: "Sắp xếp",
        hidden: true,
        render: () => null,
      },
    ],
    [ratingPlansData, groupSimsData],
  );

  // ── Filters hook (manages state + URL sync + field visibility) ─────────
  const { filterValues, filterBar, filterToolbox, setFilterValue } =
    useFilters<FilterKey>({
      fields: filterFields,
      storageKey: "sim-filters",
      defaultVisibleKeys: VISIBLE_FILTER_KEYS,
    });

  // ── Reset to page 1 when non-sort filters change ──────────────────────
  const nonSortFilterKey = JSON.stringify(
    Object.fromEntries(
      Object.entries(filterValues).filter(([k]) => k !== "sort"),
    ),
  );
  useEffect(() => {
    setPagination((prev) => ({ ...prev, current: 1 }));
  }, [nonSortFilterKey]);

  // ── Data fetching ─────────────────────────────────────────────────────
  const queryParams = useMemo(() => {
    const toNum = (v: unknown) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };
    const dr = filterValues.dateRange as [
      dayjs.Dayjs | null,
      dayjs.Dayjs | null,
    ];
    return {
      search: (filterValues.search as string) || undefined,
      imsi: (filterValues.imsi as string) || undefined,
      contractCode: (filterValues.contractCode as string) || undefined,
      status: toNum(filterValues.status),
      ratingPlanId: toNum(filterValues.ratingPlanId),
      simType: toNum(filterValues.simType),
      activeDateFrom: dr[0]?.format("YYYY-MM-DD"),
      activeDateTo: dr[1]?.format("YYYY-MM-DD"),
      pageSize: pagination.pageSize,
      page: pagination.current,
      groupName: (filterValues.groupName as string) || undefined,
      groupId: filterValues.groupId as string,
      sogIsOwner: toNum(filterValues.sogIsOwner),
      simCode: (filterValues.simCode as string) || undefined,
      sort: (filterValues.sort as string) || undefined,
    };
  }, [filterValues, pagination]);

  const {
    data: simsData,
    isLoading,
    isFetching,
    isRefetching,
  } = useSims(queryParams);
  const { data: alertsData } = useAlerts();
  const { data: triggeredData } = useTriggeredAlerts();

  const sims = simsData?.data ?? [];

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [modalSimId, setModalSimId] = useState<string | null>(null);
  const [groupModalId, setGroupModalId] = useState<string | null>(null);
  const [groupModalName, setGroupModalName] = useState<string | null>(null);

  const alertSimIds = useMemo(() => {
    const ids = new Set<string>();
    triggeredData?.data.forEach((t) => ids.add(t.sim.id));
    return ids;
  }, [triggeredData]);

  const { mutate } = useUpdateManySimStatus();
  const { mutate: updateSimStatus } = useUpdateSimStatus();
  const { mutate: cancelSim } = useBulkCancelSims();
  const { mutate: resetSim } = useBulkResetSims();
  const { mutate: lockSim } = useBulkLockSims();
  const { mutate: pendingCancelSim } = useBulkPendingCancelSims();
  const { mutate: updateNote } = useUpdateSimNote();
  const { mutate: patchSim } = usePatchSim();
  const [editingSimCodeId, setEditingSimCodeId] = useState<string | null>(null);

  const [bulkCancelOpen, setBulkCancelOpen] = useState(false);
  const [bulkResetOpen, setBulkResetOpen] = useState(false);
  const [bulkLockOpen, setBulkLockOpen] = useState(false);
  const [bulkPendingCancelOpen, setBulkPendingCancelOpen] = useState(false);

  // ── Column definitions ────────────────────────────────────────────────
  const allColumns: (ColumnsType<SimCard>[number] & { colKey: ColumnKey })[] = [
    {
      colKey: "phone",
      title: "Số điện thoại",
      dataIndex: "phoneNumber",
      key: "phoneNumber",
      fixed: "left",
      width: 145,
      sorter: true,
      sortOrder: (filterValues.sort as string)?.startsWith("phoneNumber:")
        ? (filterValues.sort as string).endsWith(":asc")
          ? "ascend"
          : "descend"
        : null,
      render: (v, record) => (
        <Space size={4}>
          {alertSimIds.has(record.id) && <Badge status="error" />}
          <Text
            strong
            copyable
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
      colKey: "imsi",
      title: "IMSI",
      dataIndex: "imsi",
      key: "imsi",
      width: 155,
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
      sorter: true,
      sortOrder: (filterValues.sort as string)?.startsWith("imsi:")
        ? (filterValues.sort as string).endsWith(":asc")
          ? "ascend"
          : "descend"
        : null,
    },
    {
      colKey: "simCode",
      title: "Mã SIM",
      key: "simCodeLabel",
      width: 160,
      render: (_v, record) => {
        if (editingSimCodeId === record.id) {
          return (
            <ServerSelect
              autoFocus
              style={{ width: "100%" }}
              value={record.simCode?.code ?? undefined}
              queryKey={["sim-codes", "select"]}
              fetchFn={async (params) => {
                const res = await simCodesApi.getList({
                  page: params.page,
                  pageSize: params.pageSize,
                  search: params.search,
                });
                return { data: res.data, total: res.total };
              }}
              getOptionValue={(item) => item.code}
              getOptionLabel={(item) => item.code}
              placeholder="Chọn mã SIM"
              allowClear
              onBlur={() => setEditingSimCodeId(null)}
              onChange={(val) => {
                patchSim(
                  { id: record.id, data: { simCodeLabel: val ?? null } },
                  {
                    onSuccess: () => setEditingSimCodeId(null),
                    onError: () => message.error("Cập nhật mã SIM thất bại!"),
                  },
                );
              }}
            />
          );
        }
        return (
          <span
            style={{
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
            onClick={() => setEditingSimCodeId(record.id)}
          >
            {record.simCode ? (
              <Tag color="orange">{record.simCode.code}</Tag>
            ) : (
              <Text type="secondary">—</Text>
            )}
            <EditOutlined style={{ fontSize: 11, color: "#999" }} />
          </span>
        );
      },
      sorter: true,
      sortOrder: (filterValues.sort as string)?.startsWith("simCodeLabel:")
        ? (filterValues.sort as string).endsWith(":asc")
          ? "ascend"
          : "descend"
        : null,
    },
    {
      colKey: "groupName",
      title: "Nhóm thuê bao",
      dataIndex: "groupName",
      key: "groupName",
      width: 180,
      render: (v) =>
        v ? <Tag color="purple">{v}</Tag> : <Text type="secondary">—</Text>,
      sorter: true,
      sortOrder: (filterValues.sort as string)?.startsWith("groupName:")
        ? (filterValues.sort as string).endsWith(":asc")
          ? "ascend"
          : "descend"
        : null,
    },
    {
      colKey: "simGroups",
      title: "Nhóm thiết bị",
      dataIndex: "simGroups",
      key: "simGroups",
      width: 180,
      sorter: true,
      sortOrder: (filterValues.sort as string)?.startsWith("simGroups:")
        ? (filterValues.sort as string).endsWith(":asc")
          ? "ascend"
          : "descend"
        : null,
      render: (v: SimGroup[] | undefined) =>
        v ? (
          <Space>
            {v.map((g) => (
              <Tag color="purple" key={g.group?.id}>
                {g.group?.name}
              </Tag>
            ))}
          </Space>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      colKey: "contract",
      title: "Mã hợp đồng",
      dataIndex: "contractCode",
      key: "contractCode",
      width: 160,
      render: (v) =>
        v ? <Tag color="geekblue">{v}</Tag> : <Text type="secondary">—</Text>,
      sorter: true,
      sortOrder: (filterValues.sort as string)?.startsWith("contractCode:")
        ? (filterValues.sort as string).endsWith(":asc")
          ? "ascend"
          : "descend"
        : null,
    },
    {
      colKey: "ratingPlan",
      title: "Gói cước",
      dataIndex: "ratingPlanName",
      key: "ratingPlanName",
      width: 190,
      render: (v, r) =>
        (v ?? r.productCode) ? (
          <Tag color="blue">{v ?? r.productCode}</Tag>
        ) : (
          <Text type="secondary">—</Text>
        ),
      sorter: true,
      sortOrder: (filterValues.sort as string)?.startsWith("ratingPlanName:")
        ? (filterValues.sort as string).endsWith(":asc")
          ? "ascend"
          : "descend"
        : null,
    },
    {
      colKey: "usedMB",
      title: "Dung lượng",
      dataIndex: "usedMB",
      key: "usedMB",
      width: 130,
      sorter: true,
      sortOrder: (filterValues.sort as string)?.startsWith("usedMB:")
        ? (filterValues.sort as string).endsWith(":asc")
          ? "ascend"
          : "descend"
        : null,
      render: (v, record) => {
        const relevantAlerts = (alertsData?.data || []).filter(
          (a) =>
            a.status === 1 &&
            (a.simId === record.id ||
              (a.groupId && (record.groupIds ?? []).includes(a.groupId)) ||
              (a.productCode && a.productCode === record.productCode)),
        );
        const maxThreshold = relevantAlerts.length
          ? Math.max(...relevantAlerts?.map((a) => a.thresholdMB))
          : 0;
        const pct =
          maxThreshold > 0
            ? Math.min(Math.round((v / maxThreshold) * 100), 100)
            : 0;
        return <Text style={{ color: getUsageColor(pct) }}>{formatMB(v)}</Text>;
      },
    },
    {
      colKey: "activated",
      title: "Ngày kích hoạt",
      dataIndex: "firstUsedAt",
      key: "firstUsedAt",
      width: 145,
      render: (v, r) => {
        const d = v ?? r.firstUsedAt;
        return d ? (
          dayjs(d).format("DD/MM/YYYY")
        ) : (
          <Text type="secondary">Chưa có</Text>
        );
      },
      sorter: true,
      sortOrder: (filterValues.sort as string)?.startsWith("firstUsedAt:")
        ? (filterValues.sort as string).endsWith(":asc")
          ? "ascend"
          : "descend"
        : null,
    },
    {
      colKey: "vinaphoneActivatedAt",
      title: "Ngày kích hoạt (Vinaphone)",
      dataIndex: "vinaphoneActivatedAt",
      key: "vinaphoneActivatedAt",
      width: 225,
      render: (v, r) => {
        const d = v ?? r.vinaphoneActivatedAt;
        return d ? (
          dayjs(d).format("DD/MM/YYYY")
        ) : (
          <Text type="secondary">Chưa có</Text>
        );
      },
      sorter: true,
      sortOrder: (filterValues.sort as string)?.startsWith(
        "vinaphoneActivatedAt:",
      )
        ? (filterValues.sort as string).endsWith(":asc")
          ? "ascend"
          : "descend"
        : null,
    },
    {
      colKey: "status",
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 145,
      render: (v) => {
        const s = VIN_STATUS_OPTIONS.find((o) => o.value === v);
        return s ? (
          <Tag color={s.color} icon={s.icon}>
            {s.label}
          </Tag>
        ) : (
          <Text>{v}</Text>
        );
      },
      sorter: true,
      sortOrder: (filterValues.sort as string)?.startsWith("status:")
        ? (filterValues.sort as string).endsWith(":asc")
          ? "ascend"
          : "descend"
        : null,
    },
    {
      colKey: "sogMembership",
      title: "Loại gói cước",
      key: "sogIsOwner",
      width: 140,
      render: (_v, record) => {
        if (record.sogIsOwner == null) return <Text type="secondary">—</Text>;
        return record.sogIsOwner ? (
          <Tag color="gold">Chủ nhóm</Tag>
        ) : (
          <Tag color="cyan">Thành viên</Tag>
        );
      },
    },
    {
      colKey: "sogMembers",
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
    {
      colKey: "note",
      title: "Ghi chú",
      dataIndex: "note",
      key: "note",
      width: 200,
      render: (v, record) => (
        <Text
          editable={{
            tooltip: "Nhấn để sửa",
            text: v ?? "",
            onChange: (next) => {
              const trimmed = next.trim() || null;
              if ((trimmed ?? "") !== (v ?? "")) {
                updateNote(
                  { id: record.id, note: trimmed },
                  { onError: () => message.error("Lưu ghi chú thất bại!") },
                );
              }
            },
          }}
        >
          {v || ""}
        </Text>
      ),
      sorter: true,
      sortOrder: (filterValues.sort as string)?.startsWith("note:")
        ? (filterValues.sort as string).endsWith(":asc")
          ? "ascend"
          : "descend"
        : null,
    },
    {
      colKey: "action",
      title: "Hành động",
      key: "action",
      fixed: "right",
      width: 60,
      render: (_v, record) => (
        <TableActions
          items={[
            {
              key: "confirm",
              label: "Xác nhận",
              onClick: () =>
                updateSimStatus(
                  { id: record.id, action: "confirm" },
                  { onError: () => message.error("Xác nhận thất bại!") },
                ),
            },
            {
              key: "lock",
              label: "Tạm khoá",
              icon: <LockOutlined />,
              onClick: () =>
                lockSim([record.phoneNumber], {
                  onSuccess: (r) => {
                    if (r.locked > 0)
                      message.success("Tạm khoá SIM thành công");
                    else message.warning("Không tìm thấy SIM");
                  },
                  onError: () => message.error("Tạm khoá SIM thất bại!"),
                }),
            },
            {
              key: "pending_cancel",
              label: "Chờ huỷ",
              icon: <ClockCircleOutlined />,
              onClick: () =>
                pendingCancelSim([record.phoneNumber], {
                  onSuccess: (r) => {
                    if (r.pendingCancelled > 0)
                      message.success("SIM chuyển sang Chờ huỷ thành công");
                    else message.warning("Không tìm thấy SIM");
                  },
                  onError: () => message.error("Chuyển trạng thái thất bại!"),
                }),
            },
            { key: "divider-1", type: "divider" },
            {
              key: "cancel",
              label: "Huỷ SIM",
              icon: <StopOutlined />,
              danger: true,
              disabled: record.status === 4,
              onClick: () =>
                cancelSim([record.phoneNumber], {
                  onError: () => message.error("Huỷ SIM thất bại!"),
                }),
            },
            {
              key: "reset",
              label: "Reset SIM",
              icon: <ReloadOutlined />,
              onClick: () =>
                resetSim([record.phoneNumber], {
                  onSuccess: (r) => {
                    if (r.reset > 0) message.success("Reset SIM thành công");
                    else message.warning("Không tìm thấy SIM");
                  },
                  onError: () => message.error("Reset SIM thất bại!"),
                }),
            },
          ]}
        />
      ),
    },
  ];

  const { tableColumns: columns, popover: columnPickerButton } = useColumns({
    allColumns,
    localStorageKey: STORAGE_KEY,
    allColumnsKeys: ALL_COLUMN_KEYS,
    columnLabels: COLUMN_LABELS,
    defaultVisibleKeys: DEFAULT_VISIBLE,
  });

  // ── Export ────────────────────────────────────────────────────────────
  const rowSelection: TableRowSelection<SimCard> = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
  };

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportData, setExportData] = useState<SimCard[]>([]);
  const [exportAllLoading, setExportAllLoading] = useState(false);

  const handleExport = (exportAll: boolean) => {
    if (!exportAll && selectedRowKeys.length === 0) {
      message.warning("Vui lòng tích chọn ít nhất 1 SIM!");
      return;
    }
    const data = exportAll
      ? sims
      : sims.filter((s) => selectedRowKeys.includes(s.id));
    setExportData(data);
    setExportModalOpen(true);
  };

  const handleExportAllDB = async () => {
    setExportAllLoading(true);
    try {
      const total = simsData?.total ?? 0;
      if (total === 0) {
        message.warning("Không có dữ liệu để xuất!");
        return;
      }
      const { data: all } = await simsApi.getList({
        ...queryParams,
        page: 1,
        pageSize: total,
      });
      setExportData(all);
      setExportModalOpen(true);
    } catch {
      message.error("Không thể tải dữ liệu!");
    } finally {
      setExportAllLoading(false);
    }
  };

  // ── Column picker popover ─────────────────────────────────────────────
  // (managed by useColumns hook — exposes `columnPickerButton`)

  return (
    <div>
      {/* Header */}
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
          📱 Danh sách SIM M2M
        </Title>
      </div>

      <SyncPanel />

      {/* Filters */}
      <Card style={{ marginBottom: 12 }}>
        <Space wrap size="medium">
          {filterToolbox}
          {filterBar}
        </Space>
      </Card>

      {/* Table */}
      <Card>
        <Flex
          wrap
          align="baseline"
          justify="space-between"
          gap={10}
          style={{ marginBottom: 10 }}
        >
          <Space>
            <Text style={{ display: "block" }}>
              Hiển thị <strong>{sims.length}</strong> /{" "}
              {simsData?.total ?? sims.length} SIM
            </Text>

            {selectedRowKeys.length > 0 && (
              <>
                <Tag color="blue" style={{ marginLeft: 10 }}>
                  Đang chọn {selectedRowKeys.length}
                </Tag>
                <Tag
                  color="default"
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedRowKeys([])}
                >
                  Huỷ chọn
                </Tag>
              </>
            )}
          </Space>
          <Space wrap>
            {!!selectedRowKeys.length && (
              <Button
                type="primary"
                size="small"
                onClick={() => {
                  mutate({
                    ids: selectedRowKeys as string[],
                    action: "confirm",
                  });
                }}
              >
                Xác nhận
              </Button>
            )}
            <Tooltip title="Hủy hàng loạt SIM theo số điện thoại">
              <Button
                danger
                icon={<StopOutlined />}
                onClick={() => setBulkCancelOpen(true)}
              >
                Hủy SIM
              </Button>
            </Tooltip>
            <Tooltip title="Tạm khoá hàng loạt SIM theo số điện thoại">
              <Button
                icon={<LockOutlined />}
                onClick={() => setBulkLockOpen(true)}
              >
                Tạm khoá SIM
              </Button>
            </Tooltip>
            <Tooltip title="Chuyển hàng loạt SIM sang trạng thái Chờ huỷ">
              <Button
                icon={<ClockCircleOutlined />}
                onClick={() => setBulkPendingCancelOpen(true)}
              >
                Chờ huỷ
              </Button>
            </Tooltip>
            <Tooltip title="Reset hàng loạt SIM theo số điện thoại">
              <Button
                icon={<ReloadOutlined />}
                onClick={() => setBulkResetOpen(true)}
              >
                Reset SIM
              </Button>
            </Tooltip>
            {columnPickerButton}
            <Tooltip title="Xuất toàn bộ dữ liệu theo bộ lọc hiện tại">
              <Button
                icon={<DownloadOutlined />}
                loading={exportAllLoading}
                onClick={handleExportAllDB}
              >
                Xuất toàn bộ dữ liệu
              </Button>
            </Tooltip>
            <Tooltip title="Xuất các SIM đang được tích chọn">
              <Button
                type="primary"
                icon={<ExportOutlined />}
                onClick={() => handleExport(false)}
                disabled={selectedRowKeys.length === 0}
              >
                Xuất đã chọn
                {selectedRowKeys.length > 0
                  ? ` (${selectedRowKeys.length})`
                  : ""}
              </Button>
            </Tooltip>
          </Space>
        </Flex>
        <Table
          dataSource={sims}
          columns={columns}
          rowKey="id"
          size="small"
          scroll={{ x: "max-content" }}
          rowSelection={rowSelection}
          rowClassName={(record) =>
            alertSimIds.has(record.id) ? "row-alert" : ""
          }
          pagination={{ ...pagination, total: simsData?.total ?? 0 }}
          onChange={handleTableChange}
          loading={isLoading || isFetching || isRefetching}
        />
      </Card>

      <style>{`
        .row-alert td { background-color: #fff2f0 !important; }
        .row-alert:hover td { background-color: #ffe7e7 !important; }
      `}</style>

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
      <ExportModal
        open={exportModalOpen}
        data={exportData}
        onClose={() => setExportModalOpen(false)}
      />
      <BulkCancelModal
        open={bulkCancelOpen}
        onClose={() => setBulkCancelOpen(false)}
      />
      <BulkResetModal
        open={bulkResetOpen}
        onClose={() => setBulkResetOpen(false)}
      />
      <BulkLockModal
        open={bulkLockOpen}
        onClose={() => setBulkLockOpen(false)}
      />
      <BulkPendingCancelModal
        open={bulkPendingCancelOpen}
        onClose={() => setBulkPendingCancelOpen(false)}
      />
    </div>
  );
};

export default SimManagement;
