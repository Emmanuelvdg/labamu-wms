'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWarehouses, fetchLocations, fetchInventory } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Search, MapPin, Package, Barcode } from 'lucide-react';
import { toast } from 'sonner';

export default function ScanPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [warehouseId, setWarehouseId] = useState<string | null>(null);

    // Data
    const [locations, setLocations] = useState<any[]>([]);

    // UI State
    const [query, setQuery] = useState('');
    const [result, setResult] = useState<any | null>(null);
    const [resultType, setResultType] = useState<'LOCATION' | 'PRODUCT' | null>(null);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        init();
    }, []);

    async function init() {
        try {
            const warehouses = await fetchWarehouses();
            if (!warehouses || warehouses.length === 0) {
                setLoading(false);
                return;
            }
            const whId = warehouses[0].id; // Default
            setWarehouseId(whId);

            // Pre-fetch locations for fast lookup? Or fetch on demand? 
            // For MVP pre-fetch is faster for barcode scanning response
            const locData = await fetchLocations(whId);
            setLocations(locData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleScan() {
        if (!query.trim()) return;
        setSearching(true);
        setResult(null);
        setResultType(null);

        try {
            const q = query.trim().toUpperCase();

            // 1. Check Locations (Exact or startsWith)
            // Exact match priority
            const exactLoc = locations.find(l => l.shortCode?.toUpperCase() === q || l.name?.toUpperCase() === q);
            if (exactLoc) {
                setResult(exactLoc);
                setResultType('LOCATION');
                setSearching(false);
                return;
            }

            // 2. Check Products (API Search)
            const products = await fetchInventory({ search: query, warehouseId: warehouseId || undefined });
            if (products && products.length > 0) {
                // Try to find exact SKU match
                const exactSku = products.find((p: any) => p.sku.toUpperCase() === q);
                if (exactSku) {
                    setResult(exactSku);
                    setResultType('PRODUCT');
                } else {
                    // Just show first or list? Let's show first for scanner (usually exact)
                    setResult(products[0]);
                    setResultType('PRODUCT');
                }
            } else {
                toast.error('No Location or Product found');
            }
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSearching(false);
        }
    }

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="p-4 space-y-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
                <h1 className="text-xl font-bold mb-2 flex items-center">
                    <Barcode className="w-6 h-6 mr-2 text-indigo-600" />
                    Quick Scan
                </h1>
                <div className="flex space-x-2">
                    <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Scan Location or SKU"
                        onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                        className="text-lg"
                        autoFocus
                    />
                    <Button onClick={handleScan} disabled={searching}>
                        {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </Button>
                </div>
            </div>

            {/* Result Display */}
            {result && resultType === 'LOCATION' && (
                <Card className="border-t-4 border-t-amber-500">
                    <CardContent className="p-4 space-y-2">
                        <div className="flex items-center text-amber-600 font-bold uppercase text-sm">
                            <MapPin className="w-4 h-4 mr-1" /> Location
                        </div>
                        <h2 className="text-2xl font-bold">{result.shortCode || result.name}</h2>
                        <div className="text-gray-500 text-sm">Type: {result.type}</div>
                        {/* Show contents if available? fetchInventory with locationId filter if api supports */}
                    </CardContent>
                </Card>
            )}

            {result && resultType === 'PRODUCT' && (
                <Card className="border-t-4 border-t-blue-500">
                    <CardContent className="p-4 space-y-2">
                        <div className="flex items-center text-blue-600 font-bold uppercase text-sm">
                            <Package className="w-4 h-4 mr-1" /> Product
                        </div>
                        <h2 className="text-2xl font-bold">{result.sku}</h2>
                        <p className="text-lg">{result.name}</p>

                        <div className="grid grid-cols-2 gap-4 mt-4 bg-gray-50 p-2 rounded">
                            <div className="text-center">
                                <div className="text-sm text-gray-500">On Hand</div>
                                <div className="text-xl font-bold">{result.stockLevel?.onHand || 0}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-sm text-gray-500">Available</div>
                                <div className="text-xl font-bold text-green-600">{result.stockLevel?.available || 0}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
