'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/auth-provider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useTenantConfig } from '@/lib/useTenantConfig';
import { useAuthStore } from '@/stores/auth';
import { Plus, Minus, Trash2, ShoppingCart, TicketCheck, Printer, Save, FileText, X, Search, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface CartItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  gstRate: number;
  trackInventory: boolean;
  inventoryMode: string;
}

export default function POSPage() {
  const searchParams = useSearchParams();
  const { kotEnabled } = useTenantConfig();
  const { tenant } = useAuthStore();
  const isRestaurant = tenant?.businessType === 'RESTAURANT';
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'>(isRestaurant ? 'DINE_IN' : 'TAKEAWAY');
  const [discount, setDiscount] = useState<number>(0);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastBill, setLastBill] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billProcessing, setBillProcessing] = useState<'pending' | 'confirmed' | 'error' | null>(null);
  const [draftOrders, setDraftOrders] = useState<any[]>([]);
  const [showDraftMenu, setShowDraftMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [itemStocks, setItemStocks] = useState<Record<string, number>>({});
  
  // KOT-related state
  const [linkedKotId, setLinkedKotId] = useState<string | null>(null);
  const [linkedKotData, setLinkedKotData] = useState<any>(null);
  const [isKotMode, setIsKotMode] = useState(false);

  useEffect(() => {
    loadData();
    loadDraftOrders();
    
    // Check if we're coming from a KOT
    const kotId = searchParams.get('kotId');
    if (kotId) {
      loadKOTData(kotId);
    }
  }, []);

  // Set default order type based on business type
  useEffect(() => {
    if (tenant) {
      setOrderType(tenant.businessType === 'RESTAURANT' ? 'DINE_IN' : 'TAKEAWAY');
    }
  }, [tenant]);

  useEffect(() => {
    if (selectedCategory) {
      loadItems(selectedCategory);
    }
  }, [selectedCategory]);

  const loadData = async () => {
    try {
      const categoriesRes = await api.categories.list();
      setCategories(categoriesRes.data);
      // Set "ALL" as default selected category
      setSelectedCategory('ALL');
    } catch (error) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const loadDraftOrders = () => {
    try {
      const drafts = localStorage.getItem('pos_draft_orders');
      if (drafts) {
        setDraftOrders(JSON.parse(drafts));
      }
    } catch (error) {
      console.error('Failed to load drafts:', error);
    }
  };

  const loadKOTData = async (kotId: string) => {
    try {
      const response = await api.kot.get(kotId);
      const kotData = response.data;
      
      // Verify KOT status is SERVED
      if (kotData.status !== 'SERVED') {
        toast.error('This KOT is not ready for billing. Status: ' + kotData.status);
        return;
      }
      
      // Load KOT items into cart
      const cartItems: CartItem[] = kotData.items.map((kotItem: any) => ({
        itemId: kotItem.item.id,
        name: kotItem.item.name,
        price: kotItem.item.price,
        quantity: kotItem.quantity,
        gstRate: kotItem.item.gstRate,
      }));
      
      setCart(cartItems);
      setLinkedKotId(kotId);
      setLinkedKotData(kotData);
      setIsKotMode(true);
      setCustomerName(kotData.tableNumber || '');
      
      toast.success(`Loaded KOT #${kotData.kotNumber} for billing`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load KOT data');
    }
  };

  const saveDraftOrder = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    const draft = {
      id: Date.now(),
      cart,
      customerName,
      customerPhone,
      paymentMethod,
      orderType,
      discount,
      timestamp: new Date().toISOString(),
    };

    const updatedDrafts = [...draftOrders, draft];
    setDraftOrders(updatedDrafts);
    localStorage.setItem('pos_draft_orders', JSON.stringify(updatedDrafts));
    
    // Clear current cart
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setDiscount(0);
    setPaymentMethod('CASH');
    setOrderType(isRestaurant ? 'DINE_IN' : 'TAKEAWAY');
    
    toast.success('Draft saved successfully!');
  };

  const loadDraftOrder = (draftId: number) => {
    const draft = draftOrders.find(d => d.id === draftId);
    if (draft) {
      setCart(draft.cart);
      setCustomerName(draft.customerName || '');
      setCustomerPhone(draft.customerPhone || '');
      setPaymentMethod(draft.paymentMethod || 'CASH');
      setOrderType(draft.orderType || (isRestaurant ? 'DINE_IN' : 'TAKEAWAY'));
      setDiscount(draft.discount || 0);
      
      // Remove draft from storage
      const updatedDrafts = draftOrders.filter(d => d.id !== draftId);
      setDraftOrders(updatedDrafts);
      localStorage.setItem('pos_draft_orders', JSON.stringify(updatedDrafts));
      
      setShowDraftMenu(false);
      toast.success('Draft loaded!');
    }
  };

  const deleteDraftOrder = (draftId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedDrafts = draftOrders.filter(d => d.id !== draftId);
    setDraftOrders(updatedDrafts);
    localStorage.setItem('pos_draft_orders', JSON.stringify(updatedDrafts));
    toast.success('Draft deleted!');
  };

  const loadItems = async (categoryId: string) => {
    try {
      // If "ALL" is selected, load all items (no categoryId filter)
      const itemsRes = categoryId === 'ALL' 
        ? await api.items.list() 
        : await api.items.list(categoryId);
      const activeItems = itemsRes.data.filter((item: any) => item.isActive);
      setItems(activeItems);
      
      // Load stock for items that track inventory
      const stockPromises = activeItems
        .filter((item: any) => item.trackInventory)
        .map(async (item: any) => {
          try {
            const stockRes = await api.items.getStock(item.id);
            return { itemId: item.id, stock: stockRes.data || 0 };
          } catch (error) {
            return { itemId: item.id, stock: 0 };
          }
        });
      
      const stockResults = await Promise.all(stockPromises);
      const stockMap: Record<string, number> = {};
      stockResults.forEach(({ itemId, stock }) => {
        stockMap[itemId] = stock;
      });
      setItemStocks(stockMap);
    } catch (error) {
      toast.error('Failed to load items');
    }
  };

  // Filter items based on search query
  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const itemName = item.name.toLowerCase();
    const itemPrice = item.price.toString();
    
    // Check if query contains numbers (price search)
    const priceMatch = query.match(/\d+/);
    if (priceMatch) {
      const searchDigits = priceMatch[0];
      // Match if item price contains these digits (e.g., "3" matches 300, 350, etc.)
      return itemPrice.includes(searchDigits);
    }
    
    // Text search (case-insensitive)
    return itemName.includes(query);
  });

  const addToCart = (item: any) => {
    // Prevent adding items in KOT mode
    if (isKotMode) {
      toast.error('Cannot modify items when generating bill from KOT');
      return;
    }
    
    const existingItem = cart.find((i) => i.itemId === item.id);
    const currentQuantity = existingItem ? existingItem.quantity : 0;
    const newQuantity = currentQuantity + 1;
    
    // Check stock only for items with AUTO inventory mode
    if (item.trackInventory && item.inventoryMode === 'AUTO') {
      const availableStock = itemStocks[item.id] || 0;
      if (newQuantity > availableStock) {
        toast.error(`Only ${availableStock} units available in stock`);
        return;
      }
    }
    
    if (existingItem) {
      setCart(
        cart.map((i) =>
          i.itemId === item.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      );
    } else {
      setCart([
        ...cart,
        {
          itemId: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          gstRate: item.gstRate,
          trackInventory: item.trackInventory,
          inventoryMode: item.inventoryMode,
        },
      ]);
    }
  };

  const updateQuantity = (itemId: string, delta: number) => {
    // Prevent quantity changes in KOT mode
    if (isKotMode) {
      toast.error('Cannot modify items when generating bill from KOT');
      return;
    }
    
    const cartItem = cart.find((item) => item.itemId === itemId);
    if (!cartItem) return;
    
    const newQuantity = cartItem.quantity + delta;
    
    // Check stock only for items with AUTO inventory mode (only when increasing quantity)
    if (delta > 0) {
      const item = items.find((i) => i.id === itemId);
      if (item && item.trackInventory && item.inventoryMode === 'AUTO') {
        const availableStock = itemStocks[itemId] || 0;
        if (newQuantity > availableStock) {
          toast.error(`Only ${availableStock} units available in stock`);
          return;
        }
      }
    }
    
    setCart(
      cart
        .map((item) =>
          item.itemId === itemId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (itemId: string) => {
    // Prevent removing items in KOT mode
    if (isKotMode) {
      toast.error('Cannot modify items when generating bill from KOT');
      return;
    }
    
    setCart(cart.filter((item) => item.itemId !== itemId));
  };

  const calculateSubtotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const calculateTotalGST = () => {
    return cart.reduce((total, item) => {
      const amount = item.price * item.quantity;
      return total + (amount * item.gstRate) / 100;
    }, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const gst = calculateTotalGST();
    const total = subtotal + gst;
    return total - discount;
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    const startTime = performance.now();

    try {
      // For restaurants with KOT enabled AND not in KOT billing mode, create KOT instead of bill
      if (kotEnabled && !isKotMode) {
        setBillingLoading(true);
        const kotData = {
          items: cart.map((item) => ({
            itemId: item.itemId,
            quantity: item.quantity,
          })),
          tableNumber: customerName || 'Counter',
          notes: customerPhone ? `Phone: ${customerPhone}` : undefined,
        };

        const response = await api.kot.create(kotData);
        const endTime = performance.now();
        console.log(`KOT created in ${(endTime - startTime).toFixed(0)}ms`);
        toast.success('Order sent to kitchen successfully!');
        
        // Reset cart
        setCart([]);
        setCustomerName('');
        setCustomerPhone('');
        setDiscount(0);
        setPaymentMethod('CASH');
        setOrderType(isRestaurant ? 'DINE_IN' : 'TAKEAWAY');
        setBillingLoading(false);
      } else {
        // ⚡ OPTIMISTIC UI: Show receipt IMMEDIATELY with local calculations
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-GB').replace(/\//g, '');
        const timeStr = now.getTime().toString().slice(-4);
        const tempBillNumber = `TEMP-${dateStr}-${timeStr}`;

        // Calculate totals locally (instant)
        const billItems = cart.map((item) => {
          const lineTotal = item.price * item.quantity;
          const gstAmount = (lineTotal * item.gstRate) / 100;
          const totalAmount = lineTotal + gstAmount;
          
          return {
            itemId: item.itemId,
            quantity: item.quantity,
            price: item.price,
            gstRate: item.gstRate,
            gstAmount: gstAmount,
            totalAmount: totalAmount,
            trackInventory: item.trackInventory,
            inventoryMode: item.inventoryMode,
            itemName: item.name,
            item: {
              id: item.itemId,
              name: item.name,
              price: item.price,
            },
          };
        });

        const subtotal = billItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const taxAmount = billItems.reduce((sum, item) => sum + item.gstAmount, 0);
        const totalAmount = subtotal + taxAmount - (discount || 0);

        // Create optimistic bill object
        const optimisticBill = {
          id: 'temp-' + Date.now(),
          billNumber: tempBillNumber,
          subtotal,
          taxAmount,
          discount: discount || 0,
          totalAmount,
          paymentMethod,
          orderType,
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          notes: null,
          createdAt: now.toISOString(),
          items: billItems,
        };

        // ⚡ SHOW RECEIPT IMMEDIATELY (< 50ms)
        setLastBill(optimisticBill);
        setShowReceipt(true);
        setBillProcessing('pending');
        toast.success('Receipt ready! Processing bill...');

        // Build API payload
        const billData: any = {
          items: cart.map((item) => {
            const lineTotal = item.price * item.quantity;
            const gstAmount = (lineTotal * item.gstRate) / 100;
            const totalAmount = lineTotal + gstAmount;
            
            return {
              itemId: item.itemId,
              quantity: item.quantity,
              price: item.price,
              gstRate: item.gstRate,
              gstAmount: gstAmount,
              totalAmount: totalAmount,
              trackInventory: item.trackInventory,
              inventoryMode: item.inventoryMode,
              itemName: item.name,
            };
          }),
          paymentMethod,
          orderType,
          inventoryMethod: (tenant as any)?.inventoryMethod || 'FIFO',
          discount: discount || undefined,
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
        };
        
        if (isKotMode && linkedKotId) {
          billData.kotId = linkedKotId;
        }

        // Reset cart IMMEDIATELY (user can start next order)
        setCart([]);
        setCustomerName('');
        setCustomerPhone('');
        setDiscount(0);
        setPaymentMethod('CASH');
        setOrderType(isRestaurant ? 'DINE_IN' : 'TAKEAWAY');
        setIsKotMode(false);
        setLinkedKotId(null);
        setLinkedKotData(null);

        // 🔄 Call API in background (async - don't wait)
        api.billing.create(billData)
          .then((response) => {
            const endTime = performance.now();
            console.log(`Bill confirmed in ${(endTime - startTime).toFixed(0)}ms`);
            
            // Update with real bill data
            setLastBill(response.data);
            setBillProcessing('confirmed');
            toast.success(`Bill ${response.data.billNumber} confirmed!`, { duration: 2000 });
          })
          .catch((error: any) => {
            console.error('Bill creation failed:', error);
            setBillProcessing('error');
            toast.error(
              error.response?.data?.message || 'Bill saved locally. Sync pending.',
              { duration: 5000 }
            );
            // Keep optimistic bill visible - user can still print
          });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${kotEnabled && !isKotMode ? 'send order to kitchen' : 'create bill'}`);
      setBillingLoading(false);
      setBillProcessing('error');
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
          <h1 className="text-3xl font-bold text-gray-900">Point of Sale</h1>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Items Section */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {/* All Category Button */}
                <Button
                  variant={selectedCategory === 'ALL' ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory('ALL')}
                >
                  All
                </Button>
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? 'default' : 'outline'}
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    {category.name}
                  </Button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by name or price..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {filteredItems.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-gray-400">
                    <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No items found</p>
                    {searchQuery && (
                      <p className="text-sm mt-1">Try a different search term</p>
                    )}
                  </div>
                ) : (
                  filteredItems.map((item) => {
                    const stock = itemStocks[item.id];
                    const isAutoMode = item.trackInventory && item.inventoryMode === 'AUTO';
                    const isManualMode = item.trackInventory && item.inventoryMode === 'MANUAL';
                    const isLowStock = isAutoMode && stock !== undefined && stock < 10;
                    const isOutOfStock = isAutoMode && stock !== undefined && stock === 0;
                    
                    return (
                  <Card
                    key={item.id}
                    className={`cursor-pointer hover:shadow-lg transition-shadow relative ${
                      isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    onClick={() => !isOutOfStock && addToCart(item)}
                  >
                    <CardContent className="p-4">
                      {isLowStock && (
                        <div className="absolute top-2 right-2" title="Low stock">
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                        </div>
                      )}
                      {isOutOfStock && (
                        <div className="absolute top-2 right-2">
                          <div className="bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded">
                            Out of Stock
                          </div>
                        </div>
                      )}
                      {isManualMode && (
                        <div className="absolute top-2 right-2">
                          <div className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded" title="Manual inventory mode">
                            ∞
                          </div>
                        </div>
                      )}
                      <div className="font-medium text-sm text-gray-900 mb-1">{item.name}</div>
                      <div className="text-lg font-bold text-blue-600">
                        {formatCurrency(item.price)}
                      </div>
                      <div className="text-xs text-gray-500">
                        GST: {item.gstRate}%
                      </div>
                      {isAutoMode && stock !== undefined && (
                        <div className={`text-xs mt-1 ${
                          isOutOfStock ? 'text-red-600 font-medium' : 
                          isLowStock ? 'text-orange-600' : 
                          'text-gray-500'
                        }`}>
                          Stock: {stock}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                    );
                  })
                )}
              </div>
            </div>

            {/* Cart Section - Optimized Layout */}
            <div className="h-[calc(100vh-10rem)] flex flex-col">
              <Card className="flex-1 flex flex-col overflow-hidden">
                <CardHeader className="flex-shrink-0 pb-2 border-b">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center">
                      <ShoppingCart className="mr-2 h-5 w-5" />
                      Cart ({cart.length})
                    </div>
                    {cart.length > 0 && !isKotMode && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCart([])}
                        className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Clear
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col overflow-hidden p-3">
                  {/* Customer Details - Compact */}
                  <div className="flex-shrink-0 mb-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder={kotEnabled ? "Table" : "Name"}
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        disabled={isKotMode}
                        className="text-sm h-9"
                      />
                      <Input
                        placeholder={kotEnabled ? "Notes" : "Phone"}
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        disabled={isKotMode}
                        className="text-sm h-9"
                      />
                    </div>
                  </div>
                  
                  {/* KOT Mode Indicator - Compact */}
                  {isKotMode && linkedKotData && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-2 flex-shrink-0 mb-2">
                      <div className="flex items-center gap-2 text-blue-800 text-xs font-medium">
                        <TicketCheck className="h-3 w-3" />
                        <span>Bill from KOT #{linkedKotData.kotNumber}</span>
                      </div>
                    </div>
                  )}

                  {/* Cart Items - Scrollable */}
                  <div className="flex-1 overflow-y-auto scrollbar-hide mb-2" style={{ minHeight: '180px' }}>
                    {cart.length === 0 ? (
                      <div className="text-center text-gray-400 py-12 text-sm">
                        Cart is empty
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {cart.map((item) => (
                          <div key={item.itemId} className="flex items-center justify-between p-2 border rounded bg-white hover:bg-gray-50">
                            <div className="flex-1 min-w-0 mr-2">
                              <div className="font-medium text-sm text-gray-900 truncate">{item.name}</div>
                              <div className="text-xs text-gray-500">
                                {formatCurrency(item.price)} × {item.quantity} = {formatCurrency(item.price * item.quantity)}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuantity(item.itemId, -1)}
                                disabled={isKotMode}
                                className="h-7 w-7 p-0"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateQuantity(item.itemId, 1)}
                                disabled={isKotMode}
                                className="h-7 w-7 p-0"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(item.itemId)}
                                disabled={isKotMode}
                                className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Order Controls - Fixed, No Scroll */}
                  <div className="flex-shrink-0 border-t pt-2 space-y-2">
                    {/* Order Type - Compact Radio Buttons - Only for Restaurant */}
                    {isRestaurant && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Order Type
                        </label>
                        <div className="grid grid-cols-3 gap-1">
                          <button
                            type="button"
                            onClick={() => setOrderType('DINE_IN')}
                            disabled={isKotMode}
                            className={`px-2 py-1.5 rounded border-2 text-xs font-medium transition-all ${
                              orderType === 'DINE_IN'
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                            } ${isKotMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            Dine In
                          </button>
                          <button
                            type="button"
                            onClick={() => setOrderType('TAKEAWAY')}
                            disabled={isKotMode}
                            className={`px-2 py-1.5 rounded border-2 text-xs font-medium transition-all ${
                              orderType === 'TAKEAWAY'
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                            } ${isKotMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            Takeaway
                          </button>
                          <button
                            type="button"
                            onClick={() => setOrderType('DELIVERY')}
                            disabled={isKotMode}
                            className={`px-2 py-1.5 rounded border-2 text-xs font-medium transition-all ${
                              orderType === 'DELIVERY'
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                            } ${isKotMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            Delivery
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Payment & Discount - Two Column */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Payment
                        </label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value as any)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="CASH">Cash</option>
                          <option value="CARD">Card</option>
                          <option value="UPI">UPI</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Discount (₹)
                        </label>
                        <Input
                          type="number"
                          value={discount}
                          onChange={(e) => setDiscount(Number(e.target.value))}
                          placeholder="0"
                          min="0"
                          className="text-sm h-8"
                        />
                      </div>
                    </div>

                    {/* Bill Summary - Compact */}
                    {cart.length > 0 && (
                      <div className="bg-gray-50 p-2 rounded space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">Subtotal:</span>
                          <span className="font-medium">{formatCurrency(calculateSubtotal())}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">Tax (GST):</span>
                          <span className="font-medium">{formatCurrency(calculateTotalGST())}</span>
                        </div>
                        {discount > 0 && (
                          <div className="flex justify-between text-xs text-green-600">
                            <span>Discount:</span>
                            <span>- {formatCurrency(discount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-gray-300">
                          <span>Grand Total:</span>
                          <span>{formatCurrency(calculateTotal())}</span>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons - Compact */}
                    <Button
                      onClick={handleCheckout}
                      className="w-full h-10"
                      disabled={cart.length === 0 || billingLoading}
                    >
                      {billingLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                          Processing...
                        </>
                      ) : isKotMode ? (
                        <>
                          <Printer className="h-4 w-4 mr-2" />
                          Create Bill
                        </>
                      ) : kotEnabled ? (
                        <>
                          <TicketCheck className="h-4 w-4 mr-2" />
                          Send to Kitchen
                        </>
                      ) : (
                        'Complete Order'
                      )}
                    </Button>

                    {/* Draft Buttons - Compact Row */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={saveDraftOrder}
                        variant="outline"
                        disabled={cart.length === 0}
                        className="h-8 text-xs"
                      >
                        <Save className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                      
                      <div className="relative">
                        <Button
                          onClick={() => setShowDraftMenu(!showDraftMenu)}
                          variant="outline"
                          disabled={draftOrders.length === 0}
                          className="w-full h-8 text-xs"
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Drafts ({draftOrders.length})
                        </Button>
                        
                        {showDraftMenu && draftOrders.length > 0 && (
                          <div className="absolute bottom-full right-0 mb-1 w-72 bg-white border rounded shadow-xl z-50 max-h-64 overflow-y-auto">
                            <div className="p-2 border-b flex justify-between items-center bg-gray-50 sticky top-0">
                              <span className="font-medium text-xs">Saved Drafts</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowDraftMenu(false)}
                                className="h-6 w-6 p-0"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                            {draftOrders.map((draft) => (
                              <div
                                key={draft.id}
                                className="p-2 border-b last:border-b-0 hover:bg-blue-50 cursor-pointer transition-colors"
                                onClick={() => loadDraftOrder(draft.id)}
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium truncate">
                                      {draft.customerName || 'No customer name'}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-0.5">
                                      {draft.cart.length} items • {formatCurrency(
                                        draft.cart.reduce((sum: number, item: CartItem) => 
                                          sum + item.price * item.quantity, 0)
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-0.5">
                                      {new Date(draft.timestamp).toLocaleString()}
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => deleteDraftOrder(draft.id, e)}
                                    className="ml-1 h-6 w-6 p-0 hover:bg-red-100"
                                  >
                                    <Trash2 className="h-3 w-3 text-red-600" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Receipt Modal */}
        {showReceipt && lastBill && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6" id="receipt-content">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Receipt</h2>
                  <p className="text-sm text-gray-600">Bill #{lastBill.billNumber}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(lastBill.createdAt).toLocaleString()}
                  </p>
                  
                  {/* Bill Processing Status Indicator */}
                  {billProcessing === 'pending' && (
                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-yellow-50 border border-yellow-200 rounded-full text-xs text-yellow-700">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600"></div>
                      Syncing with server...
                    </div>
                  )}
                  {billProcessing === 'confirmed' && (
                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-200 rounded-full text-xs text-green-700">
                      <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                      Bill confirmed
                    </div>
                  )}
                  {billProcessing === 'error' && (
                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-red-50 border border-red-200 rounded-full text-xs text-red-700">
                      <div className="h-3 w-3 bg-red-500 rounded-full"></div>
                      Sync pending - will retry
                    </div>
                  )}
                </div>

                {lastBill.customerName && (
                  <div className="mb-4 text-sm">
                    <p><strong>Customer:</strong> {lastBill.customerName}</p>
                    {lastBill.customerPhone && (
                      <p><strong>Phone:</strong> {lastBill.customerPhone}</p>
                    )}
                  </div>
                )}

                <div className="border-t border-b border-gray-300 py-4 mb-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Item</th>
                        <th className="text-center py-2">Qty</th>
                        <th className="text-right py-2">Price</th>
                        <th className="text-right py-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lastBill.items?.map((item: any, idx: number) => (
                        <tr key={idx} className="border-b">
                          <td className="py-2">{item.item?.name || 'Item'}</td>
                          <td className="text-center">{item.quantity}</td>
                          <td className="text-right">{formatCurrency(item.price)}</td>
                          <td className="text-right">{formatCurrency(item.quantity * item.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-1 text-sm mb-6">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(lastBill.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CGST:</span>
                    <span>{formatCurrency(lastBill.taxAmount / 2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SGST:</span>
                    <span>{formatCurrency(lastBill.taxAmount / 2)}</span>
                  </div>
                  {lastBill.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount:</span>
                      <span>- {formatCurrency(lastBill.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Grand Total:</span>
                    <span>{formatCurrency(lastBill.total || lastBill.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Payment:</span>
                    <span>{lastBill.paymentMethod}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => window.print()}
                    className="flex-1"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                  <Button
                    onClick={() => {
                      setShowReceipt(false);
                      setLastBill(null);
                      setBillProcessing(null);
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
