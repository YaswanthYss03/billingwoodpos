'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/auth-provider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/lib/api';
import { 
  Crown, 
  Calendar, 
  RefreshCw, 
  Building2, 
  Mail, 
  Phone, 
  Edit2,
  Save,
  X,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/utils';

export default function AboutPage() {
  const { tenant, user, setTenant, loading: authLoading } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [tenantName, setTenantName] = useState('');

  useEffect(() => {
    if (tenant?.name) {
      setTenantName(tenant.name);
    }
  }, [tenant]);

  const handleSaveTenantName = async () => {
    if (!tenantName.trim()) {
      toast.error('Business name cannot be empty');
      return;
    }

    setLoading(true);
    try {
      const response = await api.tenants.update({ name: tenantName });
      // Update the tenant in the auth store with the full tenant object
      if (tenant) {
        setTenant({
          ...tenant,
          name: tenantName,
        });
      }
      toast.success('Business name updated successfully');
      setEditing(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update business name');
    } finally {
      setLoading(false);
    }
  };

  const subscriptionStartDate = tenant?.createdAt ? new Date(tenant.createdAt) : new Date();
  const subscriptionRenewalDate = new Date(subscriptionStartDate);
  subscriptionRenewalDate.setMonth(subscriptionRenewalDate.getMonth() + 1);

  // Show loading state if auth is still loading or tenant data is not yet loaded or incomplete
  if (authLoading || !tenant || !tenant.id) {
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
          <h1 className="text-3xl font-bold text-gray-900">About & Settings</h1>

          {/* Business Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="mr-2 h-5 w-5 text-blue-600" />
                Business Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name
                </label>
                {user?.role === 'OWNER' && editing ? (
                  <div className="flex gap-2">
                    <Input
                      value={tenantName}
                      onChange={(e) => setTenantName(e.target.value)}
                      placeholder="Enter business name"
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSaveTenantName}
                      disabled={loading}
                      size="sm"
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                    <Button
                      onClick={() => {
                        setEditing(false);
                        setTenantName(tenant.name);
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-gray-900">{tenantName}</span>
                    {user?.role === 'OWNER' && (
                      <Button
                        onClick={() => setEditing(true)}
                        variant="outline"
                        size="sm"
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Type
                  </label>
                  <div className="text-gray-900 font-medium">{tenant.businessType}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tenant ID
                  </label>
                  <div className="text-gray-600 text-sm font-mono">
                    {tenant.id && tenant.id.length >= 8 
                      ? `${tenant.id.substring(0, 8)}...` 
                      : tenant.id || 'Loading...'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Details */}
          <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="flex items-center text-blue-900">
                <Crown className="mr-2 h-5 w-5 text-blue-600" />
                Subscription Plan - STARTER
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Monthly Price:</span>
                  <span className="text-2xl font-bold text-blue-900">₹999/month</span>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
                    <Calendar className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="text-xs text-gray-600">Subscription Started</div>
                      <div className="font-semibold text-gray-900">
                        {formatDate(subscriptionStartDate)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
                    <RefreshCw className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="text-xs text-gray-600">Next Renewal</div>
                      <div className="font-semibold text-gray-900">
                        {formatDate(subscriptionRenewalDate)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-blue-200 pt-4 space-y-3">
                  <h4 className="text-sm font-semibold text-gray-900">Current Plan Usage:</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Locations</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: '100%' }}></div>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">1 / 1</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Users</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: '50%' }}></div>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">1 / 2</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Items</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: '10%' }}></div>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">10 / 100</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-blue-200 pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Features Included:</h4>
                  <div className="grid md:grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Basic POS & Billing
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Items & Categories Management
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Inventory Tracking
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Basic Reports
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      User Management (2 users)
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Email Support
                    </div>
                  </div>
                </div>

                <div className="border-t border-blue-200 pt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Upgrade to Get More:</h4>
                  <div className="space-y-4">
                    <div className="p-4 bg-white rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-semibold text-gray-900">Professional Plan</h5>
                        <span className="text-lg font-bold text-blue-900">₹2,999/month</span>
                      </div>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>✓ Up to 5 users</li>
                        <li>✓ Up to 500 items</li>
                        <li>✓ KOT System</li>
                        <li>✓ Advanced Reports & Analytics</li>
                      </ul>
                    </div>

                    <div className="p-4 bg-white rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-semibold text-gray-900">Enterprise Plan</h5>
                        <span className="text-lg font-bold text-blue-900">₹9,999/month</span>
                      </div>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>✓ Unlimited users & items</li>
                        <li>✓ Multi-location support</li>
                        <li>✓ Custom integrations</li>
                        <li>✓ Priority support</li>
                      </ul>
                    </div>
                  </div>

                  <Button className="w-full mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Upgrade Your Plan
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Support & Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Phone className="mr-2 h-5 w-5 text-green-600" />
                Support & Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Need help? Our support team is here to assist you with any questions or issues.
              </p>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="text-sm text-gray-600">Email Support</div>
                    <a 
                      href="mailto:support@pavakie.com" 
                      className="font-semibold text-blue-600 hover:underline"
                    >
                      support@pavakie.com
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <Phone className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="text-sm text-gray-600">Phone Support</div>
                    <div className="font-semibold text-gray-900">
                      <a href="tel:+918608084220" className="hover:text-green-600">+91 8608084220</a>
                      {' • '}
                      <a href="tel:+919159441887" className="hover:text-green-600">+91 9159441887</a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Support Hours</h4>
                <p className="text-sm text-gray-600">
                  Monday - Saturday: 9:00 AM - 6:00 PM IST<br />
                  Sunday: Closed
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
