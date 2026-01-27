export const isHexadecimal = (str: string): boolean => {
  const HEX_RE = /^[0-9a-fA-F]+$/;
  const result = HEX_RE.test(str);
  return result;
};
