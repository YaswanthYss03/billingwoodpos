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
import { 
  Search, 
  Filter, 
  Calendar, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Eye,
  Download,
  RefreshCw,
  ShoppingBag,
  DollarSign,
  XCircle,
  ChevronDown,
  Settings2,
} from 'lucide-react';
import toast from 'react-hot-toast';

type OrderType = 'ALL' | 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
type OrderStatus = 'ALL' | 'COMPLETED' | 'CANCELLED';
type DateFilter = 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM';
type PaymentMethod = 'ALL' | 'CASH' | 'UPI' | 'CARD';

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState<OrderType>('ALL');
  const [statusFilter, setStatusFilter] = useState<OrderStatus>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilter>('TODAY');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Advanced filters
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<PaymentMethod>('ALL');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  
  const ordersPerPage = 15;

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [orders, searchQuery, orderTypeFilter, statusFilter, dateFilter, customStartDate, customEndDate, paymentMethodFilter, minAmount, maxAmount]);

  const loadOrders = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const response = await api.billing.list({ refresh: forceRefresh });
      setOrders(response.data || []);
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    switch (dateFilter) {
      case 'TODAY':
        return { start: today, end: endOfDay };
      
      case 'YESTERDAY':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const endYesterday = new Date(yesterday);
        endYesterday.setHours(23, 59, 59, 999);
        return { start: yesterday, end: endYesterday };
      
      case 'THIS_WEEK':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        return { start: startOfWeek, end: endOfDay };
      
      case 'THIS_MONTH':
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return { start: startOfMonth, end: endOfDay };
      
      case 'CUSTOM':
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          return { start, end };
        }
        return null;
      
      default:
        return { start: today, end: endOfDay };
    }
  };

  const applyFilters = () => {
    let filtered = [...orders];

    // Date filter
    const dateRange = getDateRange();
    if (dateRange) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= dateRange.start && orderDate <= dateRange.end;
      });
    }

    // Order type filter
    if (orderTypeFilter !== 'ALL') {
      filtered = filtered.filter(order => order.orderType === orderTypeFilter);
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(order => 
        statusFilter === 'COMPLETED' ? order.status === 'COMPLETED' : order.status === 'CANCELLED'
      );
    }

    // Search filter (bill number, customer name, phone)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order => 
        order.billNumber?.toLowerCase().includes(query) ||
        order.customerName?.toLowerCase().includes(query) ||
        order.customerPhone?.includes(query)
      );
    }

    // Payment method filter (advanced)
    if (paymentMethodFilter !== 'ALL') {
      filtered = filtered.filter(order => order.paymentMethod === paymentMethodFilter);
    }

    // Amount range filter (advanced)
    if (minAmount) {
      filtered = filtered.filter(order => Number(order.totalAmount) >= Number(minAmount));
    }
    if (maxAmount) {
      filtered = filtered.filter(order => Number(order.totalAmount) <= Number(maxAmount));
    }

    // Sort by date (most recent first)
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    setFilteredOrders(filtered);
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setOrderTypeFilter('ALL');
    setStatusFilter('ALL');
    setDateFilter('TODAY');
    setCustomStartDate('');
    setCustomEndDate('');
    setPaymentMethodFilter('ALL');
    setMinAmount('');
    setMaxAmount('');
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (searchQuery) count++;
    if (orderTypeFilter !== 'ALL') count++;
    if (statusFilter !== 'ALL') count++;
    if (dateFilter !== 'TODAY') count++;
    if (paymentMethodFilter !== 'ALL') count++;
    if (minAmount || maxAmount) count++;
    return count;
  };

  const getActiveFilters = () => {
    const filters = [];
    if (searchQuery) filters.push({ label: `Search: ${searchQuery}`, clear: () => setSearchQuery('') });
    if (orderTypeFilter !== 'ALL') filters.push({ label: orderTypeFilter.replace('_', ' '), clear: () => setOrderTypeFilter('ALL') });
    if (statusFilter !== 'ALL') filters.push({ label: statusFilter, clear: () => setStatusFilter('ALL') });
    if (dateFilter !== 'TODAY') filters.push({ label: dateFilter.replace('_', ' '), clear: () => { setDateFilter('TODAY'); setCustomStartDate(''); setCustomEndDate(''); } });
    if (paymentMethodFilter !== 'ALL') filters.push({ label: `Payment: ${paymentMethodFilter}`, clear: () => setPaymentMethodFilter('ALL') });
    if (minAmount || maxAmount) filters.push({ label: `Amount: ${minAmount || '0'} - ${maxAmount || '∞'}`, clear: () => { setMinAmount(''); setMaxAmount(''); } });
    return filters;
  };

  const viewOrderDetails = async (orderId: string) => {
    try {
      const response = await api.billing.get(orderId);
      setSelectedOrder(response.data);
      setShowOrderDetails(true);
    } catch (error) {
      toast.error('Failed to load order details');
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
  const startIndex = (currentPage - 1) * ordersPerPage;
  const endIndex = startIndex + ordersPerPage;
  const currentOrders = filteredOrders.slice(startIndex, endIndex);

  // Summary calculations
  const totalRevenue = filteredOrders
    .filter(o => o.status !== 'CANCELLED')
    .reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);
  const totalOrders = filteredOrders.filter(o => o.status !== 'CANCELLED').length;
  const cancelledOrders = filteredOrders.filter(o => o.status === 'CANCELLED').length;

  const getOrderTypeBadge = (type: string) => {
    const badges = {
      DINE_IN: 'bg-blue-100 text-blue-800',
      TAKEAWAY: 'bg-green-100 text-green-800',
      DELIVERY: 'bg-purple-100 text-purple-800',
    };
    return badges[type as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentMethodBadge = (method: string) => {
    const badges = {
      CASH: 'bg-green-100 text-green-800',
      CARD: 'bg-blue-100 text-blue-800',
      UPI: 'bg-purple-100 text-purple-800',
    };
    return badges[method as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Order View</h1>
              <p className="text-gray-500 mt-1">View and manage all orders</p>
            </div>
            <Button
              onClick={() => loadOrders(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-500">Total Orders</div>
                    <div className="text-3xl font-bold text-gray-900 mt-1">{totalOrders}</div>
                  </div>
                  <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <ShoppingBag className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-500">Total Revenue</div>
                    <div className="text-3xl font-bold text-green-600 mt-1">{formatCurrency(totalRevenue)}</div>
                  </div>
                  <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-500">Cancelled Orders</div>
                    <div className="text-3xl font-bold text-red-600 mt-1">{cancelledOrders}</div>
                  </div>
                  <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Modern Filter Bar */}
          <Card>
            <CardContent className="p-4">
              {/* Single-row filter controls */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Search Input */}
                <div className="relative flex-1 min-w-[280px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search orders..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Date Dropdown */}
                <div className="relative">
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                    className="h-10 pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="TODAY">Today</option>
                    <option value="YESTERDAY">Yesterday</option>
                    <option value="THIS_WEEK">This Week</option>
                    <option value="THIS_MONTH">This Month</option>
                    <option value="CUSTOM">Custom Range</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>

                {/* Order Type Segmented Pills */}
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  {(['ALL', 'DINE_IN', 'TAKEAWAY', 'DELIVERY'] as OrderType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setOrderTypeFilter(type)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                        orderTypeFilter === type
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {type === 'ALL' ? 'All' : type.replace('_', '-')}
                    </button>
                  ))}
                </div>

                {/* Status Dropdown */}
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as OrderStatus)}
                    className="h-10 pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">All Status</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>

                {/* Advanced Filters Button */}
                <Button
                  variant="outline"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="h-10 gap-2"
                >
                  <Settings2 className="h-4 w-4" />
                  Filters
                  {getActiveFilterCount() > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-600 rounded">
                      {getActiveFilterCount()}
                    </span>
                  )}
                </Button>
              </div>

              {/* Custom Date Range (when CUSTOM is selected) */}
              {dateFilter === 'CUSTOM' && (
                <div className="flex gap-3 mt-3 pt-3 border-t">
                  <div className="flex-1">
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      placeholder="Start date"
                      className="h-10"
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      placeholder="End date"
                      className="h-10"
                    />
                  </div>
                </div>
              )}

              {/* Active Filter Chips */}
              {getActiveFilters().length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t">
                  <span className="text-xs font-medium text-gray-500">Active filters:</span>
                  {getActiveFilters().map((filter, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium"
                    >
                      {filter.label}
                      <button
                        onClick={filter.clear}
                        className="hover:bg-blue-100 rounded p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <button
                    onClick={clearAllFilters}
                    className="text-xs font-medium text-gray-500 hover:text-gray-700 underline"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Advanced Filters Drawer */}
          {showAdvancedFilters && (
            <Card className="border-2 border-blue-200 bg-blue-50/30">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Advanced Filters</h3>
                  <button
                    onClick={() => setShowAdvancedFilters(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Payment Method */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Method
                    </label>
                    <select
                      value={paymentMethodFilter}
                      onChange={(e) => setPaymentMethodFilter(e.target.value as PaymentMethod)}
                      className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ALL">All Methods</option>
                      <option value="CASH">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="CARD">Card</option>
                    </select>
                  </div>

                  {/* Min Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Min Amount
                    </label>
                    <Input
                      type="number"
                      placeholder="₹0"
                      value={minAmount}
                      onChange={(e) => setMinAmount(e.target.value)}
                      className="h-10"
                    />
                  </div>

                  {/* Max Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Amount
                    </label>
                    <Input
                      type="number"
                      placeholder="No limit"
                      value={maxAmount}
                      onChange={(e) => setMaxAmount(e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6 pt-4 border-t">
                  <Button
                    onClick={() => {
                      setPaymentMethodFilter('ALL');
                      setMinAmount('');
                      setMaxAmount('');
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Clear Advanced
                  </Button>
                  <Button
                    onClick={() => setShowAdvancedFilters(false)}
                    className="flex-1"
                  >
                    Apply Filters
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Orders Table */}
          <Card>
            <CardHeader>
              <CardTitle>
                Orders ({filteredOrders.length})
                {dateFilter === 'TODAY' && ' - Today'}
                {dateFilter === 'YESTERDAY' && ' - Yesterday'}
                {dateFilter === 'THIS_WEEK' && ' - This Week'}
                {dateFilter === 'THIS_MONTH' && ' - This Month'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12 text-gray-400">
                  <RefreshCw className="h-12 w-12 mx-auto mb-2 animate-spin" />
                  <p>Loading orders...</p>
                </div>
              ) : currentOrders.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Filter className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No orders found</p>
                  <p className="text-sm mt-1">Try adjusting your filters</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Bill No.</TableHead>
                          <TableHead>Date & Time</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Order Type</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentOrders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium text-blue-600">
                              {order.billNumber}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>{new Date(order.createdAt).toLocaleDateString()}</div>
                                <div className="text-gray-500">
                                  {new Date(order.createdAt).toLocaleTimeString()}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div className="font-medium">{order.customerName || '-'}</div>
                                <div className="text-gray-500">{order.customerPhone || '-'}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getOrderTypeBadge(order.orderType || 'DINE_IN')}`}>
                                {order.orderType?.replace('_', ' ') || 'DINE IN'}
                              </span>
                            </TableCell>
                            <TableCell>{order.items?.length || 0}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentMethodBadge(order.paymentMethod || 'CASH')}`}>
                                {order.paymentMethod || 'CASH'}
                              </span>
                            </TableCell>
                            <TableCell className="font-semibold">
                              {formatCurrency(order.totalAmount)}
                            </TableCell>
                            <TableCell>
                              {order.status === 'CANCELLED' ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Cancelled
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Completed
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => viewOrderDetails(order.id)}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-between items-center mt-4 pt-4 border-t">
                      <div className="text-sm text-gray-500">
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredOrders.length)} of {filteredOrders.length} orders
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const pageNum = i + 1;
                            return (
                              <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setCurrentPage(pageNum)}
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                          {totalPages > 5 && <span className="px-2">...</span>}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Order Details Modal */}
          {showOrderDetails && selectedOrder && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <CardHeader className="border-b">
                  <div className="flex justify-between items-center">
                    <CardTitle>Order Details - {selectedOrder.billNumber}</CardTitle>
                    <button
                      onClick={() => setShowOrderDetails(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {/* Order Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-500">Date & Time</label>
                      <div className="font-medium">
                        {new Date(selectedOrder.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Order Type</label>
                      <div className="font-medium">{selectedOrder.orderType?.replace('_', ' ') || 'N/A'}</div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Customer Name</label>
                      <div className="font-medium">{selectedOrder.customerName || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Phone</label>
                      <div className="font-medium">{selectedOrder.customerPhone || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Payment Method</label>
                      <div className="font-medium">{selectedOrder.paymentMethod || 'N/A'}</div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Status</label>
                      <div className="font-medium">
                        {selectedOrder.status === 'CANCELLED' ? (
                          <span className="text-red-600">Cancelled</span>
                        ) : (
                          <span className="text-green-600">Completed</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Items */}
                  <div>
                    <h3 className="font-semibold mb-2">Order Items</h3>
                    {selectedOrder.items && selectedOrder.items.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>GST</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedOrder.items.map((billItem: any, index: number) => (
                            <TableRow key={index}>
                              <TableCell>{billItem.item?.name || billItem.itemName || 'N/A'}</TableCell>
                              <TableCell>{billItem.quantity || 0}</TableCell>
                              <TableCell>{formatCurrency(billItem.price || 0)}</TableCell>
                              <TableCell>{billItem.gstRate || 0}%</TableCell>
                              <TableCell className="text-right">
                                {formatCurrency((billItem.quantity || 0) * (billItem.price || 0))}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 text-gray-400 border rounded-lg">
                        <p>No items found for this order</p>
                      </div>
                    )}
                  </div>

                  {/* Totals */}
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Subtotal</span>
                      <span className="font-medium">{formatCurrency(selectedOrder.subtotal || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Tax</span>
                      <span className="font-medium">{formatCurrency(selectedOrder.taxAmount || 0)}</span>
                    </div>
                    {selectedOrder.discount && selectedOrder.discount > 0 && (
                      <div className="flex justify-between text-sm text-red-600">
                        <span>Discount</span>
                        <span>-{formatCurrency(selectedOrder.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                      <span>Total Amount</span>
                      <span>{formatCurrency(selectedOrder.totalAmount || 0)}</span>
                    </div>
                  </div>

                  {selectedOrder.status === 'CANCELLED' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="text-sm font-medium text-red-800">Cancellation Reason:</div>
                      <div className="text-sm text-red-600">{selectedOrder.cancelReason || 'No reason provided'}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
