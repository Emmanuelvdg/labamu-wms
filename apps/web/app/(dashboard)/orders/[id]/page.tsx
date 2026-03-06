'use client';

import { useState, useEffect, use } from 'react';
import { fetchOrder, checkAvailability, updateCustomer, cancelOrder, deleteOrder, updateOrderStatus } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DeleteConfirmationModal } from '@/components/DeleteConfirmationModal';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Package, Truck, AlertCircle, Ban, Trash2, CheckCircle2, PackageCheck } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import OrderShipping from '@/components/OrderShipping';

export default function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [customerPhone, setCustomerPhone] = useState('');
    const [savingPhone, setSavingPhone] = useState(false);

    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    useEffect(() => {
        loadOrder();
    }, [id]);

    async function loadOrder() {
        try {
            const data = await fetchOrder(id);
            setOrder(data);
            setCustomerPhone(data.customer?.phone || '');
        } catch (error) {
            console.error('Failed to fetch order:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleCheckAvailability = async () => {
        try {
            await checkAvailability(id);
            loadOrder();
        } catch (error: any) {
            console.error('Failed to check availability:', error);
            alert(error.message || 'Failed to check availability');
        }
    };



    const handleCancel = async () => {
        try {
            await cancelOrder(id);
            toast.success('Order cancelled');
            setShowCancelDialog(false);
            loadOrder();
        } catch (error: any) {
            toast.error(error.message || 'Failed to cancel order');
        }
    };

    const handleDelete = async () => {
        try {
            await deleteOrder(id);
            toast.success('Order deleted');
            setShowDeleteDialog(false); // Clean up though we redirect
            router.push('/orders');
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete order');
        }
    };

    const handleAdvanceStatus = async (newStatus: string) => {
        try {
            await updateOrderStatus(id, newStatus);
            toast.success(`Order status updated to ${newStatus}`);
            loadOrder();
        } catch (error: any) {
            toast.error(error.message || 'Failed to update order status');
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;
    if (!order) return <div className="p-8">Order not found</div>;

    // Calculate Fulfillment Stats
    const getFulfillmentStats = (productId: string) => {
        const ordered = order.items.find((i: any) => i.productId === productId)?.quantity || 0;

        // Reserved Quantity
        const reserved = order.reservations
            ?.filter((r: any) => r.productId === productId)
            .reduce((sum: number, r: any) => sum + r.quantity, 0) || 0;

        // Picked Quantity
        const picked = order.pickingTasks
            ?.filter((t: any) => t.productId === productId)
            .reduce((sum: number, t: any) => sum + t.pickedQuantity, 0) || 0;

        return { ordered, reserved, picked };
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-6">
                <Link href="/orders" className="text-gray-500 hover:text-gray-700 flex items-center gap-2 mb-4">
                    <ArrowLeft className="h-4 w-4" /> Back to Orders
                </Link>
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            Order #{order.id.substring(0, 8)}
                            <span className={`px-3 py-1 rounded-full text-sm font-medium 
                                ${order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                    order.status === 'RESERVED' ? 'bg-blue-100 text-blue-800' :
                                        order.status === 'PICKING' ? 'bg-purple-100 text-purple-800' :
                                            order.status === 'PACKING' ? 'bg-indigo-100 text-indigo-800' :
                                                order.status === 'PACKED' ? 'bg-teal-100 text-teal-800' :
                                                    order.status === 'SHIPPED' ? 'bg-green-100 text-green-800' :
                                                        order.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' :
                                                            order.status === 'EXCEPTION' ? 'bg-red-100 text-red-800' :
                                                                order.status === 'CANCELLED' ? 'bg-gray-100 text-gray-800' :
                                                                    'bg-gray-100 text-gray-800'}`}>
                                {order.status}
                            </span>
                        </h1>
                        <p className="text-gray-500 mt-1">Customer: {order.customer?.name || order.customerId}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-500">Created: {format(new Date(order.createdAt), 'PPP')}</p>
                        {order.expectedDate && (
                            <p className="text-sm text-gray-500">Expected: {format(new Date(order.expectedDate), 'PPP')}</p>
                        )}
                    </div>
                </div>

                {/* Visual Fulfillment Stepper */}
                {!['PENDING', 'CANCELLED'].includes(order.status) && (
                    <div className="mt-6 mb-2">
                        <div className="flex items-center justify-between max-w-2xl mx-auto">
                            {[
                                { key: 'RESERVED', label: 'Reserved', icon: '📋' },
                                { key: 'PICKING', label: 'Picking', icon: '🛒' },
                                { key: 'PACKING', label: 'Packing', icon: '📦' },
                                { key: 'PACKED', label: 'Packed', icon: '✅' },
                                { key: 'SHIPPED', label: 'Shipped', icon: '🚚' },
                                { key: 'DELIVERED', label: 'Delivered', icon: '🏠' },
                            ].map((step, idx, arr) => {
                                const statusOrder = ['RESERVED', 'PICKING', 'PACKING', 'PACKED', 'SHIPPED', 'DELIVERED'];
                                const currentIdx = statusOrder.indexOf(order.status);
                                const stepIdx = statusOrder.indexOf(step.key);
                                const isCompleted = stepIdx < currentIdx;
                                const isCurrent = step.key === order.status;

                                return (
                                    <div key={step.key} className="flex items-center flex-1">
                                        <div className="flex flex-col items-center">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-all
                                                ${isCompleted ? 'bg-green-100 border-green-500 text-green-700' :
                                                    isCurrent ? 'bg-blue-100 border-blue-500 text-blue-700 ring-2 ring-blue-200' :
                                                        'bg-gray-100 border-gray-300 text-gray-400'}`}>
                                                {isCompleted ? '✓' : step.icon}
                                            </div>
                                            <span className={`text-xs mt-1 font-medium
                                                ${isCompleted ? 'text-green-700' :
                                                    isCurrent ? 'text-blue-700' :
                                                        'text-gray-400'}`}>
                                                {step.label}
                                            </span>
                                        </div>
                                        {idx < arr.length - 1 && (
                                            <div className={`flex-1 h-0.5 mx-2 mt-[-16px]
                                                ${stepIdx < currentIdx ? 'bg-green-400' : 'bg-gray-200'}`} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Status-Specific Action Buttons */}
                <div className="mt-4 flex justify-end gap-2">
                    {/* PENDING: Check Availability */}
                    {order.status === 'PENDING' && (
                        <>
                            <Button variant="outline" onClick={() => setShowCancelDialog(true)} className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                                <Ban className="w-4 h-4 mr-2" />
                                Cancel Order
                            </Button>
                            <Button onClick={handleCheckAvailability}>
                                Check Availability
                            </Button>
                        </>
                    )}

                    {/* RESERVED / PICKING / EXCEPTION: Cancel only */}
                    {['RESERVED', 'EXCEPTION', 'PICKING'].includes(order.status) && (
                        <Button variant="outline" onClick={() => setShowCancelDialog(true)} className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                            <Ban className="w-4 h-4 mr-2" />
                            Cancel Order
                        </Button>
                    )}

                    {/* PACKING: Confirm Packing Complete */}
                    {order.status === 'PACKING' && (
                        <>
                            <Button variant="outline" onClick={() => setShowCancelDialog(true)} className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                                <Ban className="w-4 h-4 mr-2" />
                                Cancel Order
                            </Button>
                            <Button onClick={() => handleAdvanceStatus('PACKED')} className="bg-teal-600 hover:bg-teal-700">
                                <PackageCheck className="w-4 h-4 mr-2" />
                                Confirm Packing Complete
                            </Button>
                        </>
                    )}

                    {/* PACKED: Shipping form is shown via OrderShipping component */}

                    {/* SHIPPED: Mark as Delivered */}
                    {order.status === 'SHIPPED' && (
                        <Button onClick={() => handleAdvanceStatus('DELIVERED')} className="bg-green-600 hover:bg-green-700">
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Mark as Delivered
                        </Button>
                    )}
                </div>

                {/* Delete Button - shown separately for Cancelled/Draft orders */}
                {(order.status === 'CANCELLED' || (order.status === 'PENDING' && (!order.reservations || order.reservations.length === 0))) && (
                    <div className="mt-4 flex justify-end">
                        <Button variant="outline" onClick={() => setShowDeleteDialog(true)} className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Order
                        </Button>
                    </div>
                )}
            </div>

            {/* Dialogs */}
            <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Order?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to cancel this order? Any reservations will be released. This action can be undone by creating a new order.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep Order</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancel} className="bg-red-600 hover:bg-red-700">Yes, Cancel Order</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <DeleteConfirmationModal
                isOpen={showDeleteDialog}
                onClose={() => setShowDeleteDialog(false)}
                onConfirm={handleDelete}
                resourceName={`Order #${order.id.substring(0, 8)}`}
                resourceType="Order"
                // Orders don't have standard dependency checks in this flow usually, or we can add one if needed.
                // For now, assume force delete or no check needed if it meets the criteria above.
                dependencyCheckUrl={undefined}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Order Summary Card */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Package className="h-5 w-5 text-blue-600" />
                        Order Summary
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Priority</span>
                            <span className="font-medium">{order.priority}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Total Items</span>
                            <span className="font-medium">{order.items.length}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Warehouse</span>
                            <span className="font-medium">{order.warehouse?.name || order.warehouseId || 'N/A'}</span>
                        </div>
                    </div>
                </div>

                {/* Shipping Info Card */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Truck className="h-5 w-5 text-green-600" />
                        Shipping Info
                    </h3>

                    <OrderShipping order={order} onUpdate={loadOrder} />

                    {order.shipment && (
                        <div className="mt-4 pt-4 border-t space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Carrier</span>
                                <span className="font-medium">{order.shipment.carrier}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Tracking ID</span>
                                <span className="font-medium">{order.shipment.trackingId}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Status</span>
                                <span className="font-medium">{order.shipment.status}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Lalamove Delivery - for Orders with Lalamove delivery
                {/* Lalamove delivery functionality is now integrated into OrderShipping component above */}

            </div>

            {/* Exceptions Card */}
            {order.status === 'EXCEPTION' && (
                <div className="bg-red-50 p-6 rounded-xl shadow-sm border border-red-200">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-red-800">
                        <AlertCircle className="h-5 w-5" />
                        Exceptions Detected
                    </h3>
                    <div className="space-y-2">
                        {order.pickingTasks
                            ?.filter((t: any) => t.status === 'FAILED' || t.status === 'PARTIALLY_PICKED')
                            .map((t: any) => (
                                <div key={t.id} className="text-sm text-red-700 bg-white p-2 rounded border border-red-100">
                                    <p className="font-medium">Product: {t.product?.name || t.productId}</p>
                                    <p>Reason: {t.exceptionReason}</p>
                                    <p>Picked: {t.pickedQuantity} / {t.quantity}</p>
                                </div>
                            ))}
                    </div>
                </div>
            )}
            {/* Line Items Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Line Items & Fulfillment</h2>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ordered</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Reserved</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Picked</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {order.items.map((item: any) => {
                            const stats = getFulfillmentStats(item.productId);
                            const progress = Math.min(100, Math.round((stats.picked / stats.ordered) * 100));

                            return (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{item.product.name}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {item.product.sku}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                                        {stats.ordered}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 text-right font-medium">
                                        {stats.reserved}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right font-bold">
                                        {stats.picked}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap align-middle">
                                        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 max-w-[100px] ml-auto">
                                            <div
                                                className={`h-2.5 rounded-full ${progress === 100 ? 'bg-green-600' :
                                                    progress > 0 ? 'bg-blue-600' : 'bg-gray-400'
                                                    }`}
                                                style={{ width: `${progress}%` }}
                                            ></div>
                                        </div>
                                        <p className="text-xs text-gray-500 text-right mt-1">{progress}%</p>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
