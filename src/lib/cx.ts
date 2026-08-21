type ClassValue = string | false | null | undefined;

/** 条件付きクラス名の連結。依存を増やさないための最小実装。 */
export function cx(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
