export const isNullOrUndefined = (value: any): value is null | undefined => {
  return value === null || value === undefined;
};
