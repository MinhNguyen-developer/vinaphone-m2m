import { isNullOrUndefined } from "./common";

export default function formatNumber(num: number | null | undefined): string {
  if (isNullOrUndefined(num)) return "0";
  const formatter = new Intl.NumberFormat("en-US");
  return formatter.format(num);
}
