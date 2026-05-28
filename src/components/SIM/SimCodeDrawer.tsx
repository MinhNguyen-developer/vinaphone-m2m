import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Divider,
  Drawer,
  Form,
  Input,
  Space,
  Typography,
  Upload,
  message,
} from "antd";
import { PlusOutlined, UploadOutlined } from "@ant-design/icons";
import type { RcFile } from "antd/es/upload";
import type { SimCodeItem } from "../../api/simCodes.api";
import {
  useCreateSimCode,
  useUpdateSimCode,
  useSimCodeSimIds,
} from "../../hooks/useSimCodes";
import { useAllSims } from "../../hooks/useSims";
import type { SimTransferItem } from "../Group/TableTransfer";
import TableTransfer from "../Group/TableTransfer";

const { TextArea } = Input;
const { Text } = Typography;

interface SimCodeFormValues {
  code: string;
  description?: string;
}

export interface SimCodeDrawerProps {
  open: boolean;
  mode: "create" | "edit";
  editingItem: SimCodeItem | null;
  onClose: () => void;
}

const SimCodeDrawer: React.FC<SimCodeDrawerProps> = ({
  open,
  mode,
  editingItem,
  onClose,
}) => {
  const [form] = Form.useForm<SimCodeFormValues>();
  const [targetKeys, setTargetKeys] = useState<string[]>([]);
  const [phoneInput, setPhoneInput] = useState("");

  const { mutateAsync: createSimCode, isPending: creating } =
    useCreateSimCode();
  const { mutateAsync: updateSimCode, isPending: updating } =
    useUpdateSimCode();

  // Fetch all SIMs once for the transfer list
  const { data: allSims = [], isLoading: simsLoading } = useAllSims();

  // Edit mode: fetch current SIM IDs for this SimCode
  const { data: existingSimIds = [] } = useSimCodeSimIds(
    open && mode === "edit" ? (editingItem?.id ?? null) : null,
  );

  const dataSource: SimTransferItem[] = useMemo(
    () =>
      allSims.map((s) => ({
        key: s.id,
        phoneNumber: s.phoneNumber,
        ratingPlan: s.ratingPlanName ?? s.productCode,
      })),
    [allSims],
  );

  // Pre-fill form on open
  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && editingItem) {
      form.setFieldsValue({
        code: editingItem.code,
        description: editingItem.description ?? "",
      });
    } else {
      form.resetFields();
      setTargetKeys([]);
    }
  }, [open, mode, editingItem, form]);

  // When existingSimIds arrives (edit mode), set targetKeys
  useEffect(() => {
    if (!open || mode !== "edit" || !existingSimIds.length) return;
    setTargetKeys(existingSimIds);
  }, [open, mode, existingSimIds]);

  const handleClose = () => {
    form.resetFields();
    setTargetKeys([]);
    setPhoneInput("");
    onClose();
  };

  const handleCsvUpload = (file: RcFile): boolean => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) ?? "";
      const phones = text
        .split(/[\n,;\r]+/)
        .map((p) => p.trim())
        .filter(Boolean);
      if (!phones.length) return;
      const phoneToId = new Map(allSims.map((s) => [s.phoneNumber, s.id]));
      const found: string[] = [];
      const notFound: string[] = [];
      phones.forEach((p) => {
        const id = phoneToId.get(p);
        if (id) found.push(id);
        else notFound.push(p);
      });
      setTargetKeys(Array.from(new Set([...targetKeys, ...found])));
      if (found.length)
        message.success(`Đã thêm ${found.length} SIM từ file vào mã SIM`);
      if (notFound.length)
        message.warning(`Không tìm thấy: ${notFound.join(", ")}`);
    };
    reader.readAsText(file);
    return false;
  };

  const handleAddByPhone = () => {
    const phones = phoneInput
      .split(/[\n,;]+/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (!phones.length) return;
    const phoneToId = new Map(allSims.map((s) => [s.phoneNumber, s.id]));
    const found: string[] = [];
    const notFound: string[] = [];
    phones.forEach((p) => {
      const id = phoneToId.get(p);
      if (id) found.push(id);
      else notFound.push(p);
    });
    setTargetKeys(Array.from(new Set([...targetKeys, ...found])));
    setPhoneInput("");
    if (found.length) message.success(`Đã thêm ${found.length} SIM vào mã SIM`);
    if (notFound.length)
      message.warning(`Không tìm thấy: ${notFound.join(", ")}`);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const dto = { ...values, simIds: targetKeys };
    if (mode === "create") {
      await createSimCode(dto);
    } else if (editingItem) {
      await updateSimCode({ id: editingItem.id, dto });
    }
    handleClose();
  };

  return (
    <Drawer
      title={
        mode === "create"
          ? "Thêm mã SIM mới"
          : `Sửa mã SIM: ${editingItem?.code}`
      }
      width={900}
      open={open}
      onClose={handleClose}
      footer={
        <Space style={{ float: "right" }}>
          <Button onClick={handleClose}>Huỷ</Button>
          <Button
            type="primary"
            loading={creating || updating}
            onClick={handleSubmit}
          >
            {mode === "create" ? "Tạo mã SIM" : "Lưu thay đổi"}
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" requiredMark="optional">
        <Form.Item
          name="code"
          label="Mã SIM"
          rules={[
            { required: true, message: "Vui lòng nhập mã SIM" },
            { max: 50, message: "Tối đa 50 ký tự" },
          ]}
        >
          <Input placeholder="Nhập mã SIM" />
        </Form.Item>

        <Form.Item name="description" label="Mô tả">
          <TextArea rows={2} placeholder="Mô tả mã SIM (tuỳ chọn)" />
        </Form.Item>

        <Form.Item label={`SIM trong mã (${targetKeys.length} đã chọn)`}>
          <div style={{ marginBottom: 8 }}>
            <Text strong>Tải lên file CSV</Text>
            <Upload.Dragger
              accept=".csv,.txt"
              beforeUpload={handleCsvUpload}
              showUploadList={false}
              style={{ marginTop: 6, marginBottom: 8 }}
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
            <Divider plain style={{ margin: "4px 0" }}>
              hoặc nhập tay
            </Divider>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Nhập số điện thoại (xuống dòng để nhập nhiều số) để thêm nhanh vào
              mã SIM:
            </Text>
            <TextArea
              rows={3}
              placeholder={"0987654321\n0912345678\n..."}
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              style={{ marginTop: 4, fontFamily: "monospace", fontSize: 12 }}
            />
            <Button
              icon={<PlusOutlined />}
              size="small"
              style={{ marginTop: 6 }}
              disabled={!phoneInput.trim()}
              onClick={handleAddByPhone}
            >
              Thêm vào mã SIM
            </Button>
          </div>
          <Divider plain style={{ margin: "8px 0" }} />
          <TableTransfer
            dataSource={dataSource}
            targetKeys={targetKeys}
            loading={simsLoading}
            onChange={(nextKeys) => setTargetKeys(nextKeys)}
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
};

export default SimCodeDrawer;
