import React, { useCallback, useRef, useState } from "react";
import { Select, Spin } from "antd";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { SelectProps } from "antd/es/select";

const DEFAULT_PAGE_SIZE = 20;
// Scroll threshold (px) before the bottom to trigger next page load
const SCROLL_THRESHOLD = 60;

// ── Public types ─────────────────────────────────────────────────────────────

export interface ServerSelectFetchParams {
  search: string;
  page: number;
  pageSize: number;
}

export interface ServerSelectFetchResult<T> {
  data: T[];
  total: number;
}

export interface ServerSelectProps<T> extends Omit<
  SelectProps,
  "options" | "onSearch" | "filterOption" | "loading" | "searchValue"
> {
  /**
   * Stable React Query cache key. Include any external deps that
   * should invalidate the list (e.g. a parent filter value).
   */
  queryKey: readonly unknown[];
  /** Called on each page load. Must return `{ data, total }`. */
  fetchFn: (
    params: ServerSelectFetchParams,
  ) => Promise<ServerSelectFetchResult<T>>;
  /** Extract the option value string or number from a data item. */
  getOptionValue: (item: T) => string | number;
  /** Extract the option label (ReactNode) from a data item. */
  getOptionLabel: (item: T) => React.ReactNode;
  /** Debounce delay in ms (default 400). */
  debounceMs?: number;
  /** Items per page (default 20). */
  pageSize?: number;
}

// ── Component ────────────────────────────────────────────────────────────────

export function ServerSelect<T>({
  queryKey,
  fetchFn,
  getOptionValue,
  getOptionLabel,
  debounceMs = 400,
  pageSize = DEFAULT_PAGE_SIZE,
  ...rest
}: ServerSelectProps<T>) {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback(
    (value: string) => {
      setSearchInput(value);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        setDebouncedSearch(value);
      }, debounceMs);
    },
    [debounceMs],
  );

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: [...queryKey, debouncedSearch],
      queryFn: ({ pageParam }) =>
        fetchFn({
          search: debouncedSearch,
          page: pageParam as number,
          pageSize,
        }),
      initialPageParam: 1,
      getNextPageParam: (lastPage, allPages) => {
        const loaded = allPages.reduce((sum, p) => sum + p.data.length, 0);
        return loaded < lastPage.total ? allPages.length + 1 : undefined;
      },
    });

  const options =
    data?.pages.flatMap((page) =>
      page.data.map((item) => ({
        value: getOptionValue(item),
        label: getOptionLabel(item),
      })),
    ) ?? [];

  const handlePopupScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      if (
        scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD &&
        hasNextPage &&
        !isFetchingNextPage
      ) {
        void fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  return (
    <Select
      showSearch
      filterOption={false}
      searchValue={searchInput}
      onSearch={handleSearch}
      options={options}
      loading={isLoading}
      onPopupScroll={handlePopupScroll}
      notFoundContent={
        isLoading || isFetchingNextPage ? (
          <Spin
            size="small"
            style={{ display: "block", textAlign: "center", padding: 8 }}
          />
        ) : undefined
      }
      dropdownRender={(menu) => (
        <>
          {menu}
          {isFetchingNextPage && (
            <div style={{ textAlign: "center", padding: "6px 0" }}>
              <Spin size="small" />
            </div>
          )}
        </>
      )}
      {...rest}
    />
  );
}
