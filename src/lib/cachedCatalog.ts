import { unstable_cache } from "next/cache";
import { listBanners, listCategories, listExpressAreas, type Category } from "@/lib/endpoints";
import type { Area, Banner } from "@/types";

// Server-side cached loaders for the slow-changing parts of the storefront.
//
// Categories and banners change when an admin edits them, a few times a week
// at most, yet every storefront page view was fetching them again: the home
// page alone made three API calls per visitor, two of them for data that had
// not changed. Sharing one cached copy across requests leaves only the product
// list - the part that is genuinely live - as a per-request call.
//
// Prices and stock are deliberately NOT cached here. Only navigation chrome is.
//
// Trade-off: an admin's category or banner edit can take up to REVALIDATE
// seconds to appear on the storefront.
const REVALIDATE_SECONDS = 60;

// The cached functions throw on failure rather than returning a fallback:
// unstable_cache stores whatever is returned, so swallowing the error inside
// would cache an empty list and blank the navigation for the whole window
// after one failed request. The wrappers below catch instead, which leaves
// nothing cached and lets the next request try again.
const categoriesCached = unstable_cache(
  async (): Promise<Category[]> => (await listCategories()).categories ?? [],
  ["storefront-categories"],
  { revalidate: REVALIDATE_SECONDS, tags: ["categories"] },
);

const bannersCached = unstable_cache(
  async (): Promise<Banner[]> => (await listBanners()).banners ?? [],
  ["storefront-banners"],
  { revalidate: REVALIDATE_SECONDS, tags: ["banners"] },
);

const expressAreasCached = unstable_cache(
  async (): Promise<Area[]> => (await listExpressAreas()).areas ?? [],
  ["storefront-express-areas"],
  { revalidate: REVALIDATE_SECONDS, tags: ["areas"] },
);

/** Serviceable express areas, or null when the API is unreachable. */
export async function getCachedExpressAreas(): Promise<Area[] | null> {
  try {
    return await expressAreasCached();
  } catch {
    return null;
  }
}

/**
 * Whether 24-hour delivery covers anywhere at all. Decided on the server so the
 * home page's express banner is in the first paint: fetched on the client it
 * appeared a moment later and pushed the whole product grid down (measured as
 * a 0.05 layout shift on a throttled phone).
 */
export async function getCachedExpressAvailable(): Promise<boolean> {
  try {
    return (await expressAreasCached()).length > 0;
  } catch {
    return false;
  }
}

/** Active categories in admin sort order. Empty when the API is unreachable. */
export async function getCachedCategories(): Promise<Category[]> {
  try {
    return await categoriesCached();
  } catch {
    return [];
  }
}

/** Active promo banners. Empty when the API is unreachable. */
export async function getCachedBanners(): Promise<Banner[]> {
  try {
    return await bannersCached();
  } catch {
    return [];
  }
}
