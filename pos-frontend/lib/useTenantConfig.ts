'use client';

import { useAuthStore } from '@/stores/auth';
import { useState, useEffect } from 'react';

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

// Define business features for each business type (client-side mirror of backend config)
const BUSINESS_FEATURES: Record<string, BusinessFeatures> = {
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

const DEFAULT_SETTINGS: Record<string, TenantSettings> = {
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

export function useTenantConfig() {
  const { tenant } = useAuthStore();
  const [settings, setSettings] = useState<TenantSettings>({});

  const businessType = tenant?.businessType || 'OTHER';
  const features = BUSINESS_FEATURES[businessType] || BUSINESS_FEATURES.OTHER;
  const defaultSettings = DEFAULT_SETTINGS[businessType] || DEFAULT_SETTINGS.OTHER;

  // Merge default settings with tenant-specific settings
  const effectiveSettings = {
    ...defaultSettings,
    ...(tenant?.settings || {}),
  };

  useEffect(() => {
    setSettings(effectiveSettings);
  }, [tenant]);

  // For businesses that don't support KOT at all, force kotEnabled to false
  const kotEnabled = features.hasKOT ? (effectiveSettings.kotEnabled ?? true) : false;

  return {
    tenant,
    businessType,
    features,
    settings: effectiveSettings,
    // Helper methods for common feature checks
    hasKOT: features.hasKOT,
    kotEnabled, // Actual setting controlled by owner
    hasTables: features.hasTables,
    hasWeightedItems: features.hasWeightedItems,
    hasBarcodeScanning: features.hasBarcodeScanning,
    requiresTableNumber: effectiveSettings.requireTableNumber ?? features.requiresTableNumber,
    // Check if settings menu should be shown
    canConfigureKOT: features.hasKOT, // Only RESTAURANT and CAFE
  };
}
