'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/auth-provider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Package, AlertTriangle, Plus, X } from 'lucide-react';import { Input } from '@/components/ui/input';import toast from 'react-hot-toast';

export default function InventoryPage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'summary' | 'batches'>('summary');
  const [showAddStock, setShowAddStock] = useState(false);
  const [formData, setFormData] = useState({
    itemId: '',
    quantity: '',
    costPrice: '',
    expiryDate: '',
    supplier: '',
  });

  useEffect(() => {
    loadInventory();
    loadItems();
  }, []);

  const loadInventory = async () => {
    try {
      const [inventoryRes, batchesRes, lowStockRes] = await Promise.all([
        api.reports.currentInventory(),
        api.inventory.batches(),
        api.inventory.lowStock(10),
      ]);
      setInventory(inventoryRes.data.items || []);
      setBatches(batchesRes.data);
      setLowStockItems(lowStockRes.data || []);
    } catch (error) {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async () => {
    try {
      const res = await api.items.list();
      setItems(res.data.filter((item: any) => item.trackInventory));
    } catch (error) {
      console.error('Failed to load items:', error);
    }
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.itemId || !formData.quantity || !formData.costPrice) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // Create a purchase to add stock
      const purchaseRes = await api.purchases.create({
        items: [{
          itemId: formData.itemId,
          quantity: Number(formData.quantity),
          costPrice: Number(formData.costPrice),
        }],
        supplierName: formData.supplier || 'Direct Entry',
        notes: formData.expiryDate ? `Expiry Date: ${formData.expiryDate}` : undefined,
      });

      // Automatically receive the purchase to create inventory batches
      await api.purchases.receive(purchaseRes.data.id, {});

      toast.success('Stock added successfully!');
      setShowAddStock(false);
      setFormData({
        itemId: '',
        quantity: '',
        costPrice: '',
        expiryDate: '',
        supplier: '',
      });
      loadInventory();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add stock');
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
            <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
            <div className="flex items-center gap-4">
              {/* Tab Toggle */}
              <div className="inline-flex items-center bg-gray-100 rounded-lg p-1 shadow-inner">
                <button
                  onClick={() => setView('summary')}
                  className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    view === 'summary'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  <Package className="mr-2 h-4 w-4" /> Summary
                </button>
                <button
                  onClick={() => setView('batches')}
                  className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    view === 'batches'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  Batches
                </button>
              </div>
              
              <Button onClick={() => setShowAddStock(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Stock
              </Button>
            </div>
          </div>

          {/* Low Stock Warning */}
          {lowStockItems.length > 0 && (
            <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-lg shadow-sm">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-semibold text-orange-800">
                    Low Stock Alert • {lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''} running low
                  </h3>
                  <div className="mt-2 text-sm">
                    <div className="flex flex-wrap gap-2">
                      {lowStockItems.slice(0, 5).map((item: any, index: number) => {
                        const itemName = item.itemName || item.name || item.item?.name || 'Unknown Item';
                        const quantity = item.totalQuantity || item.quantity || 0;
                        const unit = item.unit || '';
                        
                        return (
                          <span 
                            key={item.id || item.itemId || `low-stock-${index}`} 
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border-2 border-orange-300 shadow-sm"
                          >
                            <span className="font-semibold text-gray-900">{itemName}</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-orange-500 text-white">
                              {quantity} {unit}
                            </span>
                          </span>
                        );
                      })}
                      {lowStockItems.length > 5 && (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-orange-200 text-orange-900 font-semibold">
                          +{lowStockItems.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === 'summary' ? (
            <Card>
              <CardHeader>
                <CardTitle>Current Stock Levels</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Batches</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventory.map((item: any) => (
                      <TableRow key={item.itemName}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            {item.totalQuantity < 10 && (
                              <AlertTriangle className="h-4 w-4 text-orange-500 mr-2" />
                            )}
                            {item.itemName}
                          </div>
                        </TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>
                          {item.totalQuantity} {item.unit}
                        </TableCell>
                        <TableCell>{formatCurrency(item.totalValue)}</TableCell>
                        <TableCell>{item.batchCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>All Batches</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch No</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Cost Price</TableHead>
                      <TableHead>Purchase Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.map((batch: any) => (
                      <TableRow key={batch.id}>
                        <TableCell className="font-medium">{batch.batchNumber}</TableCell>
                        <TableCell>{batch.item.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">
                              {batch.currentQuantity || 0}
                            </span>
                            {batch.originalQuantity && (
                              <span className="text-sm text-gray-500">
                                of {batch.originalQuantity}
                              </span>
                            )}
                            <span className="text-xs text-gray-400">{batch.item.unit}</span>
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(batch.costPrice)}</TableCell>
                        <TableCell>{formatDate(batch.purchaseDate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Add Stock Modal */}
        {showAddStock && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Add Stock</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddStock(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <form onSubmit={handleAddStock} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Item <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.itemId}
                      onChange={(e) => setFormData({ ...formData, itemId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Item</option>
                      {items.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      placeholder="Enter quantity"
                      step="0.01"
                      min="0.01"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cost Price (₹) <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      value={formData.costPrice}
                      onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                      placeholder="Enter cost price"
                      step="0.01"
                      min="0.01"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Supplier (Optional)
                    </label>
                    <Input
                      type="text"
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      placeholder="Enter supplier name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expiry Date (Optional)
                    </label>
                    <Input
                      type="date"
                      value={formData.expiryDate}
                      onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1">
                      Add Stock
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddStock(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
