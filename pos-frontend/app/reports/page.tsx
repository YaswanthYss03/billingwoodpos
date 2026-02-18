'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/auth-provider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { TrendingUp, Download, FileText } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/auth';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [reportType, setReportType] = useState<'sales' | 'inventory' | 'top-items' | 'gst'>('sales');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reportData, setReportData] = useState<any>(null);
  const { tenant, user } = useAuthStore();

  // PDF-safe currency formatter (jsPDF doesn't support ₹ symbol properly)
  const formatCurrencyForPDF = (amount: number): string => {
    return `Rs. ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const loadReport = async () => {
    setLoading(true);
    try {
      let response;
      if (reportType === 'sales') {
        response = await api.reports.salesSummary(startDate, endDate);
      } else if (reportType === 'inventory') {
        response = await api.reports.inventoryValuation();
      } else if (reportType === 'gst') {
        response = await api.reports.salesSummary(startDate, endDate);
      } else {
        response = await api.reports.topSelling(30, 10);
      }
      setReportData(response.data);
    } catch (error) {
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const downloadAllReportsPDF = async () => {
    setDownloading(true);
    try {
      // Fetch all reports with graceful error handling
      const results = await Promise.allSettled([
        api.reports.salesSummary(startDate, endDate),
        api.reports.inventoryValuation(),
        api.reports.topSelling(30, 10),
      ]);

      // Extract data with fallbacks for failed requests
      const salesData = results[0].status === 'fulfilled' 
        ? results[0].value.data 
        : { totalSales: 0, totalBills: 0, averageBillValue: 0, paymentBreakdown: {}, userPerformance: {}, gstBreakdown: [] };
      
      const inventoryData = results[1].status === 'fulfilled' 
        ? results[1].value.data 
        : { items: [], totalValue: 0, totalItems: 0 };
      
      const topSellingData = results[2].status === 'fulfilled' 
        ? results[2].value.data 
        : [];

      // Show warnings for failed requests
      const failedRequests = results
        .map((result, idx) => ({ result, name: ['Sales Report', 'Inventory Report', 'Top Selling'][idx] }))
        .filter(({ result }) => result.status === 'rejected')
        .map(({ name, result }) => {
          const error = result.status === 'rejected' ? result.reason : null;
          console.error(`${name} failed:`, error);
          return name;
        });

      if (failedRequests.length > 0) {
        toast.error(`Some reports failed: ${failedRequests.join(', ')}. Generating PDF with available data.`, {
          duration: 4000,
        });
      }

      // Create PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const currentDate = format(new Date(), 'dd MMM yyyy, hh:mm a');
      
      // Header
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Complete Business Report', pageWidth / 2, 20, { align: 'center' });
      
      // Tenant Information
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const restaurantName = tenant?.name || user?.name || 'Restaurant';
      const tenantId = tenant?.id || user?.tenantId || 'N/A';
      doc.text(`Restaurant: ${restaurantName}`, 14, 35);
      doc.text(`Tenant ID: ${tenantId}`, 14, 41);
      doc.text(`Generated: ${currentDate}`, 14, 47);
      doc.text(`Report Period: ${format(new Date(startDate), 'dd MMM yyyy')} to ${format(new Date(endDate), 'dd MMM yyyy')}`, 14, 53);
      
      let yPos = 63;

      // 1. SALES REPORT
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('1. Sales Summary', 14, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const salesSummary = [
        ['Total Sales', formatCurrencyForPDF(salesData.totalSales || 0)],
        ['Total Bills', String(salesData.totalBills || 0)],
        ['Average Bill Value', formatCurrencyForPDF(salesData.averageBillValue || 0)],
      ];
      
      autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Value']],
        body: salesSummary,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;

      // 1.1 Payment Method Breakdown
      if (salesData.paymentBreakdown && Object.keys(salesData.paymentBreakdown).length > 0) {
        if (yPos > 240) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Payment Method Breakdown', 14, yPos);
        yPos += 8;
        
        const paymentRows = Object.entries(salesData.paymentBreakdown).map(([method, amount]: [string, any]) => [
          method,
          formatCurrencyForPDF(amount),
          `${((amount / salesData.totalSales) * 100).toFixed(1)}%`,
        ]);
        
        autoTable(doc, {
          startY: yPos,
          head: [['Payment Method', 'Amount', '% of Total']],
          body: paymentRows,
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246] },
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 15;
      }

      // 1.2 Cashier Performance
      if (salesData.userPerformance && Object.keys(salesData.userPerformance).length > 0) {
        if (yPos > 220) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Cashier Performance', 14, yPos);
        yPos += 8;
        
        const cashierRows = Object.entries(salesData.userPerformance)
          .sort(([, a]: any, [, b]: any) => b.totalSales - a.totalSales)
          .map(([userName, stats]: [string, any]) => [
            userName,
            String(stats.billCount),
            formatCurrencyForPDF(stats.totalSales),
            formatCurrencyForPDF(stats.totalSales / stats.billCount),
          ]);
        
        autoTable(doc, {
          startY: yPos,
          head: [['Cashier Name', 'Bills Processed', 'Total Sales', 'Avg Bill Value']],
          body: cashierRows,
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246] },
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 15;
      }

      // 2. GST REPORT
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('2. GST Breakdown', 14, yPos);
      yPos += 8;
      
      if (salesData.gstBreakdown && salesData.gstBreakdown.length > 0) {
        const gstRows = salesData.gstBreakdown.map((row: any) => [
          `${row.gstRate}%`,
          formatCurrencyForPDF(row.taxableAmount),
          formatCurrencyForPDF(row.gstAmount / 2),
          formatCurrencyForPDF(row.gstAmount / 2),
          formatCurrencyForPDF(row.gstAmount),
        ]);
        
        autoTable(doc, {
          startY: yPos,
          head: [['GST Rate', 'Taxable Amount', 'CGST', 'SGST', 'Total GST']],
          body: gstRows,
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246] },
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 15;
      } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.text('No GST data available', 14, yPos);
        yPos += 15;
      }

      // 3. TOP SELLING ITEMS
      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('3. Top Selling Items (Last 30 Days)', 14, yPos);
      yPos += 8;
      
      if (Array.isArray(topSellingData) && topSellingData.length > 0) {
        const topItemsRows = topSellingData.map((item: any) => [
          item.itemName,
          String(item.quantitySold),
          formatCurrencyForPDF(item.revenue),
        ]);
        
        autoTable(doc, {
          startY: yPos,
          head: [['Item Name', 'Quantity Sold', 'Revenue']],
          body: topItemsRows,
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246] },
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 15;
      } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.text('No top selling items data available', 14, yPos);
        yPos += 15;
      }

      // 4. INVENTORY REPORT
      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('4. Inventory Valuation', 14, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Inventory Value: ${formatCurrencyForPDF(inventoryData.totalValue || 0)}`, 14, yPos);
      yPos += 8;
      
      if (inventoryData.items && inventoryData.items.length > 0) {
        const inventoryRows = inventoryData.items.map((item: any) => [
          item.itemName,
          item.category,
          `${item.totalQuantity} ${item.unit}`,
          formatCurrencyForPDF(item.totalValue),
        ]);
        
        autoTable(doc, {
          startY: yPos,
          head: [['Item Name', 'Category', 'Quantity', 'Value']],
          body: inventoryRows,
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246] },
        });
      }

      // Footer on last page
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text(
          `Page ${i} of ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      // Save PDF
      const fileName = `${restaurantName.replace(/\s+/g, '_')}_Report_${format(new Date(), 'ddMMMyyyy_HHmm')}.pdf`;
      doc.save(fileName);
      
      toast.success('Report downloaded successfully!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF report');
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [reportType]);

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
            <div className="flex gap-2">
              <Button onClick={loadReport} variant="outline">
                <Download className="mr-2 h-4 w-4" /> Refresh
              </Button>
              <Button 
                onClick={downloadAllReportsPDF} 
                disabled={downloading}
                className="bg-green-600 hover:bg-green-700"
              >
                <FileText className="mr-2 h-4 w-4" />
                {downloading ? 'Generating PDF...' : 'Download Complete Report (PDF)'}
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant={reportType === 'sales' ? 'default' : 'outline'}
              onClick={() => setReportType('sales')}
            >
              Sales Report
            </Button>
            <Button
              variant={reportType === 'gst' ? 'default' : 'outline'}
              onClick={() => setReportType('gst')}
            >
              GST Report
            </Button>
            <Button
              variant={reportType === 'inventory' ? 'default' : 'outline'}
              onClick={() => setReportType('inventory')}
            >
              Inventory Report
            </Button>
            <Button
              variant={reportType === 'top-items' ? 'default' : 'outline'}
              onClick={() => setReportType('top-items')}
            >
              Top Selling
            </Button>
          </div>

          {reportType === 'sales' && (
            <Card>
              <CardHeader>
                <CardTitle>Sales Report</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Start Date</label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">End Date</label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Button onClick={loadReport}>Generate Report</Button>
                  </div>
                </div>

                {reportData && (
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="border rounded-lg p-4">
                        <div className="text-sm text-gray-500">Total Sales</div>
                        <div className="text-2xl font-bold text-gray-900">
                          {formatCurrency(reportData.totalSales || 0)}
                        </div>
                      </div>
                      <div className="border rounded-lg p-4">
                        <div className="text-sm text-gray-500">Total Bills</div>
                        <div className="text-2xl font-bold text-gray-900">{reportData.totalBills || 0}</div>
                      </div>
                      <div className="border rounded-lg p-4">
                        <div className="text-sm text-gray-500">Avg Bill Value</div>
                        <div className="text-2xl font-bold text-gray-900">
                          {formatCurrency(reportData.averageBillValue || 0)}
                        </div>
                      </div>
                    </div>

                    {/* Payment Breakdown */}
                    {reportData.paymentBreakdown && Object.keys(reportData.paymentBreakdown).length > 0 && (
                      <div className="border-t pt-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Method Breakdown</h3>
                        <div className="grid gap-4 md:grid-cols-3">
                          {Object.entries(reportData.paymentBreakdown).map(([method, amount]: [string, any]) => (
                            <div key={method} className="border rounded-lg p-4 bg-gray-50">
                              <div className="text-sm text-gray-600 uppercase">{method}</div>
                              <div className="text-xl font-bold text-gray-900 mt-1">
                                {formatCurrency(amount)}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {((amount / reportData.totalSales) * 100).toFixed(1)}% of total
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* User Performance */}
                    {reportData.userPerformance && Object.keys(reportData.userPerformance).length > 0 && (
                      <div className="border-t pt-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cashier Performance</h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Cashier Name</TableHead>
                              <TableHead className="text-right">Bills Processed</TableHead>
                              <TableHead className="text-right">Total Sales</TableHead>
                              <TableHead className="text-right">Avg Bill Value</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Object.entries(reportData.userPerformance)
                              .sort(([, a]: any, [, b]: any) => b.totalSales - a.totalSales)
                              .map(([userName, stats]: [string, any]) => (
                                <TableRow key={userName}>
                                  <TableCell className="font-medium">{userName}</TableCell>
                                  <TableCell className="text-right">{stats.billCount}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(stats.totalSales)}</TableCell>
                                  <TableCell className="text-right">
                                    {formatCurrency(stats.totalSales / stats.billCount)}
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {reportType === 'gst' && (
            <Card>
              <CardHeader>
                <CardTitle>GST Report</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Start Date</label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">End Date</label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Button onClick={loadReport}>Generate Report</Button>
                  </div>
                </div>

                {reportData && (
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="border rounded-lg p-4 bg-blue-50">
                        <div className="text-sm text-gray-700">Total Sales (Before Tax)</div>
                        <div className="text-2xl font-bold text-gray-900">
                          {formatCurrency((reportData.totalSales || 0) - (reportData.totalTax || 0))}
                        </div>
                      </div>
                      <div className="border rounded-lg p-4 bg-green-50">
                        <div className="text-sm text-gray-700">Total GST Collected</div>
                        <div className="text-2xl font-bold text-gray-900">
                          {formatCurrency(reportData.totalTax || 0)}
                        </div>
                      </div>
                      <div className="border rounded-lg p-4 bg-purple-50">
                        <div className="text-sm text-gray-700">Total Sales (Including Tax)</div>
                        <div className="text-2xl font-bold text-gray-900">
                          {formatCurrency(reportData.totalSales || 0)}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="border rounded-lg p-4">
                        <div className="text-lg font-semibold text-gray-900 mb-2">CGST</div>
                        <div className="text-3xl font-bold text-blue-600">
                          {formatCurrency((reportData.totalTax || 0) / 2)}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">Central GST</div>
                      </div>
                      <div className="border rounded-lg p-4">
                        <div className="text-lg font-semibold text-gray-900 mb-2">SGST</div>
                        <div className="text-3xl font-bold text-green-600">
                          {formatCurrency((reportData.totalTax || 0) / 2)}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">State GST</div>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">GST Summary by Rate</h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>GST Rate</TableHead>
                            <TableHead>Taxable Amount</TableHead>
                            <TableHead>CGST</TableHead>
                            <TableHead>SGST</TableHead>
                            <TableHead>Total Tax</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportData.gstBreakdown?.map((row: any) => (
                            <TableRow key={row.gstRate}>
                              <TableCell className="font-medium">{row.gstRate}%</TableCell>
                              <TableCell>{formatCurrency(row.taxableAmount)}</TableCell>
                              <TableCell>{formatCurrency(row.gstAmount / 2)}</TableCell>
                              <TableCell>{formatCurrency(row.gstAmount / 2)}</TableCell>
                              <TableCell className="font-semibold">{formatCurrency(row.gstAmount)}</TableCell>
                            </TableRow>
                          )) || (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-gray-500">
                                No GST breakdown data available
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {reportType === 'inventory' && reportData && (
            <Card>
              <CardHeader>
                <CardTitle>Inventory Valuation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="text-sm text-gray-500">Total Inventory Value</div>
                  <div className="text-3xl font-bold text-gray-900">
                    {formatCurrency(reportData.totalValue || 0)}
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.items?.map((item: any) => (
                      <TableRow key={item.itemName}>
                        <TableCell className="font-medium">{item.itemName}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>
                          {item.totalQuantity} {item.unit}
                        </TableCell>
                        <TableCell>{formatCurrency(item.totalValue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {reportType === 'top-items' && reportData && (
            <Card>
              <CardHeader>
                <CardTitle>Top Selling Items (Last 30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                {Array.isArray(reportData) && reportData.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Quantity Sold</TableHead>
                        <TableHead>Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.map((item: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.itemName}</TableCell>
                          <TableCell>{item.quantitySold}</TableCell>
                          <TableCell>{formatCurrency(item.revenue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No top selling items data available
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {loading && (
            <div className="text-center py-8 text-gray-500">Loading report...</div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
