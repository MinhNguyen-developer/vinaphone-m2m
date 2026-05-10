import React from "react";
import { Modal, Tag, Space } from "antd";
import { TeamOutlined } from "@ant-design/icons";
import SimGroupMembersTable from "./SimGroupMembersTable";

interface Props {
  groupId: string | null;
  groupName?: string | null;
  onClose: () => void;
}

const SimGroupMembersModal: React.FC<Props> = ({
  groupId,
  groupName,
  onClose,
}) => {
  return (
    <Modal
      open={!!groupId}
      onCancel={onClose}
      footer={null}
      width={640}
      centered
      destroyOnHidden
      title={
        <Space>
          <TeamOutlined style={{ color: "#1677ff" }} />
          <span>
            Thành viên nhóm – <Tag color="blue">{groupName ?? groupId}</Tag>
          </span>
        </Space>
      }
    >
      {groupId && <SimGroupMembersTable groupId={groupId} />}
    </Modal>
  );
};

export default SimGroupMembersModal;
