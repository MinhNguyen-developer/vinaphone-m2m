import { useCallback } from "react";
import type { RcFile } from "antd/es/upload";

interface UseUploadCsvOptions {
  onParsed(rows: string[]): void;
  parser?: (raw: string) => string[];
  autoUpload?: boolean;
}

export const parseBulkImsis = (raw: string): string[] =>
  raw
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

export const useUploadCsv = ({
  onParsed,
  parser = parseBulkImsis,
  autoUpload = false,
}: UseUploadCsvOptions) =>
  useCallback(
    (file: RcFile): boolean => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = (event.target?.result as string) ?? "";
        onParsed(parser(text));
      };
      reader.readAsText(file);
      return autoUpload;
    },
    [autoUpload, onParsed, parser],
  );

export default useUploadCsv;
