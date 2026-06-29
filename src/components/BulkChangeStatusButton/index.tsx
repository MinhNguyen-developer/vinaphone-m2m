import { Badge, Button, Dropdown, message } from "antd";
import { VIN_STATUS_OPTIONS } from "../../utils/constants";
import { ClockCircleOutlined, DownOutlined } from "@ant-design/icons";
import { useUpdateManySimStatus } from "../../hooks/useSims";

const BulkChangeStatusButton = ({
  selectedRowKeys,
  setSelectedRowKeys,
}: {
  selectedRowKeys: React.Key[];
  setSelectedRowKeys: (keys: React.Key[]) => void;
}) => {
  const { mutate } = useUpdateManySimStatus();

  return (
    <Dropdown
      trigger={["click"]}
      menu={{
        items: VIN_STATUS_OPTIONS.map((option) => ({
          key: String(option.value),
          label: <Badge color={option.color} text={option.label} />,
        })),
        onClick: ({ key }) => {
          const status = Number(key);
          const selectedStatus = VIN_STATUS_OPTIONS.find(
            (option) => option.value === status,
          );

          if (!Number.isFinite(status)) return;

          mutate(
            {
              ids: selectedRowKeys as string[],
              status,
            },
            {
              onSuccess: (result) => {
                message.success(
                  `Đã chuyển ${result.count}/${selectedRowKeys.length} SIM sang trạng thái ${selectedStatus?.label ?? status}`,
                );
                setSelectedRowKeys([]);
              },
              onError: () =>
                message.error("Chuyển trạng thái SIM hàng loạt thất bại!"),
            },
          );
        },
      }}
    >
      <Button type="primary" icon={<ClockCircleOutlined />}>
        Chuyển trạng thái ({selectedRowKeys.length})
        <DownOutlined style={{ fontSize: 12 }} />
      </Button>
    </Dropdown>
  );
};

export default BulkChangeStatusButton;
