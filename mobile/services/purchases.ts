/**
 * purchases.ts — RevenueCat IAP integration
 *
 * Uses react-native-purchases to handle subscriptions via RevenueCat.
 * Product ID: FileTrail.monthly  |  Entitlement: pro
 */

import Purchases, { LOG_LEVEL } from 'react-native-purchases';

// RevenueCat iOS public SDK key
const RC_API_KEY_IOS = 'appl_irsrRjnQozQoLjXSSQKdXKfgTQN';

export function initializePurchases(): void {
  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR);
  Purchases.configure({ apiKey: RC_API_KEY_IOS });
}

export async function checkProEntitlement(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return typeof customerInfo.entitlements.active['pro'] !== 'undefined';
  } catch (e) {
    console.warn('[purchases] checkProEntitlement error', e);
    return false;
  }
}

export async function purchasePro(): Promise<boolean> {
  try {
    const offerings = await Purchases.getOfferings();
    const pkg = offerings.current?.availablePackages[0];
    if (!pkg) {
      console.warn('[purchases] No available packages found');
      return false;
    }
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return typeof customerInfo.entitlements.active['pro'] !== 'undefined';
  } catch (e: any) {
    if (e?.userCancelled) return false;
    console.warn('[purchases] purchasePro error', e);
    return false;
  }
}

export async function restorePurchases(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    return typeof customerInfo.entitlements.active['pro'] !== 'undefined';
  } catch (e) {
    console.warn('[purchases] restorePurchases error', e);
    return false;
  }
}
