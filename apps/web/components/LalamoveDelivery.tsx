'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Truck, MapPin, Phone, User, ExternalLink, Package } from 'lucide-react';

interface LalamoveDeliveryProps {
    orderId: string;
    warehouseId: string;
}

export function LalamoveDelivery({ orderId, warehouseId }: LalamoveDeliveryProps) {
    const [quotation, setQuotation] = useState<any>(null);
    const [lalamoveOrder, setLalamoveOrder] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [bookingLoading, setBookingLoading] = useState(false);

    const getQuotation = async () => {
        setLoading(true);
        try {
            const response = await fetch(
                `/api/lalamove/quotation/${orderId}?warehouseId=${warehouseId}`
            );
            if (response.ok) {
                const data = await response.json();
                setQuotation(data);
            } else {
                alert('Failed to get quotation');
            }
        } catch (error) {
            console.error('Error getting quotation:', error);
            alert('Error getting quotation');
        } finally {
            setLoading(false);
        }
    };

    const bookDelivery = async () => {
        if (!quotation?.quotationId) return;

        setBookingLoading(true);
        try {
            const response = await fetch(`/api/lalamove/orders/${orderId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    warehouseId,
                    quotationId: quotation.quotationId,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setLalamoveOrder(data);
                setQuotation(null); // Clear quotation after booking
                alert('Delivery booked successfully!');
            } else {
                alert('Failed to book delivery');
            }
        } catch (error) {
            console.error('Error booking delivery:', error);
            alert('Error booking delivery');
        } finally {
            setBookingLoading(false);
        }
    };

    const refreshStatus = async () => {
        if (!lalamoveOrder?.lalamoveOrderId) return;

        setLoading(true);
        try {
            const response = await fetch(
                `/api/lalamove/orders/${lalamoveOrder.lalamoveOrderId}`
            );
            if (response.ok) {
                const data = await response.json();
                setLalamoveOrder({ ...lalamoveOrder, ...data });
            }
        } catch (error) {
            console.error('Error refreshing status:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return 'bg-green-100 text-green-800';
            case 'ON_GOING':
            case 'PICKED_UP':
                return 'bg-blue-100 text-blue-800';
            case 'ASSIGNING_DRIVER':
                return 'bg-yellow-100 text-yellow-800';
            case 'CANCELLED':
            case 'REJECTED':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Truck className="h-5 w-5" />
                        Lalamove Delivery
                    </CardTitle>
                    {lalamoveOrder?.status && (
                        <Badge className={getStatusColor(lalamoveOrder.status)}>
                            {lalamoveOrder.status.replace(/_/g, ' ')}
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Quotation Section */}
                {!lalamoveOrder && (
                    <div className="space-y-3">
                        {!quotation ? (
                            <Button onClick={getQuotation} disabled={loading} className="w-full">
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Get Delivery Quote
                            </Button>
                        ) : (
                            <div className="space-y-3">
                                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-medium">Quoted Price:</span>
                                        <span className="text-2xl font-bold text-blue-700">
                                            {quotation.currency} {quotation.price}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        <div>Service Type: <span className="font-medium">{quotation.serviceType}</span></div>
                                        <div>Quote expires: {new Date(quotation.expiresAt).toLocaleString()}</div>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        onClick={bookDelivery}
                                        disabled={bookingLoading}
                                        className="flex-1"
                                    >
                                        {bookingLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Book Delivery
                                    </Button>
                                    <Button variant="outline" onClick={() => setQuotation(null)}>
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Delivery Details Section */}
                {lalamoveOrder && (
                    <div className="space-y-4">
                        {/* Order Info */}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <span className="text-gray-500">Order ID:</span>
                                <p className="font-mono text-xs">{lalamoveOrder.lalamoveOrderId}</p>
                            </div>
                            <div>
                                <span className="text-gray-500">Service Type:</span>
                                <p className="font-medium">{lalamoveOrder.serviceType}</p>
                            </div>
                            <div>
                                <span className="text-gray-500">Quoted Price:</span>
                                <p className="font-medium">
                                    {lalamoveOrder.currency} {lalamoveOrder.quotedPrice}
                                </p>
                            </div>
                            {lalamoveOrder.finalPrice && (
                                <div>
                                    <span className="text-gray-500">Final Price:</span>
                                    <p className="font-medium">
                                        {lalamoveOrder.currency} {lalamoveOrder.finalPrice}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Driver Info */}
                        {lalamoveOrder.driverId && (
                            <div className="border-t pt-3">
                                <h4 className="font-medium mb-2 flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Driver Information
                                </h4>
                                <div className="space-y-1 text-sm">
                                    {lalamoveOrder.driverName && (
                                        <p><span className="text-gray-500">Name:</span> {lalamoveOrder.driverName}</p>
                                    )}
                                    {lalamoveOrder.driverPhone && (
                                        <p className="flex items-center gap-2">
                                            <Phone className="h-3 w-3 text-gray-500" />
                                            {lalamoveOrder.driverPhone}
                                        </p>
                                    )}
                                    {lalamoveOrder.driverPlate && (
                                        <p><span className="text-gray-500">Vehicle:</span> {lalamoveOrder.driverPlate}</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Tracking Link */}
                        {lalamoveOrder.shareLink && (
                            <div className="border-t pt-3">
                                <a
                                    href={lalamoveOrder.shareLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                                >
                                    <MapPin className="h-4 w-4" />
                                    Track Delivery
                                    <ExternalLink className="h-3 w-3" />
                                </a>
                            </div>
                        )}

                        {/* Proof of Delivery */}
                        {lalamoveOrder.podImageUrl && (
                            <div className="border-t pt-3">
                                <h4 className="font-medium mb-2 flex items-center gap-2">
                                    <Package className="h-4 w-4" />
                                    Proof of Delivery
                                </h4>
                                <div className="space-y-2">
                                    <Badge className={getStatusColor(lalamoveOrder.podStatus || 'PENDING')}>
                                        {lalamoveOrder.podStatus || 'PENDING'}
                                    </Badge>
                                    {lalamoveOrder.podImageUrl && (
                                        <div className="border rounded-md overflow-hidden">
                                            <img
                                                src={lalamoveOrder.podImageUrl}
                                                alt="Proof of Delivery"
                                                className="w-full h-auto"
                                            />
                                        </div>
                                    )}
                                    {lalamoveOrder.deliveredAt && (
                                        <p className="text-sm text-gray-600">
                                            Delivered: {new Date(lalamoveOrder.deliveredAt).toLocaleString()}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Refresh Button */}
                        <Button
                            variant="outline"
                            onClick={refreshStatus}
                            disabled={loading}
                            className="w-full"
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Refresh Status
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
