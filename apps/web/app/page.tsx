'use client';

import { useEffect, useState } from 'react';
import { fetchAnalytics, fetchInventory } from '@/lib/api';

export default function Dashboard() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const analyticsData = await fetchAnalytics();
        const productsData = await fetchInventory();
        setAnalytics(analyticsData);
        setProducts(productsData);
      } catch (err) {
        setError('Failed to connect to the backend. Please ensure the API server is running at http://localhost:3001');
      }
    }
    loadData();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded max-w-md text-center">
          <p className="font-bold">Connection Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!analytics) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Labamu IMS Dashboard</h1>
        <p className="text-gray-600">Inventory & Fulfillment Overview</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Stock Value</h3>
          <p className="text-2xl font-bold text-green-600">
            Rp {analytics.totalStockValue.toLocaleString('id-ID')}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Pending Orders</h3>
          <p className="text-2xl font-bold text-blue-600">{analytics.pendingOrders}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Low Stock Items</h3>
          <p className="text-2xl font-bold text-red-600">{analytics.lowStockItems}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Product Inventory</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => (
              <tr key={product.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.sku}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.category}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {product.expiryDate ? new Date(product.expiryDate).toLocaleDateString('id-ID') : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
