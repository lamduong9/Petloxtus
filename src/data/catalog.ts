import { env } from "cloudflare:workers";
import { getEmDashCollection, getEmDashEntry } from "emdash";
import type { PortableTextBlock } from "emdash";
import type { Product } from "../../emdash-env";
import seedData from "../../seed/seed.json";

export interface CatalogProduct {
  id: string;
  slug: string;
  title: string;
  category: string;
  featured: boolean;
  sortOrder: number;
  moq: string;
  specs: string[];
  shortDescription: string;
  description: PortableTextBlock[];
  primaryImage: string;
  gallery: string[];
}

export const CATEGORY_ORDER = [
  "Wood",
  "Cat Tree",
  "Bed",
  "Clothing",
  "Metal Cage",
  "Silicone",
  "Toys",
  "Reed And Water Hyacinth",
  "Plastic",
] as const;

function normalizeRawProduct(
  slug: string,
  data: Partial<Product> & { title: string; category?: string }
): CatalogProduct {
  const uploadedSrc = data.featured_image?.src || "";
  const staticSrc = data.image_url || "/assets/hero-showcase.webp";
  const primaryImage = uploadedSrc || staticSrc;

  const rawGallery = (data.gallery_urls || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const gallery = uploadedSrc
    ? [uploadedSrc, ...rawGallery.filter((g) => g !== uploadedSrc)]
    : rawGallery.length > 0
      ? rawGallery
      : [primaryImage];

  const specs = (data.specs || "Made in Vietnam, OEM/ODM Custom, Non-Toxic Pet-Safe")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);

  return {
    id: data.id || slug,
    slug,
    title: data.title,
    category: data.category || "Wood",
    featured: Boolean(data.featured),
    sortOrder: typeof data.sort_order === "number" ? data.sort_order : 999,
    moq: data.moq || "Low MOQ (1,000 PCS) • Custom FOB/CIF",
    specs,
    shortDescription: data.short_description || "",
    description: Array.isArray(data.description) ? (data.description as PortableTextBlock[]) : [],
    primaryImage,
    gallery,
  };
}

function getSeedFallbackProducts(): CatalogProduct[] {
  const seeded = (seedData as unknown as {
    content?: {
      products?: Array<{
        id: string;
        slug: string;
        data: Partial<Product> & { title: string; category?: string };
      }>;
    };
  }).content?.products;

  if (!Array.isArray(seeded)) return [];
  return seeded
    .map((item) => normalizeRawProduct(item.slug, { ...item.data, id: item.id }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
}

export function getSeedFallbackPage(slug: string): { title: string; content: PortableTextBlock[] } | null {
  const seededPages = (seedData as unknown as {
    content?: {
      pages?: Array<{
        slug: string;
        data: { title: string; content: PortableTextBlock[] };
      }>;
    };
  }).content?.pages;

  const found = seededPages?.find((p) => p.slug === slug);
  return found ? found.data : null;
}

export async function loadAllProducts() {
  const { entries, cacheHint } = await getEmDashCollection("products", {
    status: "published",
    limit: 200,
  });

  if (entries && entries.length > 0) {
    const products = entries
      .map((e) => normalizeRawProduct(e.id, e.data))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
    return { products, cacheHint, source: "cms" as const };
  }

  return {
    products: getSeedFallbackProducts(),
    cacheHint,
    source: "seed-fallback" as const,
  };
}

export async function loadProductBySlug(slug: string) {
  const { entry, cacheHint } = await getEmDashEntry("products", slug);
  if (entry) {
    return {
      product: normalizeRawProduct(entry.id, entry.data),
      entry,
      cacheHint,
    };
  }

  const fallback = getSeedFallbackProducts().find((p) => p.slug === slug) ?? null;
  return {
    product: fallback,
    entry: null,
    cacheHint,
  };
}

export function getCategoryCounts(products: CatalogProduct[]) {
  const counts = new Map<string, number>();
  for (const p of products) {
    counts.set(p.category, (counts.get(p.category) || 0) + 1);
  }
  const ordered: { name: string; count: number }[] = [];
  for (const name of CATEGORY_ORDER) {
    const c = counts.get(name);
    if (c) {
      ordered.push({ name, count: c });
      counts.delete(name);
    }
  }
  for (const [name, count] of counts.entries()) {
    ordered.push({ name, count });
  }
  return ordered;
}

export function resolveWebhookUrl(_locals?: App.Locals): string {
  const cfEnv = env as unknown as Record<string, string | undefined>;
  return cfEnv?.PUBLIC_LEAD_WEBHOOK_URL || import.meta.env.PUBLIC_LEAD_WEBHOOK_URL || "";
}
