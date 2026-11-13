import { asCents, asString, asVersion, field } from "@/lib/square/plain";

export type MappedCategory = {
  id: string;
  name: string;
  version: string | null;
};

export type MappedImage = {
  id: string;
  url: string | null;
};

export type MappedVariation = {
  id: string;
  itemId: string;
  name: string;
  sku: string | null;
  gtin: string | null;
  priceAmount: number | null;
  currency: string;
  pricingType: string;
  trackInventory: boolean;
  sellable: boolean;
  isArchived: boolean;
  version: string | null;
  ordinal: number;
  squareUpdatedAt: string | null;
};

export type MappedItem = {
  id: string;
  name: string;
  description: string;
  categoryId: string | null;
  imageIds: string[];
  isArchived: boolean;
  productType: string | null;
  version: string | null;
  squareUpdatedAt: string | null;
  variations: MappedVariation[];
};

export type MappedLocation = {
  id: string;
  name: string;
  status: string | null;
  address: string | null;
  timezone: string | null;
  currency: string | null;
};

export type MappedCount = {
  variationId: string;
  locationId: string;
  state: string;
  quantity: string;
  calculatedAt: string | null;
};

export function mapCatalogObjects(objects: unknown[]) {
  const optionValues = indexOptionValues(objects);
  const categories: MappedCategory[] = [];
  const images: MappedImage[] = [];
  const items: MappedItem[] = [];
  const looseVariations: MappedVariation[] = [];

  for (const object of objects) {
    if (field<boolean>(object, "isDeleted", "is_deleted")) continue;
    const type = String(field(object, "type", "type") ?? "");
    const id = asString(field(object, "id", "id"));
    if (!id) continue;

    if (type === "CATEGORY") {
      const data = field(object, "categoryData", "category_data");
      categories.push({
        id,
        name: asString(field(data, "name", "name")) ?? "Untitled category",
        version: asVersion(field(object, "version", "version")),
      });
    } else if (type === "IMAGE") {
      const data = field(object, "imageData", "image_data");
      images.push({ id, url: asString(field(data, "url", "url")) });
    } else if (type === "ITEM") {
      items.push(mapItem(object, id, optionValues));
    } else if (type === "ITEM_VARIATION") {
      const variation = mapVariation(object, id, null, optionValues);
      if (variation) looseVariations.push(variation);
    }
  }

  const known = new Set(items.flatMap((item) => item.variations.map((variation) => variation.id)));
  for (const variation of looseVariations) {
    if (known.has(variation.id)) continue;
    const parent = items.find((item) => item.id === variation.itemId);
    if (parent) parent.variations.push(variation);
  }

  return { categories, images, items };
}

function indexOptionValues(objects: unknown[]) {
  const values = new Map<string, string>();
  for (const object of objects) {
    const type = String(field(object, "type", "type") ?? "");
    if (type === "ITEM_OPTION") {
      const data = field(object, "itemOptionData", "item_option_data") ?? {};
      for (const value of field<unknown[]>(data, "values", "values") ?? []) rememberOptionValue(values, value);
    } else if (type === "ITEM_OPTION_VAL") {
      rememberOptionValue(values, object);
    }
  }
  return values;
}

function rememberOptionValue(values: Map<string, string>, object: unknown) {
  const id = asString(field(object, "id", "id"));
  const data = field(object, "itemOptionValueData", "item_option_value_data") ?? {};
  const name = asString(field(data, "name", "name"));
  if (id && name) values.set(id, name);
}

function optionNames(data: unknown, optionValues: Map<string, string>) {
  const refs = field<unknown[]>(data, "itemOptionValues", "item_option_values") ?? [];
  const names: string[] = [];
  for (const ref of refs) {
    const id = asString(field(ref, "itemOptionValueId", "item_option_value_id"));
    const name = id ? optionValues.get(id) : null;
    if (name && !names.some((existing) => existing.toLowerCase() === name.toLowerCase())) names.push(name);
  }
  return names;
}

function variationName(squareName: string, options: string[]) {
  const generic = !squareName || /^(regular|default|variation|standard)$/i.test(squareName);
  if (!options.length) return squareName || "Default";
  if (generic) return options.join(" / ");
  const missing = options.filter((option) => !squareName.toLowerCase().includes(option.toLowerCase()));
  return missing.length ? `${squareName} / ${missing.join(" / ")}` : squareName;
}

function mapItem(object: unknown, id: string, optionValues: Map<string, string>): MappedItem {
  const data = field(object, "itemData", "item_data") ?? {};
  const categories = field<{ id?: string }[]>(data, "categories", "categories") ?? [];
  const reporting = field<{ id?: string }>(data, "reportingCategory", "reporting_category");
  const categoryId =
    asString(reporting?.id) ??
    asString(categories[0]?.id) ??
    asString(field(data, "categoryId", "category_id"));
  const nested = field<unknown[]>(data, "variations", "variations") ?? [];
  return {
    id,
    name: asString(field(data, "name", "name")) ?? "Untitled item",
    description: asString(field(data, "description", "description")) ?? "",
    categoryId,
    imageIds: (field<string[]>(data, "imageIds", "image_ids") ?? []).filter((imageId) => typeof imageId === "string"),
    isArchived: Boolean(field(data, "isArchived", "is_archived")),
    productType: asString(field(data, "productType", "product_type")),
    version: asVersion(field(object, "version", "version")),
    squareUpdatedAt: asString(field(object, "updatedAt", "updated_at")),
    variations: nested
      .map((variation) => {
        const variationId = asString(field(variation, "id", "id"));
        return variationId ? mapVariation(variation, variationId, id, optionValues) : null;
      })
      .filter((variation): variation is MappedVariation => Boolean(variation)),
  };
}

function mapVariation(
  object: unknown,
  id: string,
  parentId: string | null,
  optionValues: Map<string, string>,
): MappedVariation | null {
  const data = field(object, "itemVariationData", "item_variation_data") ?? {};
  const itemId = asString(field(data, "itemId", "item_id")) ?? parentId;
  if (!itemId) return null;
  const price = field(data, "priceMoney", "price_money");
  const gtin = asString(field(data, "gtin", "gtin")) ?? asString(field(data, "upc", "upc"));
  const squareName = asString(field(data, "name", "name")) ?? "";
  return {
    id,
    itemId,
    name: variationName(squareName, optionNames(data, optionValues)),
    sku: asString(field(data, "sku", "sku")),
    gtin,
    priceAmount: asCents(field(price, "amount", "amount")),
    currency: asString(field(price, "currency", "currency")) ?? "USD",
    pricingType: asString(field(data, "pricingType", "pricing_type")) ?? "FIXED_PRICING",
    trackInventory: Boolean(field(data, "trackInventory", "track_inventory")),
    sellable: field(data, "sellable", "sellable") !== false,
    isArchived: Boolean(field(object, "isDeleted", "is_deleted")),
    version: asVersion(field(object, "version", "version")),
    ordinal: Number(field(data, "ordinal", "ordinal") ?? 0) || 0,
    squareUpdatedAt: asString(field(object, "updatedAt", "updated_at")),
  };
}

export function mapLocation(object: unknown): MappedLocation | null {
  const id = asString(field(object, "id", "id"));
  if (!id) return null;
  const address = field(object, "address", "address");
  const parts = [
    field(address, "addressLine1", "address_line_1"),
    field(address, "locality", "locality"),
    field(address, "administrativeDistrictLevel1", "administrative_district_level_1"),
  ]
    .map((part) => asString(part))
    .filter(Boolean);
  return {
    id,
    name: asString(field(object, "name", "name")) ?? "Location",
    status: asString(field(object, "status", "status")),
    address: parts.length ? parts.join(", ") : null,
    timezone: asString(field(object, "timezone", "timezone")),
    currency: asString(field(object, "currency", "currency")),
  };
}

export function mapCount(object: unknown): MappedCount | null {
  const variationId = asString(field(object, "catalogObjectId", "catalog_object_id"));
  const locationId = asString(field(object, "locationId", "location_id"));
  if (!variationId || !locationId) return null;
  return {
    variationId,
    locationId,
    state: asString(field(object, "state", "state")) ?? "IN_STOCK",
    quantity: asString(field(object, "quantity", "quantity")) ?? "0",
    calculatedAt: asString(field(object, "calculatedAt", "calculated_at")),
  };
}

export function imageUrlFor(item: MappedItem, images: MappedImage[]) {
  for (const imageId of item.imageIds) {
    const match = images.find((image) => image.id === imageId && image.url);
    if (match?.url) return match.url;
  }
  return null;
}
