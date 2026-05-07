import { type TablePaginationConfig } from "antd";
import React from "react";

interface UsePaginationParams extends Omit<TablePaginationConfig, "locale"> {}

export default function usePagination({
  pageSizeOptions = ["10", "20", "50", "100"],
  showSizeChanger = true,
  ...rest
}: UsePaginationParams) {
  return React.useState<TablePaginationConfig>(() => ({
    ...rest,
    pageSizeOptions,
    showSizeChanger,
    locale: {
      items_per_page: "/ trang",
      jump_to: "Đi đến",
      jump_to_confirm: "Xác nhận",
      page: "Trang",
      next_3: "Trang tiếp theo 3",
      next_5: "Trang tiếp theo 5",
      next_10: "Trang tiếp theo 10",
      prev_3: "Trang trước 3",
      prev_5: "Trang trước 5",
      prev_10: "Trang trước 10",
      next_page: "Trang tiếp theo",
      prev_page: "Trang trước",
      page_size: "Số dòng mỗi trang",
    },
  }));
}
