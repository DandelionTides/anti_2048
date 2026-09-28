/** Keep Lua floating-point values from rendering as labels such as "1.0". */
export function integerText(value: number): string {
  return `${Math.floor(value)}`;
}
