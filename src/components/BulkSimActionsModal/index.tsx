import React, { useMemo, useState } from "react";
import { UploadOutlined } from "@ant-design/icons";
import {
  Alert,
  Divider,
  Input,
  Modal,
  Space,
  Typography,
  Upload,
  message,
} from "antd";
import {
  useBulkCancelSims,
  useBulkLockSims,
  useBulkPendingCancelSims,
  useBulkPendingLockSims,
  useBulkPendingRevokeSims,
  useBulkResetSims,
} from "../../hooks/useSims";
import { parseBulkImsis, useUploadCsv } from "../../hooks/useUploadsFile";

const { Text } = Typography;

export type BulkSimActionType =
  | "cancel"
  | "reset"
  | "lock"
  | "pendingCancel"
  | "pendingLock"
  | "pendingRevoke";

interface BulkSimActionsModalProps {
  action: BulkSimActionType;
  open: boolean;
  onClose: () => void;
}

interface BulkActionResult {
  requested: number;
  notFound: number;
  cancelled?: number;
  reset?: number;
  locked?: number;
  pendingCancelled?: number;
  pendingLocked?: number;
  pendingRevoked?: number;
}

const ACTION_META: Record<
  BulkSimActionType,
  {
    title: string;
    okText: string;
    danger?: boolean;
    alertMessage: string;
    errorMessage: string;
    successMessage: (updated: number, requested: number) => string;
  }
> = {
  cancel: {
    title: "Hủy SIM hàng loạt",
    okText: "Xác nhận hủy",
    danger: true,
    alertMessage: "SIM bị hủy sẽ chuyển sang trạng thái Đã hủy.",
    errorMessage: "Hủy SIM thất bại!",
    successMessage: (updated, requested) =>
      `Đã hủy ${updated}/${requested} SIM thành công`,
  },
  reset: {
    title: "Reset SIM hàng loạt",
    okText: "Xác nhận reset",
    danger: true,
    alertMessage:
      "SIM bị reset sẽ chuyển về trạng thái Mới và toàn bộ lịch sử dữ liệu sẽ bị xóa.",
    errorMessage: "Reset SIM thất bại!",
    successMessage: (updated, requested) =>
      `Đã reset ${updated}/${requested} SIM thành công`,
  },
  lock: {
    title: "Khoá SIM hàng loạt",
    okText: "Xác nhận khoá",
    alertMessage: "SIM bị khoá sẽ chuyển sang trạng thái Khoá.",
    errorMessage: "Khoá SIM thất bại!",
    successMessage: (updated, requested) =>
      `Đã khoá ${updated}/${requested} SIM thành công`,
  },
  pendingCancel: {
    title: "Chờ huỷ SIM hàng loạt",
    okText: "Xác nhận chờ huỷ",
    alertMessage: "SIM sẽ chuyển sang trạng thái Chờ huỷ.",
    errorMessage: "Chuyển trạng thái thất bại!",
    successMessage: (updated, requested) =>
      `Đã chuyển ${updated}/${requested} SIM sang Chờ huỷ`,
  },
  pendingLock: {
    title: "Chờ khoá SIM hàng loạt",
    okText: "Xác nhận chờ khoá",
    alertMessage: "SIM sẽ chuyển sang trạng thái Chờ khoá.",
    errorMessage: "Chuyển trạng thái thất bại!",
    successMessage: (updated, requested) =>
      `Đã chuyển ${updated}/${requested} SIM sang Chờ khoá`,
  },
  pendingRevoke: {
    title: "Chờ thu hồi SIM hàng loạt",
    okText: "Xác nhận chờ thu hồi",
    alertMessage: "SIM sẽ chuyển sang trạng thái Chờ thu hồi.",
    errorMessage: "Chuyển trạng thái thất bại!",
    successMessage: (updated, requested) =>
      `Đã chuyển ${updated}/${requested} SIM sang Chờ thu hồi`,
  },
};

const getUpdatedCount = (result: BulkActionResult): number =>
  result.cancelled ??
  result.reset ??
  result.locked ??
  result.pendingCancelled ??
  result.pendingLocked ??
  result.pendingRevoked ??
  0;

export const BulkSimActionsModal: React.FC<BulkSimActionsModalProps> = ({
  action,
  open,
  onClose,
}) => {
  const [textValue, setTextValue] = useState("");
  const [parsed, setParsed] = useState<string[]>([]);

  const bulkCancel = useBulkCancelSims();
  const bulkReset = useBulkResetSims();
  const bulkLock = useBulkLockSims();
  const bulkPendingCancel = useBulkPendingCancelSims();
  const bulkPendingLock = useBulkPendingLockSims();
  const bulkPendingRevoke = useBulkPendingRevokeSims();

  const meta = ACTION_META[action];

  const isPending =
    action === "cancel"
      ? bulkCancel.isPending
      : action === "reset"
        ? bulkReset.isPending
        : action === "lock"
          ? bulkLock.isPending
          : action === "pendingCancel"
            ? bulkPendingCancel.isPending
            : action === "pendingLock"
              ? bulkPendingLock.isPending
              : bulkPendingRevoke.isPending;

  const resetModalState = () => {
    setTextValue("");
    setParsed([]);
  };

  const handleTextChange = (val: string) => {
    setTextValue(val);
    setParsed(parseBulkImsis(val));
  };

  const handleCsvUpload = useUploadCsv({
    onParsed: (rows) => {
      setTextValue(rows.join("\n"));
      setParsed(rows);
    },
  });

  const handleActionSuccess = (result: BulkActionResult) => {
    const updatedCount = getUpdatedCount(result);

    if (updatedCount > 0) {
      message.success(meta.successMessage(updatedCount, result.requested));
    }

    if (result.notFound > 0) {
      message.warning(
        `${result.notFound} IMSI không tìm thấy trong hệ thống`,
        6,
      );
    }

    resetModalState();
    if (result.notFound === 0) onClose();
  };

  const handleConfirm = () => {
    if (parsed.length === 0) {
      message.warning("Vui lòng nhập ít nhất 1 IMSI!");
      return;
    }

    if (action === "cancel") {
      bulkCancel.mutate(parsed, {
        onSuccess: (result) => handleActionSuccess(result),
        onError: () => message.error(meta.errorMessage),
      });
      return;
    }

    if (action === "reset") {
      bulkReset.mutate(parsed, {
        onSuccess: (result) => handleActionSuccess(result),
        onError: () => message.error(meta.errorMessage),
      });
      return;
    }

    if (action === "lock") {
      bulkLock.mutate(parsed, {
        onSuccess: (result) => handleActionSuccess(result),
        onError: () => message.error(meta.errorMessage),
      });
      return;
    }

    if (action === "pendingCancel") {
      bulkPendingCancel.mutate(parsed, {
        onSuccess: (result) => handleActionSuccess(result),
        onError: () => message.error(meta.errorMessage),
      });
      return;
    }

    if (action === "pendingLock") {
      bulkPendingLock.mutate(parsed, {
        onSuccess: (result) => handleActionSuccess(result),
        onError: () => message.error(meta.errorMessage),
      });
      return;
    }

    if (action === "pendingRevoke") {
      bulkPendingRevoke.mutate(parsed, {
        onSuccess: (result) => handleActionSuccess(result),
        onError: () => message.error(meta.errorMessage),
      });
      return;
    }
  };

  const handleClose = () => {
    resetModalState();
    onClose();
  };

  const placeholder = useMemo(() => "1172636441\n1726364412\n...", []);

  return (
    <Modal
      title={meta.title}
      open={open}
      onOk={handleConfirm}
      onCancel={handleClose}
      okText={meta.okText}
      okButtonProps={{ danger: meta.danger, loading: isPending }}
      cancelText="Đóng"
      width={520}
    >
      <Space direction="vertical" style={{ width: "100%" }} size={12}>
        <Alert type="warning" showIcon message={meta.alertMessage} />
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
              File CSV 1 cột, không có tiêu đề, mỗi dòng 1 IMSI
            </p>
          </Upload.Dragger>
        </div>
        <Divider plain style={{ margin: "4px 0" }}>
          hoặc nhập tay
        </Divider>
        <div>
          <Text strong>Danh sách IMSI</Text>
          <Input.TextArea
            rows={4}
            placeholder={placeholder}
            value={textValue}
            onChange={(event) => handleTextChange(event.target.value)}
            style={{ marginTop: 6, fontFamily: "monospace", fontSize: 13 }}
          />
          {parsed.length > 0 && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Đã nhận {parsed.length} IMSI
            </Text>
          )}
        </div>
      </Space>
    </Modal>
  );
};

export default BulkSimActionsModal;
