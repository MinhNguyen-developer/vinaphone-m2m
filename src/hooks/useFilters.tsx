import { FilterOutlined } from "@ant-design/icons";
import { Button, Checkbox, Flex, Popover } from "antd";
import React, { useCallback, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

// ─── Types ────────────────────────────────────────────────────────────────

type ColSpan = Partial<Record<"xs" | "sm" | "md" | "lg", number>>;

export interface FilterField<TKey extends string, V = unknown> {
  /** Unique key that identifies this filter. Also used as the URL param name by default. */
  filterKey: TKey;
  /** Human-readable label shown in the toolbox popover checkbox list. */
  label: string;
  /** The value used when the filter is cleared / not set. */
  defaultValue?: V;
  /**
   * Render the filter control. Receives the current value and an onChange
   * callback. The component can be any JSX — Input, Select, DatePicker, etc.
   */
  render: (value: V, onChange: (v: V) => void) => React.ReactNode;
  /** Antd grid column spans for the filter bar layout. */
  colSpan?: ColSpan;
  /**
   * Serialize this field's value to one or more URL params.
   * Keys with `undefined` values are omitted from the URL.
   * Provide this for fields that map to multiple URL params (e.g. dateRange →
   * dateFrom + dateTo), or to customise the serialised form.
   */
  toUrlParams?: (value: V) => Record<string, string | undefined>;
  /**
   * Deserialize this field's value from the current URLSearchParams.
   * Called once on initialisation.
   * Provide this when the field reads from multiple URL params or needs
   * non-trivial parsing (e.g. dayjs conversion).
   */
  fromUrlParams?: (params: URLSearchParams) => V;
}

export interface UseFiltersOptions<TKey extends string> {
  fields: FilterField<TKey, any>[];
  /** localStorage prefix used to persist visible-filter selections. */
  storageKey: string;
  /** Which filter keys are visible by default (falls back to all keys). */
  defaultVisibleKeys?: readonly TKey[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function loadVisibleKeys<TKey extends string>(
  storageKey: string,
  allKeys: readonly TKey[],
  defaults: readonly TKey[],
): TKey[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown[];
      if (Array.isArray(parsed)) {
        const valid = parsed.filter((k): k is TKey =>
          allKeys.includes(k as TKey),
        );
        if (valid.length > 0) return valid;
      }
    }
  } catch {
    /* ignore */
  }
  return [...defaults] as TKey[];
}

function buildSearchParams<TKey extends string>(
  values: Record<TKey, unknown>,
  fields: FilterField<TKey>[],
): URLSearchParams {
  const p = new URLSearchParams();
  const isBlankValue = (s: string) => !s || s === "undefined" || s === "null";
  for (const field of fields) {
    const v = values[field.filterKey];
    if (field.toUrlParams) {
      for (const [pk, pv] of Object.entries(field.toUrlParams(v))) {
        if (pv != null && !isBlankValue(pv)) p.set(pk, pv);
      }
    } else {
      const str = v != null ? String(v) : "";
      if (!isBlankValue(str) && str !== String(field.defaultValue ?? "")) {
        p.set(field.filterKey, str);
      }
    }
  }
  return p;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useFilters<TKey extends string>({
  fields,
  storageKey,
  defaultVisibleKeys = [],
}: UseFiltersOptions<TKey>) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Always keep the latest fields reference without triggering state resets
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;

  const allKeys = fields.map((f) => f.filterKey) as TKey[];

  // –– Filter values: initialised once from URL params (or field defaults) ──
  const [filterValues, setFilterValues] = useState<Record<TKey, unknown>>(
    () => {
      const init = {} as Record<TKey, unknown>;
      for (const f of fields) {
        init[f.filterKey] = f.fromUrlParams
          ? f.fromUrlParams(searchParams)
          : (searchParams.get(f.filterKey) ?? f.defaultValue);
      }
      return init;
    },
  );

  // –– Visible filter keys: persisted in localStorage ────────────────────
  const [visibleFilterKeys, setVisibleFilterKeys] = useState<TKey[]>(() =>
    loadVisibleKeys(`${storageKey}-vis`, allKeys, defaultVisibleKeys),
  );

  const saveVisibleKeys = useCallback(
    (keys: TKey[]) => {
      localStorage.setItem(`${storageKey}-vis`, JSON.stringify(keys));
    },
    [storageKey],
  );

  // –– URL sync ──────────────────────────────────────────────────────────
  const syncUrl = useCallback(
    (values: Record<TKey, unknown>) => {
      setSearchParams(buildSearchParams(values, fieldsRef.current), {
        replace: true,
      });
    },
    [setSearchParams],
  );

  // –– Public API ────────────────────────────────────────────────────────

  /** Update a single filter field value and synchronise the URL. */
  const setFilterValue = useCallback(
    (key: TKey, value: unknown) => {
      setFilterValues((prev) => {
        const next = { ...prev, [key]: value };
        syncUrl(next);
        return next;
      });
    },
    [syncUrl],
  );

  /** Reset all filters to their `defaultValue` and clear URL params. */
  const resetFilters = useCallback(() => {
    const defaults = {} as Record<TKey, unknown>;
    for (const f of fieldsRef.current) {
      defaults[f.filterKey] = f.defaultValue;
    }
    setFilterValues(defaults);
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  // –– Filter bar (only visible fields, custom-rendered) ─────────────────
  const filterBar = (
    <Flex wrap gap={16}>
      {fields
        .filter((f) => visibleFilterKeys.includes(f.filterKey))
        .map((field) => {
          return (
            <div key={field.filterKey}>
              {field.render(filterValues[field.filterKey], (v: unknown) =>
                setFilterValue(field.filterKey, v),
              )}
            </div>
          );
        })}
    </Flex>
  );

  // –– Filter toolbox popover ────────────────────────────────────────────
  const toolboxContent = (
    <div style={{ width: 400 }}>
      <div style={{ marginBottom: 8, fontWeight: 600 }}>Bộ lọc hiển thị</div>
      <Checkbox.Group
        value={visibleFilterKeys}
        onChange={(checked) => {
          const next = checked as TKey[];
          setVisibleFilterKeys(next);
          saveVisibleKeys(next);
        }}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "4px 0",
        }}
      >
        {visibleFilterKeys.map((key) => {
          const field = fields.find((f) => f.filterKey === key);
          if (!field) return null;
          return (
            <Checkbox key={field.filterKey} value={field.filterKey}>
              {field.label}
            </Checkbox>
          );
        })}
      </Checkbox.Group>
      <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button
          size="small"
          onClick={() => {
            setVisibleFilterKeys([...allKeys]);
            saveVisibleKeys([...allKeys]);
          }}
        >
          Tất cả
        </Button>
        <Button
          size="small"
          onClick={() => {
            const def = [...defaultVisibleKeys] as TKey[];
            setVisibleFilterKeys(def);
            saveVisibleKeys(def);
          }}
        >
          Mặc định
        </Button>
        <Button size="small" danger onClick={resetFilters}>
          Xoá bộ lọc
        </Button>
      </div>
    </div>
  );

  const filterToolbox = (
    <Popover content={toolboxContent} trigger="click" placement="bottomRight">
      <Button icon={<FilterOutlined />}>Bộ lọc</Button>
    </Popover>
  );

  return {
    filterValues,
    setFilterValue,
    resetFilters,
    visibleFilterKeys,
    filterBar,
    filterToolbox,
  };
}
