import React, { useEffect, useState } from "react";
import {
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Radio,
  Space,
  Switch,
  message,
} from "antd";
import type { AlertConfig } from "../../types";
import { useCreateAlert, useUpdateAlert } from "../../hooks/useAlerts";
import type { AlertFormValues } from "../../api/alerts.api";
import { ServerSelect } from "../ServerSelect";
import { simsApi } from "../../api/sims.api";
import { groupsApi } from "../../api/groups.api";
import { ratingPlansApi } from "../../api/rating-plans.api";
import { queryKeys } from "../../hooks/queryKeys";

export interface AlertDrawerProps {
  open: boolean;
  mode: "create" | "edit";
  editingAlert: AlertConfig | null;
  onClose: () => void;
}

type ScopeType = "all" | "sim" | "group" | "ratingPlanId";

function detectScope(a: AlertConfig | null): ScopeType {
  if (!a) return "all";
  if (a.simId) return "sim";
  if (a.groupId) return "group";
  if (a.ratingPlanId) return "ratingPlanId";
  return "all";
}

const AlertDrawer: React.FC<AlertDrawerProps> = ({
  open,
  mode,
  editingAlert,
  onClose,
}) => {
  const [form] = Form.useForm<AlertFormValues & { scopeType: ScopeType }>();
  const [scopeType, setScopeType] = useState<ScopeType>("all");

  const { mutateAsync: createAlert, isPending: creating } = useCreateAlert();
  const { mutateAsync: updateAlert, isPending: updating } = useUpdateAlert();

  // Pre-fill form on open
  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && editingAlert) {
      const scope = detectScope(editingAlert);
      setScopeType(scope);
      form.setFieldsValue({
        label: editingAlert.label,
        thresholdMB: editingAlert.thresholdMB,
        scopeType: scope,
        simId: editingAlert.simId,
        groupId: editingAlert.groupId,
        productCode: editingAlert.productCode,
        active: editingAlert.active,
      });
    } else {
      setScopeType("all");
      form.resetFields();
      form.setFieldsValue({ active: true, scopeType: "all" });
    }
  }, [open, mode, editingAlert, form]);

  const handleScopeChange = (next: ScopeType) => {
    setScopeType(next);
    // Clear the other scope fields
    form.setFieldsValue({
      simId: undefined,
      groupId: undefined,
      productCode: undefined,
    });
  };

  const handleClose = () => {
    form.resetFields();
    setScopeType("all");
    onClose();
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const dto: AlertFormValues = {
      label: values.label,
      thresholdMB: values.thresholdMB,
      active: values.active,
      simId: scopeType === "sim" ? values.simId : undefined,
      groupId: scopeType === "group" ? values.groupId : undefined,
      ratingPlanId:
        scopeType === "ratingPlanId" ? values.ratingPlanId : undefined,
    };
    if (mode === "create") {
      await createAlert(dto);
      message.success("Tạo cảnh báo thành công");
    } else {
      await updateAlert({ id: editingAlert!.id, dto });
      message.success("Cập nhật cảnh báo thành công");
    }
    handleClose();
  };

  return (
    <Drawer
      title={
        mode === "create"
          ? "Thêm cảnh báo mới"
          : `Sửa cảnh báo: ${editingAlert?.label}`
      }
      size={480}
      open={open}
      destroyOnHidden
      onClose={handleClose}
      footer={
        <Space style={{ float: "right" }}>
          <Button onClick={handleClose}>Huỷ</Button>
          <Button
            type="primary"
            loading={creating || updating}
            onClick={handleSubmit}
          >
            {mode === "create" ? "Tạo cảnh báo" : "Lưu thay đổi"}
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" requiredMark="optional">
        <Form.Item
          name="label"
          label="Tên cảnh báo"
          rules={[{ required: true, message: "Vui lòng nhập tên cảnh báo" }]}
        >
          <Input placeholder="VD: Cảnh báo 80%" />
        </Form.Item>

        <Form.Item
          name="thresholdMB"
          label="Ngưỡng dung lượng (MB)"
          rules={[{ required: true, message: "Vui lòng nhập ngưỡng (MB)" }]}
        >
          <InputNumber
            min={1}
            style={{ width: "100%" }}
            placeholder="VD: 1024"
          />
        </Form.Item>

        {/* Scope type selector */}
        <Form.Item name="scopeType" label="Áp dụng cho">
          <Radio.Group
            value={scopeType}
            onChange={(e) => handleScopeChange(e.target.value as ScopeType)}
            optionType="button"
            buttonStyle="solid"
            options={[
              { label: "Tất cả", value: "all" },
              { label: "SIM", value: "sim" },
              { label: "Nhóm thiết bị", value: "group" },
              { label: "Gói cước", value: "ratingPlanId" },
            ]}
          />
        </Form.Item>

        {/* SIM picker */}
        {scopeType === "sim" && (
          <Form.Item
            name="simId"
            label="Chọn SIM"
            rules={[{ required: true, message: "Vui lòng chọn SIM" }]}
          >
            <ServerSelect
              queryKey={[...queryKeys.sims.all, "alert-picker"]}
              fetchFn={({ search, page, pageSize }) =>
                simsApi
                  .getList({ search, page, pageSize })
                  .then((r) => ({ data: r.data, total: r.total }))
              }
              getOptionValue={(s) => s.id}
              getOptionLabel={(s) =>
                `${s.phoneNumber}${s.imsi ? ` — ${s.imsi}` : ""}`
              }
              placeholder="Tìm số điện thoại hoặc IMSI"
              style={{ width: "100%" }}
              allowClear
            />
          </Form.Item>
        )}

        {/* Group picker */}
        {scopeType === "group" && (
          <Form.Item
            name="groupId"
            label="Chọn nhóm thiết bị"
            rules={[{ required: true, message: "Vui lòng chọn nhóm" }]}
          >
            <ServerSelect
              queryKey={[...queryKeys.groups.all, "alert-picker"]}
              fetchFn={({ search, page, pageSize }) =>
                groupsApi
                  .getList({ search, page, pageSize })
                  .then((r) => ({ data: r.data, total: r.total }))
              }
              getOptionValue={(g) => g.id}
              getOptionLabel={(g) => g.name}
              placeholder="Tìm tên nhóm"
              style={{ width: "100%" }}
              allowClear
            />
          </Form.Item>
        )}

        {/* Rating plan / product code picker */}
        {scopeType === "ratingPlanId" && (
          <Form.Item
            name="ratingPlanId"
            label="Gói cước"
            rules={[{ required: true, message: "Vui lòng chọn gói cước" }]}
          >
            <ServerSelect
              queryKey={[...queryKeys.ratingPlans.list(), "alert-picker"]}
              fetchFn={({ search, page, pageSize }) =>
                ratingPlansApi
                  .getList({ search, page, pageSize })
                  .then((r) => ({ data: r.data, total: r.total }))
              }
              getOptionValue={(rp) => rp.ratingPlanId}
              getOptionLabel={(rp) => `${rp.name} - (${rp.code})`}
              placeholder="Tìm gói cước"
              style={{ width: "100%" }}
              allowClear
            />
          </Form.Item>
        )}

        <Form.Item name="active" label="Kích hoạt" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Drawer>
  );
};

export default AlertDrawer;
