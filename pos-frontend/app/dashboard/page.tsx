'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/auth-provider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import { 
  TrendingUp, 
  Package, 
  AlertCircle, 
  TicketCheck, 
  DollarSign,
  ShoppingCart,
  TrendingDown,
  Percent,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user, hasRole } = useAuthStore();

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      }
      
      // Dashboard endpoint requires OWNER or MANAGER role
      if (!hasRole(['OWNER', 'MANAGER'])) {
        toast.error('You do not have permission to view dashboard metrics');
        setLoading(false);
        return;
      }

      const response = await api.reports.dashboard(forceRefresh);
      setMetrics(response.data);
      
      if (forceRefresh) {
        toast.success('Dashboard refreshed!');
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        toast.error('You do not have permission to view dashboard metrics');
      } else {
        toast.error('Failed to load dashboard metrics');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
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
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <button
              onClick={() => loadMetrics(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {/* Metrics Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Today's Sales
                </CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(metrics?.todaySales?.totalSales || 0)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {metrics?.todaySales?.totalBills || 0} bills today
                </p>
                <p className="text-xs text-gray-500">
                  Avg: {formatCurrency(metrics?.todaySales?.averageBillValue || 0)} per bill
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Sales Growth
                </CardTitle>
                {metrics?.salesGrowth >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  metrics?.salesGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {metrics?.salesGrowth >= 0 ? '+' : ''}{metrics?.salesGrowth?.toFixed(1) || 0}%
                </div>
                <p className="text-xs text-gray-500 mt-1">vs yesterday</p>
                <p className="text-xs text-gray-500">
                  Yesterday: {formatCurrency(metrics?.yesterdaySales?.totalSales || 0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Low Stock Items
                </CardTitle>
                <AlertCircle className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{metrics?.lowStockCount || 0}</div>
                <p className="text-xs text-gray-500 mt-1">items need restock</p>
                {metrics?.lowStockCount > 0 && (
                  <a href="/inventory" className="text-xs text-orange-600 hover:underline">
                    View low stock →
                  </a>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Pending KOTs
                </CardTitle>
                <TicketCheck className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{metrics?.pendingKots || 0}</div>
                <p className="text-xs text-gray-500 mt-1">orders in kitchen</p>
                {metrics?.pendingKots > 0 && (
                  <a href="/kot" className="text-xs text-purple-600 hover:underline">
                    View KOTs →
                  </a>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Payment Breakdown Card */}
          {metrics?.todaySales?.paymentBreakdown && 
           Object.keys(metrics.todaySales.paymentBreakdown).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShoppingCart className="mr-2 h-5 w-5 text-blue-600" />
                  Today's Payment Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(metrics.todaySales.paymentBreakdown).map(([method, amount]: [string, any]) => (
                    <div key={method} className="p-4 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">{method}</div>
                      <div className="text-lg font-bold text-gray-900">
                        {formatCurrency(amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tax Summary Card */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Percent className="mr-2 h-5 w-5 text-indigo-600" />
                  Today's Tax Collection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Tax Collected</span>
                    <span className="text-xl font-bold text-gray-900">
                      {formatCurrency(metrics?.todaySales?.totalTax || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm text-gray-600">Net Sales (Before Tax)</span>
                    <span className="text-lg font-semibold text-gray-900">
                      {formatCurrency(
                        (metrics?.todaySales?.totalSales || 0) - (metrics?.todaySales?.totalTax || 0)
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <a
                    href="/pos"
                    className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <ShoppingCart className="h-8 w-8 mb-2 text-blue-600" />
                    <div className="font-medium text-gray-900 text-sm">New Bill</div>
                  </a>
                  <a
                    href="/items"
                    className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Package className="h-8 w-8 mb-2 text-green-600" />
                    <div className="font-medium text-gray-900 text-sm">Items</div>
                  </a>
                  {metrics?.pendingKots > 0 && (
                    <a
                      href="/kot"
                      className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <TicketCheck className="h-8 w-8 mb-2 text-purple-600" />
                      <div className="font-medium text-gray-900 text-sm">KOT</div>
                    </a>
                  )}
                  {metrics?.lowStockCount > 0 && (
                    <a
                      href="/inventory"
                      className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <AlertCircle className="h-8 w-8 mb-2 text-orange-600" />
                      <div className="font-medium text-gray-900 text-sm">Check Stock</div>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
