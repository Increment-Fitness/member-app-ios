// Barcode -> nutrition lookup with a two-tier cache:
//   1. in-memory (instant for repeat scans this session)
//   2. shared Supabase `barcode_products` table (instant across users/devices)
//   3. Open Food Facts network lookup (only on a true first-ever scan), whose
//      result then backfills both caches.
// Free/public/keyless source; failures resolve to `{ found: false }` so the
// caller can fall back to manual entry.
import { supabase } from "./client";

const OFF_BASE = "https://world.openfoodfacts.org/api/v2/product";
const OFF_FIELDS = "product_name,brands,serving_size,nutriments";
const USER_AGENT = "IncrementApp/1.0 (member-app-ios)";

const MISS = {
  found: false,
  title: null,
  macros: { PROTEIN: 0, CARBS: 0, FAT: 0 },
  basis: null,
  servingSize: null,
};

// Session cache of found products, keyed by barcode.
const memCache = new Map();

/** Test seam: clears the in-memory cache. */
export function _resetMemCache() {
  memCache.clear();
}

/**
 * Picks a macro value, preferring the per-serving figure over per-100g.
 *
 * @param {object} nutriments Open Food Facts `product.nutriments`.
 * @param {string} key e.g. "proteins", "carbohydrates", "fat".
 * @returns {{ value: number, basis: "serving"|"100g"|null }}
 */
function pickMacro(nutriments, key) {
  const serving = nutriments[`${key}_serving`];
  const per100 = nutriments[`${key}_100g`];
  if (serving !== undefined && serving !== "" && Number.isFinite(Number(serving))) {
    return { value: Number(serving), basis: "serving" };
  }
  if (per100 !== undefined && per100 !== "" && Number.isFinite(Number(per100))) {
    return { value: Number(per100), basis: "100g" };
  }
  return { value: 0, basis: null };
}

/**
 * Parses an Open Food Facts v2 product response into the app's shape.
 *
 * @param {object} json Parsed response body.
 * @returns {typeof MISS}
 */
export function parseProduct(json) {
  if (!json || json.status !== 1 || !json.product) {
    return MISS;
  }
  const product = json.product;
  const nutriments = product.nutriments || {};
  const protein = pickMacro(nutriments, "proteins");
  const carbs = pickMacro(nutriments, "carbohydrates");
  const fat = pickMacro(nutriments, "fat");

  const name = (product.product_name || "").trim();
  const brand = (product.brands || "").split(",")[0].trim();

  return {
    found: true,
    title: name || brand || null,
    macros: {
      PROTEIN: Math.max(0, Math.round(protein.value)),
      CARBS: Math.max(0, Math.round(carbs.value)),
      FAT: Math.max(0, Math.round(fat.value)),
    },
    basis: protein.basis || carbs.basis || fat.basis,
    servingSize: product.serving_size || null,
  };
}

/**
 * Maps a `barcode_products` row to a lookup result.
 *
 * @param {object|null} row
 * @returns {typeof MISS|null} Null when there is no row.
 */
export function cacheRowToResult(row) {
  if (!row) {
    return null;
  }
  return {
    found: true,
    title: row.title ?? null,
    macros: {
      PROTEIN: Number(row.protein_g) || 0,
      CARBS: Number(row.carbs_g) || 0,
      FAT: Number(row.fat_g) || 0,
    },
    basis: row.basis ?? null,
    servingSize: row.serving_size ?? null,
  };
}

async function readServerCache(barcode) {
  try {
    const { data, error } = await supabase
      .from("barcode_products")
      .select("*")
      .eq("barcode", barcode)
      .maybeSingle();
    if (error) {
      return null;
    }
    return cacheRowToResult(data);
  } catch {
    return null;
  }
}

async function writeServerCache(barcode, result) {
  try {
    await supabase.from("barcode_products").upsert({
      barcode,
      title: result.title,
      protein_g: result.macros.PROTEIN,
      carbs_g: result.macros.CARBS,
      fat_g: result.macros.FAT,
      basis: result.basis,
      serving_size: result.servingSize,
    });
  } catch {
    // Cache writes are best-effort.
  }
}

async function fetchFromOpenFoodFacts(barcode) {
  try {
    const res = await fetch(`${OFF_BASE}/${encodeURIComponent(barcode)}.json?fields=${OFF_FIELDS}`, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) {
      return MISS;
    }
    return parseProduct(await res.json());
  } catch {
    return MISS;
  }
}

/**
 * Looks up a barcode through the cache tiers, backfilling on a network hit.
 *
 * @param {string} barcode
 * @returns {Promise<typeof MISS>}
 */
export async function lookupBarcode(barcode) {
  if (memCache.has(barcode)) {
    return memCache.get(barcode);
  }

  const cached = await readServerCache(barcode);
  if (cached && cached.found) {
    memCache.set(barcode, cached);
    return cached;
  }

  const result = await fetchFromOpenFoodFacts(barcode);
  if (result.found) {
    memCache.set(barcode, result);
    writeServerCache(barcode, result); // fire-and-forget backfill
  }
  return result;
}
