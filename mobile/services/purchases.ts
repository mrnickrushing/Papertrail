/**
 * purchases.ts — IAP stub (RevenueCat integration pending)
 *
 * react-native-purchases is not yet linked. All methods return false so the
 * paywall UI shows but no real transactions are processed. Wire up a
 * compatible IAP library here when ready.
 */

export function initializePurchases(): void {
  // no-op until IAP library is linked
}

export async function checkProEntitlement(): Promise<boolean> {
  return false;
}

export async function purchasePro(): Promise<boolean> {
  return false;
}

export async function restorePurchases(): Promise<boolean> {
  return false;
}
