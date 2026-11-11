export type CategoryFocus = {
  enabled: boolean;
  names: string[];
};

export const CATEGORY_FOCUS_KEY = "categoryFocus";

export function categoryLabel(categoryName: string | null | undefined) {
  return categoryName?.trim() ? categoryName : "Uncategorized";
}

export function applyCategoryFocus<T extends { categoryName: string | null }>(rows: T[], focus: CategoryFocus) {
  if (!focus.enabled || focus.names.length === 0) return rows;
  const allowed = new Set(focus.names);
  return rows.filter((row) => allowed.has(categoryLabel(row.categoryName)));
}
