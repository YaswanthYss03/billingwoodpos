'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/auth-provider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Plus, Edit, Trash2, Package, X, Tag } from 'lucide-react';
import toast from 'react-hot-toast';

// Default GST rates (fallback if settings not configured)
const DEFAULT_GST_RATES = [
  { label: 'Zero Rated', rate: 0 },
  { label: 'Essential Goods', rate: 5 },
  { label: 'Standard Rate', rate: 12 },
  { label: 'Standard Rate', rate: 18 },
  { label: 'Luxury Goods', rate: 28 },
];

export default function ItemsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [gstRates, setGstRates] = useState<{ label: string; rate: number }[]>(DEFAULT_GST_RATES);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    price: '',
    gstRate: '5',
    unit: 'PCS',
    description: '',
    sku: '',
    trackInventory: true,
    inventoryMode: 'AUTO',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [itemsRes, categoriesRes, settingsRes] = await Promise.all([
        api.items.list(),
        api.categories.list(),
        api.tenants.getSettings(),
      ]);
      setItems(itemsRes.data);
      setCategories(categoriesRes.data);
      
      // Load GST rates from settings or use defaults
      const loadedGstRates = settingsRes.data.settings.gstRates;
      if (loadedGstRates && loadedGstRates.length > 0) {
        setGstRates(loadedGstRates);
        // Set default GST rate to first available rate
        setFormData(prev => ({ ...prev, gstRate: loadedGstRates[0].rate.toString() }));
      }
    } catch (error) {
      toast.error('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.name.trim()) {
      toast.error('Item name is required');
      return;
    }

    // Check for duplicate item name (case-insensitive)
    const duplicateItem = items.find(item => 
      item.name.toLowerCase() === formData.name.trim().toLowerCase() && 
      item.id !== editingItem?.id
    );

    if (duplicateItem) {
      toast.error(`Item "${formData.name}" already exists`);
      return;
    }

    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        gstRate: parseFloat(formData.gstRate),
      };
      
      if (editingItem) {
        await api.items.update(editingItem.id, payload);
        toast.success('Item updated successfully');
      } else {
        await api.items.create(payload);
        toast.success('Item created successfully');
      }
      
      resetForm();
      loadData();
    } catch (error) {
      toast.error(editingItem ? 'Failed to update item' : 'Failed to create item');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingItem(null);
    setFormData({
      name: '',
      categoryId: '',
      price: '',
      gstRate: '5',
      unit: 'PCS',
      description: '',
      sku: '',
      trackInventory: true,
      inventoryMode: 'AUTO',
    });
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      categoryId: item.categoryId,
      price: item.price.toString(),
      gstRate: item.gstRate.toString(),
      unit: item.unit,
      description: item.description || '',
      sku: item.sku || '',
      trackInventory: item.trackInventory,
      inventoryMode: item.inventoryMode || 'AUTO',
    });
    setShowForm(true);
  };

  const handleToggleStatus = async (item: any) => {
    try {
      await api.items.toggleStatus(item.id);
      toast.success(`Item ${item.isActive ? 'deactivated' : 'activated'} successfully`);
      loadData();
    } catch (error) {
      toast.error('Failed to toggle item status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      await api.items.delete(id);
      toast.success('Item deleted successfully');
      loadData();
    } catch (error) {
      toast.error('Failed to delete item');
    }
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
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Items</h1>
              <p className="text-gray-600 mt-1">Manage your menu items and inventory</p>
            </div>
            <Button onClick={() => { resetForm(); setShowForm(!showForm); }}>
              <Plus className="mr-2 h-4 w-4" /> Add Item
            </Button>
          </div>

          {showForm && (
            <Card className="border-blue-200 shadow-md">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b border-blue-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center text-blue-900">
                    <Package className="h-5 w-5 mr-2" />
                    {editingItem ? 'Edit Item' : 'Add New Item'}
                  </CardTitle>
                  <button
                    onClick={resetForm}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Name *</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Category *</label>
                    <select
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                      required
                    >
                      <option value="">Select Category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Price *</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">GST Rate (%) *</label>
                    <select
                      value={formData.gstRate}
                      onChange={(e) => setFormData({ ...formData, gstRate: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                      required
                    >
                      {gstRates.map((rate, index) => (
                        <option key={index} value={rate.rate}>
                          {rate.rate}% - {rate.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Configure GST rates in Settings
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Unit *</label>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                      required
                    >
                      <option value="PCS">Pieces (PCS)</option>
                      <option value="KG">Kilograms (KG)</option>
                      <option value="L">Liters (L)</option>
                      <option value="PLATE">Plate</option>
                      <option value="BOWL">Bowl</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">SKU</label>
                    <Input
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-900 mb-1">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                      placeholder="Optional"
                    />
                  </div>
                  <div className="flex items-center pt-2">
                    <input
                      type="checkbox"
                      checked={formData.trackInventory}
                      onChange={(e) => setFormData({ ...formData, trackInventory: e.target.checked })}
                      className="mr-2 h-4 w-4"
                      id="trackInventory"
                    />
                    <label htmlFor="trackInventory" className="text-sm font-medium text-gray-900">Track Inventory</label>
                  </div>
                  {formData.trackInventory && (
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Inventory Mode</label>
                      <select
                        value={formData.inventoryMode}
                        onChange={(e) => setFormData({ ...formData, inventoryMode: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                      >
                        <option value="AUTO">Auto-deduct (Default)</option>
                        <option value="MANUAL">Manual (Chef manages availability)</option>
                        <option value="DISABLED">Disabled (Unlimited quantity)</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        {formData.inventoryMode === 'AUTO' && 'Stock automatically deducted on each sale'}
                        {formData.inventoryMode === 'MANUAL' && 'For cooked items - bill freely, update stock manually'}
                        {formData.inventoryMode === 'DISABLED' && 'No stock validation - suitable for unlimited items'}
                      </p>
                    </div>
                  )}
                  <div className="md:col-span-2 flex gap-2">
                    <Button type="submit">{editingItem ? 'Update Item' : 'Save Item'}</Button>
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-md">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b">
              <CardTitle className="flex items-center text-gray-900">
                <Package className="h-5 w-5 mr-2 text-blue-600" />
                All Items ({items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {items.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg mb-2">No items yet</p>
                  <p className="text-gray-500 text-sm mb-6">Get started by adding your first menu item</p>
                  <Button onClick={() => { resetForm(); setShowForm(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Item
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">Item Details</TableHead>
                        <TableHead className="font-semibold">Category</TableHead>
                        <TableHead className="font-semibold">Pricing</TableHead>
                        <TableHead className="font-semibold">Stock Tracking</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="text-right font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id} className="hover:bg-gray-50 transition-colors">
                          <TableCell>
                            <div>
                              <div className="font-medium text-gray-900 text-base">{item.name}</div>
                              {item.sku && (
                                <div className="text-xs text-gray-500 mt-1 flex items-center">
                                  <Tag className="h-3 w-3 mr-1" />
                                  SKU: {item.sku}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-purple-100 text-purple-800">
                              {item.category.name}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-gray-900 font-semibold text-base">
                                {formatCurrency(item.price)}
                              </div>
                              <div className="text-xs text-gray-600">
                                GST: {item.gstRate}%
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {item.trackInventory ? (
                              <div className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-green-100 text-green-800">
                                <Package className="h-3 w-3 mr-1" />
                                Tracked
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-gray-100 text-gray-600">
                                Not Tracked
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => handleToggleStatus(item)}
                              className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold transition-all transform hover:scale-105 cursor-pointer shadow-sm ${
                                item.isActive
                                  ? 'bg-green-500 text-white hover:bg-green-600'
                                  : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                              }`}
                              title={`Click to ${item.isActive ? 'deactivate' : 'activate'}`}
                            >
                              <span className={`h-2 w-2 rounded-full mr-2 ${item.isActive ? 'bg-white' : 'bg-gray-600'}`}></span>
                              {item.isActive ? 'Active' : 'Inactive'}
                            </button>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleEdit(item)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit item"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete item"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Box */}
          {items.length > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-100">
                      <Package className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h4 className="font-semibold text-blue-900 mb-2">💡 Quick Tips</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Click on the <span className="font-semibold">Status badge</span> to quickly activate/deactivate items</li>
                      <li>• Inactive items won't appear in POS or order screens</li>
                      <li>• Track inventory for items with limited stock</li>
                      <li>• Use categories to organize items for better management</li>
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
