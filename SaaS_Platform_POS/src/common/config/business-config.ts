export type BusinessType = 
  | 'RESTAURANT' 
  | 'SWEET_SHOP' 
  | 'SUPERMARKET' 
  | 'CAFE' 
  | 'RETAIL' 
  | 'OTHER';

export interface TenantSettings {
  kotEnabled?: boolean;
  autoGenerateKOT?: boolean;
  requireTableNumber?: boolean;
  enableThermalPrinter?: boolean;
}

export interface BusinessFeatures {
  hasKOT: boolean;
  hasTables: boolean;
  hasWeightedItems: boolean;
  hasBarcodeScanning: boolean;
  inventoryTracking: 'BATCH' | 'SKU';
  defaultUnit: string;
  requiresTableNumber: boolean;
}

// Default settings for each business type
export const DEFAULT_SETTINGS: Record<BusinessType, TenantSettings> = {
  RESTAURANT: {
    kotEnabled: true,
    autoGenerateKOT: false,
    requireTableNumber: true,
    enableThermalPrinter: false,
  },
  CAFE: {
    kotEnabled: true,
    autoGenerateKOT: false,
    requireTableNumber: false,
    enableThermalPrinter: false,
  },
  SWEET_SHOP: {
    kotEnabled: false,
    autoGenerateKOT: false,
    requireTableNumber: false,
    enableThermalPrinter: false,
  },
  SUPERMARKET: {
    kotEnabled: false,
    autoGenerateKOT: false,
    requireTableNumber: false,
    enableThermalPrinter: false,
  },
  RETAIL: {
    kotEnabled: false,
    autoGenerateKOT: false,
    requireTableNumber: false,
    enableThermalPrinter: false,
  },
  OTHER: {
    kotEnabled: false,
    autoGenerateKOT: false,
    requireTableNumber: false,
    enableThermalPrinter: false,
  },
};

export const BUSINESS_FEATURES: Record<BusinessType, BusinessFeatures> = {
  RESTAURANT: {
    hasKOT: true,
    hasTables: true,
    hasWeightedItems: false,
    hasBarcodeScanning: false,
    inventoryTracking: 'BATCH',
    defaultUnit: 'PCS',
    requiresTableNumber: true,
  },
  SWEET_SHOP: {
    hasKOT: false,
    hasTables: false,
    hasWeightedItems: true,
    hasBarcodeScanning: false,
    inventoryTracking: 'BATCH',
    defaultUnit: 'KG',
    requiresTableNumber: false,
  },
  SUPERMARKET: {
    hasKOT: false,
    hasTables: false,
    hasWeightedItems: true,
    hasBarcodeScanning: true,
    inventoryTracking: 'SKU',
    defaultUnit: 'PCS',
    requiresTableNumber: false,
  },
  CAFE: {
    hasKOT: true,
    hasTables: true,
    hasWeightedItems: false,
    hasBarcodeScanning: false,
    inventoryTracking: 'BATCH',
    defaultUnit: 'PCS',
    requiresTableNumber: false,
  },
  RETAIL: {
    hasKOT: false,
    hasTables: false,
    hasWeightedItems: false,
    hasBarcodeScanning: true,
    inventoryTracking: 'SKU',
    defaultUnit: 'PCS',
    requiresTableNumber: false,
  },
  OTHER: {
    hasKOT: false,
    hasTables: false,
    hasWeightedItems: false,
    hasBarcodeScanning: false,
    inventoryTracking: 'BATCH',
    defaultUnit: 'PCS',
    requiresTableNumber: false,
  },
};

export function getBusinessFeatures(businessType: string): BusinessFeatures {
  return BUSINESS_FEATURES[businessType as BusinessType] || BUSINESS_FEATURES.OTHER;
}

export function getDefaultSettings(businessType: string): TenantSettings {
  return DEFAULT_SETTINGS[businessType as BusinessType] || DEFAULT_SETTINGS.OTHER;
}

export function getTenantSettings(
  businessType: string,
  customSettings?: any,
): TenantSettings {
  const defaults = getDefaultSettings(businessType);
  return {
    ...defaults,
    ...(customSettings || {}),
  };
}
