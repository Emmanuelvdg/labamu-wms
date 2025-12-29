'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState, useEffect } from 'react';

interface MetricDrillDownModalProps {
    isOpen: boolean;
    onClose: () => void;
    metricType: string;
    metricTitle: string;
    period: string;
}

export default function MetricDrillDownModal({
    isOpen,
    onClose,
    metricType,
    metricTitle,
    period
}: MetricDrillDownModalProps) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && metricType) {
            loadDrillDownData();
        }
    }, [isOpen, metricType, period]);

    const loadDrillDownData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('period', period);

            const endpoint = getEndpoint(metricType);
            const response = await fetch(`/api/reporting/analytics/drilldown/${endpoint}?${params}`);
            const result = await response.json();
            setData(Array.isArray(result) ? result : []);
        } catch (error) {
            console.error('Failed to load drill-down data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getEndpoint = (type: string) => {
        const map: Record<string, string> = {
            'stock-value': 'stock-value',
            'fulfillment': 'fulfillment',
            'stockout': 'stockout',
            'pending': 'pending-orders',
            'cycle-time': 'cycle-time',
            'capacity': 'capacity'
        };
        return map[type] || type;
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-xl">{metricTitle} - Detailed Breakdown</DialogTitle>
                    <p className="text-sm text-gray-500 mt-1">
                        Showing data for: {period === '7d' ? 'Last 7 Days' : period === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
                    </p>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto mt-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                        </div>
                    ) : data.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            No data available for this period
                        </div>
                    ) : (
                        renderTable(metricType, data)
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function renderTable(metricType: string, data: any[]) {
    switch (metricType) {
        case 'stock-value':
            return renderStockValueTable(data);
        case 'fulfillment':
            return renderFulfillmentTable(data);
        case 'stockout':
            return renderStockoutTable(data);
        case 'pending':
            return renderPendingOrdersTable(data);
        case 'cycle-time':
            return renderCycleTimeTable(data);
        case 'capacity':
            return renderCapacityTable(data);
        default:
            return <div className="text-center text-gray-500">No visualization available</div>;
    }
}

function renderStockValueTable(data: any[]) {
    return (
        <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Cost</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Value</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {data.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.productSku}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.productName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.category}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.location}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.quantity}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">Rp {row.unitCost?.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">Rp {row.totalValue?.toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function renderFulfillmentTable(data: any[]) {
    return (
        <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shipped</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fulfilled</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {data.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{row.orderId.substring(0, 8)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.customerName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.status === 'SHIPPED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                    {row.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(row.createdAt).toLocaleDateString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.shippedAt ? new Date(row.shippedAt).toLocaleDateString() : '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {row.fulfilled ? '✅' : '⏳'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function renderStockoutTable(data: any[]) {
    return (
        <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reorder Point</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Update</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {data.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.sku}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.category}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.reorderPoint}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(row.lastStockUpdate).toLocaleDateString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function renderPendingOrdersTable(data: any[]) {
    return (
        <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age (Days)</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {data.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{row.orderId.substring(0, 8)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.customerName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                    {row.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.itemCount}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(row.createdAt).toLocaleDateString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.ageDays}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function renderCycleTimeTable(data: any[]) {
    return (
        <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shipped</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cycle Time (hrs)</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {data.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{row.orderId.substring(0, 8)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.customerName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(row.createdAt).toLocaleDateString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(row.shippedAt).toLocaleDateString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{row.cycleTimeHours}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function renderCapacityTable(data: any[]) {
    return (
        <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max Volume (m³)</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Used Volume (m³)</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilization</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {data.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.locationName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.maxVolumeM3}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.usedVolumeM3}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <div className="flex items-center">
                                    <span className="font-semibold text-gray-900">{row.utilizationPercent}%</span>
                                    <div className="ml-3 w-24 bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-blue-500 h-2 rounded-full"
                                            style={{ width: `${Math.min(row.utilizationPercent, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.items?.length || 0}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
