import { fetchAdminApi } from '../api/adminApi';
import { Category, Role } from '../types/admin';

// ─── Session Reference Data Cache ─────────────────────────────────────────────
// Caches categories, roles, and settings in memory for the admin session to prevent
// redundant refetches on every route/view navigation.

interface ReferenceCache {
  categories: Category[] | null;
  categoriesFetchedAt: number;
  roles: Role[] | null;
  rolesFetchedAt: number;
}

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes session TTL

const _refCache: ReferenceCache = {
  categories: null,
  categoriesFetchedAt: 0,
  roles: null,
  rolesFetchedAt: 0,
};

/**
 * Gets categories from session cache or fetches from API if not yet loaded or expired.
 */
export async function getCachedCategories(forceRefresh = false): Promise<Category[]> {
  const isFresh =
    !forceRefresh &&
    _refCache.categories &&
    Date.now() - _refCache.categoriesFetchedAt < CACHE_TTL_MS;

  if (isFresh) {
    return _refCache.categories!;
  }

  try {
    const res = await fetchAdminApi<any>('/categories');
    let list: Category[] = [];
    if (res?.success !== false) {
      list = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.categories)
        ? res.categories
        : Array.isArray(res)
        ? res
        : [];
    }
    _refCache.categories = list;
    _refCache.categoriesFetchedAt = Date.now();
    return list;
  } catch {
    return _refCache.categories || [];
  }
}

/**
 * Gets roles from session cache or fetches from API if not yet loaded or expired.
 */
export async function getCachedRoles(forceRefresh = false): Promise<Role[]> {
  const isFresh =
    !forceRefresh &&
    _refCache.roles &&
    Date.now() - _refCache.rolesFetchedAt < CACHE_TTL_MS;

  if (isFresh) {
    return _refCache.roles!;
  }

  try {
    const res = await fetchAdminApi<any>('/roles');
    let list: Role[] = [];
    if (res?.success !== false) {
      list = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.roles)
        ? res.roles
        : Array.isArray(res)
        ? res
        : [];
    }
    _refCache.roles = list;
    _refCache.rolesFetchedAt = Date.now();
    return list;
  } catch {
    return _refCache.roles || [];
  }
}

/**
 * Invalidate cached reference data (e.g. after adding a new category or role).
 */
export function invalidateReferenceCache(type?: 'categories' | 'roles') {
  if (!type || type === 'categories') {
    _refCache.categories = null;
    _refCache.categoriesFetchedAt = 0;
  }
  if (!type || type === 'roles') {
    _refCache.roles = null;
    _refCache.rolesFetchedAt = 0;
  }
}
