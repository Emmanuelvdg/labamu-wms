'use client';

import { useEffect, useState } from 'react';
import { fetchAnalytics, fetchInventory } from '@/lib/api';
import DateRangeFilter from '@/components/DateRangeFilter';
import MetricDrillDownModal from '@/components/MetricDrillDownModal';
import {
  TrendingUp,
  Package,
  AlertTriangle,
  Clock,
  BarChart3,
  Database,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface DashboardAnalytics {
  totalStockValue: number;
  fulfillmentRate: number;
  stockoutRate: number;
  pendingOrders: number;
  avgCycleTime: string | number;
  capacityUtilization: number;
  categoryValue: Record<string, number>;
  dailySales: { date: string; count: number }[];
}

export default function Dashboard() {
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7d');
  const [drillDownModal, setDrillDownModal] = useState<{
    isOpen: boolean;
    metricType: string;
    metricTitle: string;
  }>({
    isOpen: false,
    metricType: '',
    metricTitle: ''
  });

  useEffect(() => {
    loadData();
  }, [period]);

  async function loadData() {
    try {
      setLoading(true);
      const [analyticsData, productsData] = await Promise.all([
        fetchAnalytics(),
        fetchInventory()
      ]);
      setAnalytics(analyticsData);
      setProducts(productsData);
    } catch (err: any) {
      console.error(err);
      if (err.message && (err.message.includes('Unauthorized') || err.message.includes('Forbidden'))) {
        window.location.href = '/login';
        return;
      }
      setError('Failed to connect to the backend. Please ensure the API server is running.');
    } finally {
      setLoading(false);
    }
  }

  const handleFilterChange = (newPeriod: string) => {
    setPeriod(newPeriod);
  };

  const handleMetricDoubleClick = (metricType: string, metricTitle: string) => {
    setDrillDownModal({
      isOpen: true,
      metricType,
      metricTitle
    });
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg shadow-sm max-w-md text-center">
          <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-red-500" />
          <p className="font-bold text-lg mb-1">Connection Error</p>
          <p className="text-sm opacity-90">{error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-8 bg-blue-600 rounded-full animate-bounce mb-4"></div>
          <p className="text-gray-500 font-medium">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 font-medium">No dashboard data available.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-blue-600 hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Calculate max value for charts
  const maxSales = Math.max(...analytics.dailySales.map(d => d.count), 5);
  const maxCategoryValue = Math.max(...Object.values(analytics.categoryValue), 1000);

  return (
    <div className="min-h-screen bg-gray-50/50 p-8 space-y-8">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard Overview</h1>
          <p className="text-gray-500 mt-1">Real-time insights into your inventory and fulfillment performance.</p>
        </div>

        {/* Date Filter */}
        <DateRangeFilter onFilterChange={handleFilterChange} />
      </header>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <KpiCard
          title="Total Stock Value"
          value={`Rp ${analytics.totalStockValue.toLocaleString('id-ID')}`}
          icon={<Database className="h-5 w-5 text-blue-600" />}
          trend="Current Asset Value"
          color="blue"
          onDoubleClick={() => handleMetricDoubleClick('stock-value', 'Total Stock Value')}
        />
        <KpiCard
          title="Fulfillment Rate"
          value={`${analytics.fulfillmentRate}%`}
          icon={<TrendingUp className="h-5 w-5 text-green-600" />}
          trend="Orders Shipped"
          color="green"
          onDoubleClick={() => handleMetricDoubleClick('fulfillment', 'Fulfillment Rate')}
        />
        <KpiCard
          title="Stockout Rate"
          value={`${analytics.stockoutRate}%`}
          icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
          trend="Items Out of Stock"
          color="red"
          onDoubleClick={() => handleMetricDoubleClick('stockout', 'Stockout Rate')}
        />
        <KpiCard
          title="Pending Orders"
          value={analytics.pendingOrders}
          icon={<Package className="h-5 w-5 text-orange-600" />}
          trend="To be processed"
          color="orange"
          onDoubleClick={() => handleMetricDoubleClick('pending', 'Pending Orders')}
        />
        <KpiCard
          title="Avg Cycle Time"
          value={`${analytics.avgCycleTime} hrs`}
          icon={<Clock className="h-5 w-5 text-purple-600" />}
          trend="Created to Shipped"
          color="purple"
          onDoubleClick={() => handleMetricDoubleClick('cycle-time', 'Avg Cycle Time')}
        />
        <KpiCard
          title="Warehouse Capacity"
          value={`${analytics.capacityUtilization}%`}
          icon={<BarChart3 className="h-5 w-5 text-indigo-600" />}
          trend="Volume Utilized"
          color="indigo"
          onDoubleClick={() => handleMetricDoubleClick('capacity', 'Warehouse Capacity')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Daily Sales Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Daily Sales Trend (Last 5 Days)</h3>
          <div className="h-64 flex items-end justify-between space-x-4 px-2">
            {analytics.dailySales.map((day) => (
              <div key={day.date} className="flex flex-col items-center flex-1 group">
                <div className="relative w-full flex items-end justify-center h-full">
                  <div
                    className="w-full max-w-[60px] bg-blue-500 rounded-t-md transition-all duration-500 ease-out group-hover:bg-blue-600 relative"
                    style={{ height: `${(day.count / maxSales) * 100}%`, minHeight: '4px' }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {day.count} Orders
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-3 font-medium">{day.date}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Inventory Value by Category</h3>
          <div className="space-y-5">
            {Object.entries(analytics.categoryValue).map(([category, value]) => (
              <div key={category}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-gray-700">{category}</span>
                  <span className="text-gray-900 font-semibold">Rp {value.toLocaleString('id-ID')}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-2.5 rounded-full transition-all duration-1000"
                    style={{ width: `${(value / maxCategoryValue) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
            {Object.keys(analytics.categoryValue).length === 0 && (
              <p className="text-gray-400 text-center py-10">No inventory data available.</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Inventory Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">Recent Inventory</h2>
          <span className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full border border-gray-200">
            Total Items: {products.length}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {products.slice(0, 10).map((product) => {
                const totalStock = product.inventory?.reduce((sum: number, i: any) => sum + i.quantity, 0) || 0;
                return (
                  <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.sku}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{product.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {product.category || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">{totalStock}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {totalStock > 0 ? (
                        <span className="inline-flex items-center text-green-600 font-medium text-xs">
                          <span className="w-1.5 h-1.5 bg-green-600 rounded-full mr-2"></span>
                          In Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-red-600 font-medium text-xs">
                          <span className="w-1.5 h-1.5 bg-red-600 rounded-full mr-2"></span>
                          Out of Stock
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {products.length > 10 && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/30 text-center">
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">View All Products</button>
          </div>
        )}
      </div>

      {/* Drill-Down Modal */}
      <MetricDrillDownModal
        isOpen={drillDownModal.isOpen}
        onClose={() => setDrillDownModal({ isOpen: false, metricType: '', metricTitle: '' })}
        metricType={drillDownModal.metricType}
        metricTitle={drillDownModal.metricTitle}
        period={period}
      />
    </div>
  );
}

function KpiCard({ title, value, icon, trend, color, onDoubleClick }: any) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  };

  return (
    <div
      className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer"
      onDoubleClick={onDoubleClick}
      title="Double-click for details"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color] || 'bg-gray-100'}`}>
          {icon}
        </div>
      </div>
      <div className="mt-4 flex items-center text-sm">
        <span className="text-gray-400 font-medium">{trend}</span>
      </div>
    </div>
  );
}
