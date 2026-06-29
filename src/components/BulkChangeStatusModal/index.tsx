import type { RcFile } from "antd/es/upload";
import { useState } from "react";
import { useBulkChangeStatusSims } from "../../hooks/useSims";
import {
  message,
  Space,
  Alert,
  Modal,
  Upload,
  Divider,
  Typography,
  Input,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";

const { Text } = Typography;

const BulkChangeStatusModal: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  const [textValue, setTextValue] = useState("");
  const [parsed, setParsed] = useState<string[]>([]);
  const { mutate: bulkChangeStatus, isPending } = useBulkChangeStatusSims();

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
    bulkChangeStatus(
      { phoneNumbers: parsed, status: 1 },
      {
        onSuccess: (result) => {
          if (result.changed > 0) {
            message.success(
              `Đã chuyển ${result.changed}/${result.requested} SIM sang trạng thái mới`,
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
      },
    );
  };

  const handleClose = () => {
    setTextValue("");
    setParsed([]);
    onClose();
  };

  return (
    <Modal
      title="Chuyển trạng thái SIM hàng loạt"
      open={open}
      onOk={handleConfirm}
      onCancel={handleClose}
      okText="Xác nhận chuyển trạng thái"
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

export default BulkChangeStatusModal;
