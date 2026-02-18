'use client';

import { useEffect, useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/auth-provider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { TicketCheck, Clock, CheckCircle, Receipt, List, Grid, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  PREPARING: 'bg-blue-100 text-blue-800 border-blue-300',
  READY: 'bg-green-100 text-green-800 border-green-300',
  SERVED: 'bg-gray-100 text-gray-800 border-gray-300',
  CANCELLED: 'bg-red-100 text-red-800 border-red-300',
};

const STATUS_DOT_COLORS = {
  PENDING: 'bg-yellow-500',
  PREPARING: 'bg-blue-500',
  READY: 'bg-green-500',
  SERVED: 'bg-gray-500',
  CANCELLED: 'bg-red-500',
};

interface BatchItem {
  itemId: string;
  itemName: string;
  category: string;
  totalQuantity: number;
  pendingQuantity: number;
  preparingQuantity: number;
  readyQuantity: number;
  pendingKots: Array<{
    kotId: string;
    kotNumber: string;
    quantity: number;
    tableNumber: string;
    createdAt: string;
  }>;
  preparingKots: Array<{
    kotId: string;
    kotNumber: string;
    quantity: number;
    tableNumber: string;
    createdAt: string;
  }>;
  readyKots: Array<{
    kotId: string;
    kotNumber: string;
    quantity: number;
    tableNumber: string;
    createdAt: string;
  }>;
  oldestTime: Date;
  oldestPendingTime: Date | null;
}

export default function KOTPage() {
  const router = useRouter();
  const [kots, setKots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [viewMode, setViewMode] = useState<'kot' | 'batch'>('batch');
  const [sortBy, setSortBy] = useState<'quantity' | 'time' | 'category'>('quantity');

  useEffect(() => {
    loadKOTs();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadKOTs, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  const loadKOTs = async () => {
    try {
      const response = await api.kot.list(filter);
      setKots(response.data);
    } catch (error) {
      toast.error('Failed to load KOTs');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.kot.updateStatus(id, status);
      toast.success('KOT status updated');
      loadKOTs();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleNotedByChef = async () => {
    const pendingKots = kots.filter(kot => kot.status === 'PENDING');
    
    if (pendingKots.length === 0) {
      toast.error('No pending orders to acknowledge');
      return;
    }

    try {
      // Update all pending KOTs to PREPARING in parallel
      await Promise.all(
        pendingKots.map(kot => api.kot.updateStatus(kot.id, 'PREPARING'))
      );
      
      toast.success(`${pendingKots.length} order${pendingKots.length > 1 ? 's' : ''} acknowledged by chef`);
      loadKOTs();
    } catch (error) {
      toast.error('Failed to acknowledge orders');
    }
  };

  // Calculate unified batch items with status breakdown
  const batchItems = useMemo(() => {
    const itemMap = new Map<string, BatchItem>();

    // Process all KOTs and group by item
    kots.forEach((kot) => {
      kot.items.forEach((kotItem: any) => {
        const key = kotItem.itemId;
        const quantity = Number(kotItem.quantity) || 0;
        
        if (!itemMap.has(key)) {
          itemMap.set(key, {
            itemId: kotItem.itemId,
            itemName: kotItem.item.name,
            category: kotItem.item.category?.name || 'Uncategorized',
            totalQuantity: 0,
            pendingQuantity: 0,
            preparingQuantity: 0,
            readyQuantity: 0,
            pendingKots: [],
            preparingKots: [],
            readyKots: [],
            oldestTime: new Date(kot.createdAt),
            oldestPendingTime: null,
          });
        }
        
        const batchItem = itemMap.get(key)!;
        batchItem.totalQuantity += quantity;
        
        // Add to appropriate status bucket
        const kotData = {
          kotId: kot.id,
          kotNumber: kot.kotNumber,
          quantity: quantity,
          tableNumber: kot.tableNumber || 'N/A',
          createdAt: kot.createdAt,
        };
        
        if (kot.status === 'PENDING') {
          batchItem.pendingQuantity += quantity;
          batchItem.pendingKots.push(kotData);
          const kotTime = new Date(kot.createdAt);
          if (!batchItem.oldestPendingTime || kotTime < batchItem.oldestPendingTime) {
            batchItem.oldestPendingTime = kotTime;
          }
        } else if (kot.status === 'PREPARING') {
          batchItem.preparingQuantity += quantity;
          batchItem.preparingKots.push(kotData);
        } else if (kot.status === 'READY') {
          batchItem.readyQuantity += quantity;
          batchItem.readyKots.push(kotData);
        }
        
        // Track oldest time overall
        const kotTime = new Date(kot.createdAt);
        if (kotTime < batchItem.oldestTime) {
          batchItem.oldestTime = kotTime;
        }
      });
    });

    let items = Array.from(itemMap.values());
    
    // Sort items based on sortBy preference
    if (sortBy === 'quantity') {
      // Sort by pending quantity first (highest priority), then total
      items.sort((a, b) => {
        if (b.pendingQuantity !== a.pendingQuantity) {
          return b.pendingQuantity - a.pendingQuantity;
        }
        return b.totalQuantity - a.totalQuantity;
      });
    } else if (sortBy === 'time') {
      // Sort by oldest pending time first, then oldest overall time
      items.sort((a, b) => {
        if (a.oldestPendingTime && b.oldestPendingTime) {
          return a.oldestPendingTime.getTime() - b.oldestPendingTime.getTime();
        }
        if (a.oldestPendingTime) return -1;
        if (b.oldestPendingTime) return 1;
        return a.oldestTime.getTime() - b.oldestTime.getTime();
      });
    } else if (sortBy === 'category') {
      items.sort((a, b) => {
        const catCompare = a.category.localeCompare(b.category);
        if (catCompare !== 0) return catCompare;
        return b.pendingQuantity - a.pendingQuantity;
      });
    }
    
    return items;
  }, [kots, sortBy]);

  // Filter KOTs by status for display in right column
  const pendingKots = kots.filter(kot => kot.status === 'PENDING');
  const preparingKots = kots.filter(kot => kot.status === 'PREPARING');
  const readyKots = kots.filter(kot => kot.status === 'READY');

  const getTimeSince = (date: Date) => {
    const minutes = Math.floor((new Date().getTime() - date.getTime()) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 min ago';
    if (minutes < 60) return `${minutes} mins ago`;
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hour ago';
    return `${hours} hours ago`;
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
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Kitchen Order Tickets</h1>
              <p className="text-sm text-gray-500 mt-1">
                {viewMode === 'batch' 
                  ? 'Batch view - Item summary with pending orders and batch acknowledgment'
                  : 'Individual KOT view - Track specific orders'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <TicketCheck className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex items-center justify-between bg-white rounded-lg border p-4">
            <div className="flex gap-2">
              <Button
                variant={filter === '' ? 'default' : 'outline'}
                onClick={() => setFilter('')}
                size="sm"
              >
                All
              </Button>
              <Button
                variant={filter === 'PENDING' ? 'default' : 'outline'}
                onClick={() => setFilter('PENDING')}
                size="sm"
              >
                Pending
              </Button>
              <Button
                variant={filter === 'PREPARING' ? 'default' : 'outline'}
                onClick={() => setFilter('PREPARING')}
                size="sm"
              >
                Preparing
              </Button>
              <Button
                variant={filter === 'READY' ? 'default' : 'outline'}
                onClick={() => setFilter('READY')}
                size="sm"
              >
                Ready
              </Button>
            </div>

            <div className="flex items-center gap-4">
              {viewMode === 'batch' && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value="quantity">Quantity (High → Low)</option>
                    <option value="time">Time (Oldest First)</option>
                    <option value="category">Category (A → Z)</option>
                  </select>
                </div>
              )}
              
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('batch')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-all ${
                    viewMode === 'batch'
                      ? 'bg-white text-blue-600 shadow'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <List className="h-4 w-4" />
                  Batch View
                </button>
                <button
                  onClick={() => setViewMode('kot')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-all ${
                    viewMode === 'kot'
                      ? 'bg-white text-blue-600 shadow'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Grid className="h-4 w-4" />
                  Individual KOTs
                </button>
              </div>
            </div>
          </div>

          {/* Batch View */}
          {viewMode === 'batch' && (
            <div className="space-y-4">
              {batchItems.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-white rounded-lg border">
                  <TicketCheck className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-lg font-medium">No active orders</p>
                  <p className="text-sm">All caught up!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-[35%_65%] gap-6">
                  {/* Left Column: Item Summary (Read-Only) */}
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4 border-l-4 border-blue-500 sticky top-4">
                      <h2 className="text-lg font-bold text-gray-900 mb-1">Items Overview</h2>
                      <p className="text-sm text-gray-600">Real-time summary by item</p>
                    </div>
                    
                    <div className="space-y-3">
                      {batchItems.map((item) => (
                        <ItemSummaryCard 
                          key={item.itemId}
                          item={item}
                          getTimeSince={getTimeSince}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Right Column: KOT Lists by Status */}
                  <div className="space-y-6">
                    {/* Pending KOTs Section */}
                    {pendingKots.length > 0 && (
                      <div className="space-y-3">
                        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 border-l-4 border-yellow-500">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <AlertCircle className="h-6 w-6 text-yellow-600" />
                                Pending Orders ({pendingKots.length} KOTs)
                              </h2>
                              <p className="text-sm text-gray-600 mt-1">New orders waiting to be acknowledged</p>
                            </div>
                            <Button
                              onClick={handleNotedByChef}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 text-base"
                            >
                              Noted by Chef
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          {pendingKots.map((kot) => (
                            <KOTCard
                              key={kot.id}
                              kot={kot}
                              statusColor="yellow"
                              getTimeSince={getTimeSince}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Preparing KOTs Section */}
                    {preparingKots.length > 0 && (
                      <div className="space-y-3">
                        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4 border-l-4 border-blue-500">
                          <div className="flex items-center gap-3">
                            <Clock className="h-6 w-6 text-blue-600" />
                            <div>
                              <h2 className="text-xl font-bold text-gray-900">
                                Currently Preparing ({preparingKots.length} KOTs)
                              </h2>
                              <p className="text-sm text-gray-600 mt-1">Orders in progress</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          {preparingKots.map((kot) => (
                            <KOTCard
                              key={kot.id}
                              kot={kot}
                              statusColor="blue"
                              getTimeSince={getTimeSince}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Ready KOTs Section */}
                    {readyKots.length > 0 && (
                      <div className="space-y-3">
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border-l-4 border-green-500">
                          <div className="flex items-center gap-3">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                            <div>
                              <h2 className="text-xl font-bold text-gray-900">
                                Ready to Serve ({readyKots.length} KOTs)
                              </h2>
                              <p className="text-sm text-gray-600 mt-1">Completed orders ready for service</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          {readyKots.map((kot) => (
                            <KOTCard
                              key={kot.id}
                              kot={kot}
                              statusColor="green"
                              getTimeSince={getTimeSince}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Empty State */}
                    {pendingKots.length === 0 && preparingKots.length === 0 && readyKots.length === 0 && (
                      <div className="text-center py-8 text-gray-500 bg-white rounded-lg border">
                        <TicketCheck className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                        <p className="text-lg font-medium">No active orders</p>
                        <p className="text-sm">All caught up!</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* KOT View */}
          {viewMode === 'kot' && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {kots.map((kot) => (
                <Card key={kot.id} className="border-2 hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between">
                      <span className="text-lg">KOT #{kot.kotNumber}</span>
                      <span
                        className={`text-xs px-3 py-1 rounded-full border font-semibold ${
                          STATUS_COLORS[kot.status as keyof typeof STATUS_COLORS]
                        }`}
                      >
                        {kot.status}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Table:</span>
                        <span className="text-gray-600">{kot.tableNumber || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span className="text-gray-500 text-xs">
                          {formatDateTime(kot.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="border-t pt-3">
                      <div className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <span>Items</span>
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">
                          {kot.items.length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {kot.items.map((item: any, index: number) => (
                          <div key={index} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded">
                            <span className="text-sm font-medium text-gray-900">{item.item.name}</span>
                            <span className="text-sm font-bold text-blue-600">×{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {kot.notes && (
                      <div className="text-xs text-gray-600 bg-yellow-50 border border-yellow-200 rounded p-2">
                        <span className="font-medium">Note:</span> {kot.notes}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      {kot.status === 'PENDING' && (
                        <Button
                          size="sm"
                          onClick={() => updateStatus(kot.id, 'PREPARING')}
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                        >
                          <Clock className="mr-1 h-3 w-3" /> Start Preparing
                        </Button>
                      )}
                      {kot.status === 'PREPARING' && (
                        <Button
                          size="sm"
                          onClick={() => updateStatus(kot.id, 'READY')}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="mr-1 h-3 w-3" /> Mark Ready
                        </Button>
                      )}
                      {kot.status === 'READY' && (
                        <Button
                          size="sm"
                          onClick={() => updateStatus(kot.id, 'SERVED')}
                          className="flex-1"
                        >
                          Mark Served
                        </Button>
                      )}
                      {kot.status === 'SERVED' && (
                        <Button
                          size="sm"
                          onClick={() => router.push(`/pos?kotId=${kot.id}`)}
                          className="flex-1 bg-purple-600 hover:bg-purple-700"
                        >
                          <Receipt className="mr-1 h-3 w-3" /> Generate Bill
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {kots.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500">
                  <TicketCheck className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No KOTs found</p>
                </div>
              )}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

// Batch Item Card Component
// Item Summary Card for Left Column (Read-Only)
function ItemSummaryCard({ 
  item, 
  getTimeSince
}: { 
  item: BatchItem; 
  getTimeSince: (date: Date) => string;
}) {
  const timeSince = item.oldestPendingTime ? getTimeSince(item.oldestPendingTime) : getTimeSince(item.oldestTime);
  const isPendingUrgent = item.oldestPendingTime && (new Date().getTime() - item.oldestPendingTime.getTime()) > 15 * 60 * 1000;
  
  // Determine card border color based on priority
  let borderColor = 'border-gray-300';
  let bgColor = '';
  
  if (isPendingUrgent) {
    borderColor = 'border-red-400 border-l-4';
    bgColor = 'bg-red-50/30';
  } else if (item.pendingQuantity > 0) {
    borderColor = 'border-yellow-400 border-l-4';
    bgColor = 'bg-yellow-50/30';
  } else if (item.preparingQuantity > 0) {
    borderColor = 'border-blue-400 border-l-4';
    bgColor = 'bg-blue-50/30';
  } else if (item.readyQuantity > 0) {
    borderColor = 'border-green-400 border-l-4';
    bgColor = 'bg-green-50/30';
  }
  
  return (
    <Card className={`border-2 ${borderColor} ${bgColor}`}>
      <CardContent className="p-4">
        {/* Item Name and Info */}
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-base font-bold text-gray-900">{item.itemName}</h3>
          {isPendingUrgent && (
            <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold animate-pulse">
              <AlertCircle className="h-3 w-3" />
              URGENT
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2 mb-3 text-xs text-gray-600 flex-wrap">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeSince}
          </span>
          <span className="text-gray-400">•</span>
          <span className="bg-gray-100 px-2 py-0.5 rounded">
            {item.category}
          </span>
          <span className="text-gray-400">•</span>
          <span className="font-semibold text-gray-700">
            Total: {item.totalQuantity}
          </span>
        </div>
        
        {/* Three Status Pills */}
        <div className="grid grid-cols-3 gap-2">
          {/* Pending Pill */}
          <div className={`flex flex-col items-center p-3 rounded-lg border ${
            item.pendingQuantity > 0 
              ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300' 
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="text-xs font-semibold text-gray-600 mb-1">TODO</div>
            <div className={`text-2xl font-bold ${
              item.pendingQuantity > 0 ? 'text-yellow-600' : 'text-gray-400'
            }`}>
              {item.pendingQuantity}
            </div>
            <div className="text-xs text-gray-500 mt-1">TODO</div>
          </div>
          
          {/* Preparing Pill */}
          <div className={`flex flex-col items-center p-3 rounded-lg border ${
            item.preparingQuantity > 0 
              ? 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-300' 
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="text-xs font-semibold text-gray-600 mb-1">DOING</div>
            <div className={`text-2xl font-bold ${
              item.preparingQuantity > 0 ? 'text-blue-600' : 'text-gray-400'
            }`}>
              {item.preparingQuantity}
            </div>
            <div className="text-xs text-gray-500 mt-1">DOING</div>
          </div>
          
          {/* Ready Pill */}
          <div className={`flex flex-col items-center p-3 rounded-lg border ${
            item.readyQuantity > 0 
              ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300' 
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="text-xs font-semibold text-gray-600 mb-1">DONE</div>
            <div className={`text-2xl font-bold ${
              item.readyQuantity > 0 ? 'text-green-600' : 'text-gray-400'
            }`}>
              {item.readyQuantity}
            </div>
            <div className="text-xs text-gray-500 mt-1">DONE</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// KOT Card for Right Column
function KOTCard({ 
  kot, 
  statusColor,
  getTimeSince
}: { 
  kot: any;
  statusColor: 'yellow' | 'blue' | 'green';
  getTimeSince: (date: Date) => string;
}) {
  const timeSince = getTimeSince(new Date(kot.createdAt));
  const isUrgent = (new Date().getTime() - new Date(kot.createdAt).getTime()) > 15 * 60 * 1000;
  
  const colorClasses = {
    yellow: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-700',
      dot: 'bg-yellow-500'
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      dot: 'bg-blue-500'
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      dot: 'bg-green-500'
    }
  };
  
  const colors = colorClasses[statusColor];
  
  return (
    <Card className={`border-2 ${colors.border} ${colors.bg} hover:shadow-md transition-shadow`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                KOT #{kot.kotNumber}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                <span>Table {kot.tableNumber || 'N/A'}</span>
                <span className="text-gray-400">•</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {timeSince}
                </span>
                {isUrgent && statusColor === 'yellow' && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span className="text-red-600 font-semibold text-xs">URGENT</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Total Items</div>
            <div className="text-2xl font-bold text-gray-900">{kot.items.length}</div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-3">
          <div className="space-y-2">
            {kot.items.map((item: any, index: number) => (
              <div key={index} className="flex justify-between items-center bg-white px-3 py-2 rounded border border-gray-200">
                <div>
                  <span className="text-sm font-medium text-gray-900">{item.item.name}</span>
                  {item.item.category && (
                    <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      {item.item.category.name}
                    </span>
                  )}
                </div>
                <span className={`text-base font-bold ${colors.text}`}>
                  ×{item.quantity}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
