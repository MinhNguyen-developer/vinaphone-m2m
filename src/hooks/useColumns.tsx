import { SettingOutlined } from "@ant-design/icons";
import { Button, Checkbox, Col, Popover, Row } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useState } from "react";

interface UseColumnsProps<TKey extends string, TRow> {
  /** Full list of all possible columns (each must have a `colKey` property) */
  allColumns: (ColumnsType<TRow>[number] & { colKey: TKey })[];
  allColumnsKeys: readonly TKey[];
  localStorageKey: string;
  columnLabels: Record<TKey, string>;
  defaultVisibleKeys?: readonly TKey[];
}

export function useColumns<TKey extends string, TRow>({
  allColumns,
  localStorageKey,
  allColumnsKeys,
  columnLabels,
  defaultVisibleKeys = [] as unknown as readonly TKey[],
}: UseColumnsProps<TKey, TRow>) {
  const loadVisibleKeys = useCallback((): TKey[] => {
    try {
      const stored = localStorage.getItem(localStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as unknown[];
        if (Array.isArray(parsed)) {
          const valid = parsed.filter((k): k is TKey =>
            allColumnsKeys.includes(k as TKey),
          );
          if (valid.length > 0) return valid;
        }
      }
    } catch {
      /* ignore */
    }
    return [...defaultVisibleKeys] as TKey[];
  }, [allColumnsKeys, defaultVisibleKeys, localStorageKey]);

  const saveVisibleColumns = useCallback(
    (keys: readonly TKey[]) => {
      localStorage.setItem(localStorageKey, JSON.stringify(keys));
    },
    [localStorageKey],
  );

  const [visibleCols, setVisibleCols] = useState<TKey[]>(loadVisibleKeys);

  const toggleColumn = useCallback(
    (key: TKey, checked: boolean) => {
      setVisibleCols((prev) => {
        const next = checked ? [...prev, key] : prev.filter((k) => k !== key);
        saveVisibleColumns(next);
        return next;
      });
    },
    [saveVisibleColumns],
  );

  // Filter by the custom colKey, not dataIndex
  const tableColumns = allColumns.filter((col) =>
    visibleCols.includes(col.colKey),
  );

  const columnPickerContent = (
    <div style={{ width: 280 }}>
      <div style={{ marginBottom: 8, fontWeight: 600 }}>Hiển thị cột</div>
      <Row gutter={[0, 4]}>
        {allColumnsKeys.map((k) => (
          <Col span={12} key={k}>
            <Checkbox
              checked={visibleCols.includes(k)}
              onChange={(e) => toggleColumn(k, e.target.checked)}
            >
              {columnLabels[k]}
            </Checkbox>
          </Col>
        ))}
      </Row>
      <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
        <Button
          size="small"
          onClick={() => {
            const all = [...allColumnsKeys] as TKey[];
            setVisibleCols(all);
            saveVisibleColumns(all);
          }}
        >
          Hiện tất cả
        </Button>
        <Button
          size="small"
          onClick={() => {
            const def = [...defaultVisibleKeys] as TKey[];
            setVisibleCols(def);
            saveVisibleColumns(def);
          }}
        >
          Mặc định
        </Button>
      </div>
    </div>
  );

  const popover = (
    <Popover
      content={columnPickerContent}
      trigger="click"
      placement="bottomRight"
    >
      <Button icon={<SettingOutlined />}>Cột hiển thị</Button>
    </Popover>
  );

  return {
    tableColumns,
    visibleCols,
    toggleColumn,
    popover,
  };
}
