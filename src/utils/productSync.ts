/**
 * Real-time Product Synchronization Utility
 * Broadcasts product changes across Admin and Storefront (Frontend) windows/tabs.
 */

export function syncProductUpdate(updatedProduct: any, type: "UPDATE" | "CREATE" | "DELETE" = "UPDATE") {
  try {
    const listKey = "prc_admin_products_list";
    const sharedKey = "prc_shared_products_list";

    let list: any[] = [];
    const cached = localStorage.getItem(sharedKey) || localStorage.getItem(listKey);
    if (cached) {
      try {
        list = JSON.parse(cached);
      } catch {
        list = [];
      }
    }

    const prodIdStr = updatedProduct && updatedProduct.id !== undefined ? String(updatedProduct.id) : String(updatedProduct);
    const prodSkuStr = updatedProduct && updatedProduct.sku ? String(updatedProduct.sku).trim().toLowerCase() : null;

    const findIndexMatch = (p: any) => {
      if (!p) return false;
      const pIdStr = p.id !== undefined ? String(p.id) : (p.apiId ? String(p.apiId) : null);
      if (pIdStr && pIdStr === prodIdStr) return true;
      if (p.apiId && String(p.apiId) === prodIdStr) return true;
      const pSkuStr = p.sku ? String(p.sku).trim().toLowerCase() : null;
      if (prodSkuStr && pSkuStr && prodSkuStr === pSkuStr) return true;
      return false;
    };

    if (type === "DELETE") {
      list = list.filter((p: any) => !findIndexMatch(p));
    } else if (type === "CREATE") {
      const idx = list.findIndex(findIndexMatch);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updatedProduct };
      } else {
        list.unshift(updatedProduct);
      }
    } else {
      // UPDATE
      const idx = list.findIndex(findIndexMatch);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updatedProduct };
      } else {
        list.unshift(updatedProduct);
      }
    }

    localStorage.setItem(listKey, JSON.stringify(list));
    localStorage.setItem(sharedKey, JSON.stringify(list));
    localStorage.setItem("prc_product_sync_timestamp", String(Date.now()));

    // Broadcast across browser tabs and windows
    if ("BroadcastChannel" in window) {
      const channel = new BroadcastChannel("prc_products_channel");
      channel.postMessage({ type, product: updatedProduct, timestamp: Date.now() });
      channel.close();
    }

    window.dispatchEvent(new CustomEvent("prc_products_updated", { detail: { type, product: updatedProduct } }));
  } catch (e) {
    console.error("[PRC Admin] Product sync error:", e);
  }
}
