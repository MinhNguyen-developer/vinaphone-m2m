import { Button, Dropdown } from "antd";
import type { MenuProps } from "antd";
import { MoreOutlined } from "@ant-design/icons";

export type TableActionItem =
  | {
      key: string;
      type: "divider";
    }
  | {
      key: string;
      label: React.ReactNode;
      icon?: React.ReactNode;
      danger?: boolean;
      disabled?: boolean;
      type?: never;
      onClick?: () => void;
    };

interface TableActionsProps {
  items: TableActionItem[];
  /** Trigger for the dropdown. Defaults to ["click"] */
  trigger?: ("click" | "hover" | "contextMenu")[];
  /** Size of the trigger button. Defaults to "small" */
  buttonSize?: "small" | "middle" | "large";
}

export const TableActions: React.FC<TableActionsProps> = ({
  items,
  trigger = ["click"],
  buttonSize = "small",
}) => {
  const menuItems: MenuProps["items"] = items.map((item) =>
    item.type === "divider"
      ? { type: "divider", key: item.key }
      : {
          key: item.key,
          label: item.label,
          icon: item.icon,
          danger: item.danger,
          disabled: item.disabled,
          onClick: item.onClick,
        },
  );

  return (
    <Dropdown trigger={trigger} menu={{ items: menuItems }}>
      <Button size={buttonSize} icon={<MoreOutlined />} />
    </Dropdown>
  );
};
