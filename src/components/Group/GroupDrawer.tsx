import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
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
import { resolveSimIdentifiers } from "../../utils/simIdentifiers";

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
  const {
    data: allSims = [],
    isLoading: simsLoading,
    isError: simsError,
    refetch: refetchSims,
  } = useAllSims();

  // Edit mode: fetch the group's current SIM IDs to pre-populate right panel
  const {
    data: groupSimIds,
    isError: membersError,
    refetch: refetchMembers,
  } = useQuery({
    queryKey: [...queryKeys.groups.all, editingGroup?.id, "sim-ids"],
    queryFn: () => groupsApi.getSimIds(editingGroup!.id),
    enabled: open && mode === "edit" && !!editingGroup,
    staleTime: 30_000,
  });

  const membersLoading = mode === "edit" && groupSimIds === undefined;
  const loadError = simsError || (mode === "edit" && membersError);
  const canEditSims = !simsLoading && !membersLoading && !loadError;

  const dataSource: SimTransferItem[] = useMemo(
    () =>
      allSims.map((s) => ({
        key: s.id,
        phoneNumber: s.phoneNumber,
        internalImsi: s.internalImsi ?? s.imsi?.slice(-10),
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
    if (!open || mode !== "edit" || !groupSimIds) return;
    setTargetKeys(groupSimIds);
  }, [open, mode, groupSimIds]);

  const handleClose = () => {
    form.resetFields();
    setTargetKeys([]);
    setPhoneInput("");
    onClose();
  };

  const addSims = (input: string) => {
    const { simIds, notFound } = resolveSimIdentifiers(input, allSims);
    setTargetKeys((current) => [...new Set([...current, ...simIds])]);
    if (simIds.length) message.success(`Đã thêm ${simIds.length} SIM vào nhóm`);
    if (notFound.length)
      message.warning(`Không tìm thấy: ${notFound.join(", ")}`);
    return notFound;
  };

  const handleCsvUpload = (file: RcFile): boolean => {
    if (!canEditSims) return false;
    const reader = new FileReader();
    reader.onload = (e) => {
      addSims((e.target?.result as string) ?? "");
    };
    reader.onerror = () =>
      message.error("Không thể đọc file. Vui lòng thử lại.");
    reader.readAsText(file);
    return false;
  };

  const handleAddByPhone = () => {
    if (!canEditSims) return;
    setPhoneInput(addSims(phoneInput).join("\n"));
  };

  const handleSubmit = async () => {
    if (!canEditSims) return;
    const values = await form.validateFields();
    const dto = {
      ...values,
      simIds: targetKeys,
    };
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
            disabled={!canEditSims}
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
          {loadError && (
            <Alert
              type="error"
              showIcon
              title="Không tải được danh sách SIM. Vui lòng tải lại trước khi thêm hoặc lưu."
              action={
                <Button
                  size="small"
                  onClick={() => {
                    void refetchSims();
                    if (mode === "edit") void refetchMembers();
                  }}
                >
                  Tải lại
                </Button>
              }
              style={{ marginBottom: 12 }}
            />
          )}
          <div style={{ marginBottom: 8 }}>
            <Text strong>Tải lên file CSV</Text>
            <Upload.Dragger
              accept=".csv,.txt"
              beforeUpload={handleCsvUpload}
              showUploadList={false}
              disabled={!canEditSims}
              style={{ marginTop: 6, marginBottom: 8 }}
            >
              <p className="ant-upload-drag-icon">
                <UploadOutlined />
              </p>
              <p className="ant-upload-text">
                Kéo thả file vào đây hoặc click để chọn
              </p>
              <p className="ant-upload-hint">
                File CSV 1 cột, không có tiêu đề, mỗi dòng 1 số điện thoại hoặc
                IMSI nội bộ (10 số cuối)
              </p>
            </Upload.Dragger>
            <Divider plain style={{ margin: "4px 0" }}>
              hoặc nhập tay
            </Divider>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Nhập số điện thoại hoặc IMSI nội bộ (10 số cuối), xuống dòng để
              nhập nhiều SIM:
            </Text>
            <TextArea
              rows={3}
              placeholder={"0987654321\n0912345678\n..."}
              value={phoneInput}
              disabled={!canEditSims}
              onChange={(e) => setPhoneInput(e.target.value)}
              style={{ marginTop: 4, fontFamily: "monospace", fontSize: 12 }}
            />
            <Button
              icon={<PlusOutlined />}
              size="small"
              style={{ marginTop: 6 }}
              disabled={!canEditSims || !phoneInput.trim()}
              onClick={handleAddByPhone}
            >
              Thêm vào nhóm
            </Button>
          </div>
          <Divider plain style={{ margin: "8px 0" }} />
          <TableTransfer
            dataSource={dataSource}
            targetKeys={targetKeys}
            loading={simsLoading || membersLoading}
            disabled={!canEditSims}
            onChange={(nextKeys) => setTargetKeys(nextKeys)}
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
};

export default GroupDrawer;
