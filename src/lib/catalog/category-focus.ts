export type CategoryFocus = {
  enabled: boolean;
  names: string[];
};

export const CATEGORY_FOCUS_KEY = "categoryFocus";

export function categoryLabel(categoryName: string | null | undefined) {
  return categoryName?.trim() ? categoryName.trim() : "Uncategorized";
}

function normalizeCategoryName(name: string) {
  return categoryLabel(name).toLocaleLowerCase();
}

export function categoryNameMatches(focusName: string, categoryName: string | null | undefined) {
  return normalizeCategoryName(focusName) === normalizeCategoryName(categoryLabel(categoryName));
}

export function applyCategoryFocus<T extends { categoryName: string | null }>(rows: T[], focus: CategoryFocus) {
  if (!focus.enabled || focus.names.length === 0) return rows;
  const allowed = new Set(focus.names.map((name) => normalizeCategoryName(name)));
  return rows.filter((row) => allowed.has(normalizeCategoryName(categoryLabel(row.categoryName))));
}

/** Pick the canonical spelling from the catalog when saving focus names. */
export function resolveCategoryFocusNames(requested: string[], catalogCategories: string[]) {
  const byKey = new Map(catalogCategories.map((name) => [normalizeCategoryName(name), name]));
  return [...new Set(requested.map((name) => byKey.get(normalizeCategoryName(name)) ?? categoryLabel(name)).filter(Boolean))];
}
