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
import { useQuery } from "@tanstack/react-query";
import type { GroupWithCount } from "../../types";
import type { SimTransferItem } from "./TableTransfer";
import TableTransfer from "./TableTransfer";
import { useCreateGroup, useUpdateGroup } from "../../hooks/useGroups";
import { useAllSims } from "../../hooks/useSims";
import { groupsApi } from "../../api/groups.api";
import { queryKeys } from "../../hooks/queryKeys";

const { TextArea } = Input;
const { Text } = Typography;

interface GroupFormValues {
  name: string;
  description?: string;
}

export interface GroupDrawerProps {
  open: boolean;
  mode: "create" | "edit";
  editingGroup: GroupWithCount | null;
  onClose: () => void;
}

const GroupDrawer: React.FC<GroupDrawerProps> = ({
  open,
  mode,
  editingGroup,
  onClose,
}) => {
  const [form] = Form.useForm<GroupFormValues>();
  const [targetKeys, setTargetKeys] = useState<string[]>([]);
  const [phoneInput, setPhoneInput] = useState("");

  const { mutateAsync: createGroup, isPending: creating } = useCreateGroup();
  const { mutateAsync: updateGroup, isPending: updating } = useUpdateGroup();

  // Fetch all SIMs once for the transfer list
  const { data: allSims = [], isLoading: simsLoading } = useAllSims();

  // Edit mode: fetch the group's current SIM IDs to pre-populate right panel
  const { data: groupSimIds = [] } = useQuery({
    queryKey: [...queryKeys.groups.all, editingGroup?.id, "sim-ids"],
    queryFn: () => groupsApi.getSimIds(editingGroup!.id),
    enabled: open && mode === "edit" && !!editingGroup,
    staleTime: 30_000,
  });

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
    if (mode === "edit" && editingGroup) {
      form.setFieldsValue({
        name: editingGroup.name,
        description: editingGroup.description ?? "",
      });
    } else {
      form.resetFields();
      setTargetKeys([]);
    }
  }, [open, mode, editingGroup, form]);

  // When groupSimIds arrives (edit mode), set targetKeys
  useEffect(() => {
    if (!open || mode !== "edit" || !groupSimIds.length) return;
    setTargetKeys(groupSimIds);
  }, [open, mode, groupSimIds]);

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
        message.success(`Đã thêm ${found.length} SIM từ file vào nhóm`);
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
    if (found.length) message.success(`Đã thêm ${found.length} SIM vào nhóm`);
    if (notFound.length)
      message.warning(`Không tìm thấy: ${notFound.join(", ")}`);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const dto = { ...values, simIds: targetKeys };
    if (mode === "create") {
      await createGroup(dto);
      message.success("Tạo nhóm thành công");
    } else {
      await updateGroup({ id: editingGroup!.id, dto });
      message.success("Cập nhật nhóm thành công");
    }
    handleClose();
  };

  return (
    <Drawer
      title={
        mode === "create" ? "Thêm nhóm mới" : `Sửa nhóm: ${editingGroup?.name}`
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
            {mode === "create" ? "Tạo nhóm" : "Lưu thay đổi"}
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" requiredMark="optional">
        <Form.Item
          name="name"
          label="Tên nhóm"
          rules={[
            { required: true, message: "Vui lòng nhập tên nhóm" },
            { max: 100, message: "Tối đa 100 ký tự" },
          ]}
        >
          <Input placeholder="Nhập tên nhóm" />
        </Form.Item>

        <Form.Item name="description" label="Mô tả">
          <TextArea rows={3} placeholder="Mô tả nhóm (tuỳ chọn)" />
        </Form.Item>

        <Form.Item label={`SIM trong nhóm (${targetKeys.length} đã chọn)`}>
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
              nhóm:
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
              Thêm vào nhóm
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

export default GroupDrawer;
