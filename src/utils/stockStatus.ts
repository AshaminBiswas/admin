export type StockStatusType = 'OUT_OF_STOCK' | 'LOW_STOCK' | 'IN_STOCK';

export interface StockStatusResult {
  status: StockStatusType;
  label: string;
  isLowStock: boolean;
  isOutOfStock: boolean;
  isInStock: boolean;
  badgeClass: string;
}

/**
 * Single source of truth for computing product/branch stock status.
 *
 * @param quantity Physical available quantity
 * @param reorderLevel Reorder threshold (defaults to 10 if not configured)
 */
export function getStockStatus(quantity: number, reorderLevel?: number | null): StockStatusResult {
  const threshold =
    reorderLevel !== undefined && reorderLevel !== null && !isNaN(Number(reorderLevel))
      ? Number(reorderLevel)
      : 10;
  const qty = Number(quantity) || 0;

  if (qty <= 0) {
    return {
      status: 'OUT_OF_STOCK',
      label: 'Out of Stock',
      isLowStock: false,
      isOutOfStock: true,
      isInStock: false,
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/40',
    };
  }

  if (qty <= threshold) {
    return {
      status: 'LOW_STOCK',
      label: 'Low Stock',
      isLowStock: true,
      isOutOfStock: false,
      isInStock: false,
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40',
    };
  }

  return {
    status: 'IN_STOCK',
    label: 'In Stock',
    isLowStock: false,
    isOutOfStock: false,
    isInStock: true,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40',
  };
}
