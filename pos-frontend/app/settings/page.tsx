'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/auth-provider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useTenantConfig } from '@/lib/useTenantConfig';
import toast from 'react-hot-toast';
import { Settings as SettingsIcon, Save, Plus, Edit2, Trash2, X, Percent } from 'lucide-react';

interface GstRate {
  label: string;
  rate: number;
}

interface SettingsState {
  kotEnabled: boolean;
  autoGenerateKOT: boolean;
  requireTableNumber: boolean;
  enableThermalPrinter: boolean;
  gstRates: GstRate[];
}

// Default GST rates for India
const DEFAULT_GST_RATES: GstRate[] = [
  { label: 'Zero Rated', rate: 0 },
  { label: 'Essential Goods', rate: 5 },
  { label: 'Standard Rate', rate: 12 },
  { label: 'Standard Rate', rate: 18 },
  { label: 'Luxury Goods', rate: 28 },
];

export default function SettingsPage() {
  const { businessType, canConfigureKOT } = useTenantConfig();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsState>({
    kotEnabled: false,
    autoGenerateKOT: false,
    requireTableNumber: false,
    enableThermalPrinter: false,
    gstRates: DEFAULT_GST_RATES,
  });

  // GST Rate form state
  const [showGstForm, setShowGstForm] = useState(false);
  const [editingGstIndex, setEditingGstIndex] = useState<number | null>(null);
  const [gstFormData, setGstFormData] = useState<GstRate>({ label: '', rate: 0 });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.tenants.getSettings();
      const loadedSettings = response.data.settings;
      setSettings({
        kotEnabled: loadedSettings.kotEnabled || false,
        autoGenerateKOT: loadedSettings.autoGenerateKOT || false,
        requireTableNumber: loadedSettings.requireTableNumber || false,
        enableThermalPrinter: loadedSettings.enableThermalPrinter || false,
        gstRates: loadedSettings.gstRates || DEFAULT_GST_RATES,
      });
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.tenants.updateSettings(settings);
      toast.success('Settings saved successfully!');
      
      // Update the local auth store with new settings
      const { user, tenant } = useAuthStore.getState();
      if (tenant) {
        useAuthStore.setState({
          user,
          tenant: {
            ...tenant,
            settings,
          },
        });
      }
      
      // Refresh the page to ensure all components update
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key: keyof SettingsState) => {
    if (key === 'gstRates') return; // Skip gstRates toggle
    setSettings((prev) => ({ ...prev, [key]: !prev[key as keyof Omit<SettingsState, 'gstRates'>] }));
  };

  // GST Rate Management
  const handleAddGstRate = () => {
    if (!gstFormData.label.trim()) {
      toast.error('Please enter a label');
      return;
    }
    if (gstFormData.rate < 0 || gstFormData.rate > 100) {
      toast.error('Rate must be between 0 and 100');
      return;
    }

    if (editingGstIndex !== null) {
      // Edit existing rate
      const updatedRates = [...settings.gstRates];
      updatedRates[editingGstIndex] = gstFormData;
      setSettings((prev) => ({ ...prev, gstRates: updatedRates }));
      toast.success('GST rate updated');
    } else {
      // Add new rate
      setSettings((prev) => ({ ...prev, gstRates: [...prev.gstRates, gstFormData] }));
      toast.success('GST rate added');
    }

    // Reset form
    setGstFormData({ label: '', rate: 0 });
    setShowGstForm(false);
    setEditingGstIndex(null);
  };

  const handleEditGstRate = (index: number) => {
    setGstFormData(settings.gstRates[index]);
    setEditingGstIndex(index);
    setShowGstForm(true);
  };

  const handleDeleteGstRate = (index: number) => {
    if (settings.gstRates.length === 1) {
      toast.error('Cannot delete the last GST rate');
      return;
    }
    const updatedRates = settings.gstRates.filter((_, i) => i !== index);
    setSettings((prev) => ({ ...prev, gstRates: updatedRates }));
    toast.success('GST rate removed');
  };

  const handleCancelGstForm = () => {
    setGstFormData({ label: '', rate: 0 });
    setShowGstForm(false);
    setEditingGstIndex(null);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center h-96">
            <div className="text-lg text-gray-900">Loading...</div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Business Settings</h1>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>

          {/* GST/Tax Rate Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Percent className="h-5 w-5 mr-2" />
                GST / Tax Rate Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Configure custom GST or tax rates for your business. These rates will be available when creating or editing items.
              </p>

              {/* GST Rates List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {settings.gstRates.map((rate, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border-2 rounded-lg hover:border-blue-300 transition-colors"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{rate.label}</div>
                      <div className="text-lg font-bold text-blue-600">{rate.rate}%</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditGstRate(index)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Edit rate"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteGstRate(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete rate"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add/Edit GST Rate Form */}
              {showGstForm ? (
                <div className="p-4 border-2 border-blue-500 rounded-lg bg-blue-50">
                  <h4 className="font-medium text-gray-900 mb-3">
                    {editingGstIndex !== null ? 'Edit GST Rate' : 'Add New GST Rate'}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Label
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g., Standard Rate"
                        value={gstFormData.label}
                        onChange={(e) => setGstFormData({ ...gstFormData, label: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rate (%)
                      </label>
                      <Input
                        type="number"
                        placeholder="0"
                        min="0"
                        max="100"
                        step="0.01"
                        value={gstFormData.rate}
                        onChange={(e) => setGstFormData({ ...gstFormData, rate: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddGstRate} size="sm">
                      {editingGstIndex !== null ? 'Update Rate' : 'Add Rate'}
                    </Button>
                    <Button onClick={handleCancelGstForm} variant="outline" size="sm">
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button onClick={() => setShowGstForm(true)} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add GST Rate
                </Button>
              )}

              <div className="pt-4 border-t">
                <div className="bg-amber-50 p-4 rounded-lg">
                  <h4 className="font-medium text-amber-900 mb-2">💡 Important Notes</h4>
                  <ul className="text-sm text-amber-800 space-y-1">
                    <li>• Default GST rates for India: 0%, 5%, 12%, 18%, 28%</li>
                    <li>• You can add custom rates for special cases</li>
                    <li>• Changes will appear in the item creation/edit forms</li>
                    <li>• Deleting a rate won't affect existing items</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KOT Settings - only show if business can configure KOT */}
          {canConfigureKOT && (
            <Card>
              <CardHeader>
                <CardTitle>Kitchen Order Ticket (KOT) Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  {/* KOT Enabled Toggle */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Enable KOT System</h3>
                      <p className="text-sm text-gray-500">
                        When enabled, orders will be sent to the kitchen before billing
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggle('kotEnabled')}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                        settings.kotEnabled ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                          settings.kotEnabled ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Conditional settings shown only when KOT is enabled */}
                  {settings.kotEnabled && (
                    <>
                      {/* Auto Generate KOT */}
                      <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">Auto-Generate KOT</h3>
                          <p className="text-sm text-gray-500">
                            Automatically create KOT when items are added to cart
                          </p>
                        </div>
                        <button
                          onClick={() => handleToggle('autoGenerateKOT')}
                          className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                            settings.autoGenerateKOT ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                              settings.autoGenerateKOT ? 'translate-x-7' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Require Table Number */}
                      <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">Require Table Number</h3>
                          <p className="text-sm text-gray-500">
                            Make table number mandatory for all orders
                          </p>
                        </div>
                        <button
                          onClick={() => handleToggle('requireTableNumber')}
                          className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                            settings.requireTableNumber ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                              settings.requireTableNumber ? 'translate-x-7' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Enable Thermal Printer */}
                      <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">Enable Thermal Printer</h3>
                          <p className="text-sm text-gray-500">
                            Print KOT automatically to thermal printer
                          </p>
                        </div>
                        <button
                          onClick={() => handleToggle('enableThermalPrinter')}
                          className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                            settings.enableThermalPrinter ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                              settings.enableThermalPrinter ? 'translate-x-7' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">💡 What happens when KOT is enabled?</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• "KOT" menu will appear in the sidebar</li>
                      <li>• POS page button will show "Send to Kitchen" instead of "Complete Order"</li>
                      <li>• Orders will be sent to kitchen before billing</li>
                      <li>• Kitchen can track order status (Pending → Preparing → Ready → Served)</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
