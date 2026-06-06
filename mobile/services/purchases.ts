/**
 * purchases.ts — RevenueCat IAP integration
 *
 * Uses react-native-purchases to handle subscriptions via RevenueCat.
 * Product ID: FileTrail.monthly  |  Entitlement: Pro
 */

import { Platform } from 'react-native';
import Purchases, {
  type CustomerInfo,
  LOG_LEVEL,
  type PurchasesPackage,
  type PurchasesStoreProduct,
} from 'react-native-purchases';

// RevenueCat iOS public SDK key — set EXPO_PUBLIC_REVENUECAT_IOS_KEY in Codemagic
const RC_API_KEY_IOS =
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? 'appl_irsrRjnQozQoLjXSSQKdXKfgTQN';
const PRO_PRODUCT_ID = 'FileTrail.monthly';
const PRO_ENTITLEMENT_ID = 'pro';

let isConfigured = false;

export type BillingActionResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | 'cancelled'
        | 'not_available'
        | 'not_entitled'
        | 'not_found'
        | 'purchase_failed'
        | 'restore_failed'
        | 'unsupported_platform';
      message: string;
    };

function isNativePurchasesPlatform(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

function hasProEntitlement(customerInfo: CustomerInfo): boolean {
  return typeof customerInfo.entitlements.active[PRO_ENTITLEMENT_ID] !== 'undefined';
}

function configureIfNeeded(): boolean {
  if (!isNativePurchasesPlatform()) {
    return false;
  }

  if (!isConfigured) {
    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR);
    Purchases.configure({ apiKey: RC_API_KEY_IOS });
    isConfigured = true;
  }

  return true;
}

async function findPackageFromOfferings(): Promise<PurchasesPackage | null> {
  const offerings = await Purchases.getOfferings();
  const packages = [
    ...(offerings.current?.availablePackages ?? []),
    ...Object.values(offerings.all ?? {}).flatMap(offering => offering.availablePackages ?? []),
  ];

  return packages.find(pkg => pkg.product.identifier === PRO_PRODUCT_ID) ?? packages[0] ?? null;
}

async function findDirectProduct(): Promise<PurchasesStoreProduct | null> {
  const products = await Purchases.getProducts(
    [PRO_PRODUCT_ID],
    Purchases.PRODUCT_CATEGORY.SUBSCRIPTION,
  );

  return products.find(product => product.identifier === PRO_PRODUCT_ID) ?? products[0] ?? null;
}

export function initializePurchases(): void {
  configureIfNeeded();
}

export async function checkProEntitlement(): Promise<boolean> {
  if (!configureIfNeeded()) {
    return false;
  }

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return hasProEntitlement(customerInfo);
  } catch (e) {
    console.warn('[purchases] restorePurchases error', e);
    console.warn('[purchases] checkProEntitlement error', e);
    return false;
  }
}

export async function purchasePro(): Promise<BillingActionResult> {
  if (!configureIfNeeded()) {
    return {
      ok: false,
      code: 'unsupported_platform',
      message: 'Purchases are only available on iPhone and Android.',
    };
  }

  try {
    const pkg = await findPackageFromOfferings();
    if (pkg) {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      if (hasProEntitlement(customerInfo)) {
        return { ok: true };
      }

      return {
        ok: false,
        code: 'not_entitled',
        message: `Purchase completed, but the '${PRO_ENTITLEMENT_ID}' entitlement is not active.`,
      };
    }

    console.warn('[purchases] No package in offerings, falling back to direct product lookup');


    const product = await findDirectProduct();
    if (!product) {
      return {
        ok: false,
        code: 'not_available',
        message: `FileTrail Pro is not available right now. Verify '${PRO_PRODUCT_ID}' is approved in App Store Connect and attached to a RevenueCat offering.`,
      };
    }

    const { customerInfo } = await Purchases.purchaseStoreProduct(product);
    if (hasProEntitlement(customerInfo)) {
      return { ok: true };
    }

    return {
      ok: false,
      code: 'not_entitled',
      message: `Purchase completed, but the '${PRO_ENTITLEMENT_ID}' entitlement is not active.`,
    };
  } catch (e: unknown) {
    if (
      typeof e === 'object' &&
      e !== null &&
      'userCancelled' in e &&
      e.userCancelled === true
    ) {
      return {
        ok: false,
        code: 'cancelled',
        message: 'Purchase was cancelled.',
      };
    }

    return {
      ok: false,
      code: 'purchase_failed',
      message: e instanceof Error && e.message.trim().length > 0
        ? e.message
        : 'Could not complete the purchase.',
    };
  }
}

export async function restorePurchases(): Promise<BillingActionResult> {
  if (!configureIfNeeded()) {
    return {
      ok: false,
      code: 'unsupported_platform',
      message: 'Purchases are only available on iPhone and Android.',
    };
  }

  try {
    const customerInfo = await Purchases.restorePurchases();
    if (hasProEntitlement(customerInfo)) {
      return { ok: true };
    }

    return {
      ok: false,
      code: 'not_found',
      message: 'We could not find a previous Pro purchase to restore.',
    };
  } catch (e) {
    return {
      ok: false,
      code: 'restore_failed',
      message: e instanceof Error && e.message ? e.message : 'Could not restore purchases.',
    };
  }
}
