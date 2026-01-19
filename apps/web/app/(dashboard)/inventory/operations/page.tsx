'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { fetchStockMoves, createScrapOrder } from '@/lib/api';
import { format } from 'date-fns';

export default function OperationsPage() {
    const router = useRouter();
    const { data: moves, error, mutate } = useSWR('stock-moves', fetchStockMoves);
    const [isScrapModalOpen, setIsScrapModalOpen] = useState(false);
    const [scrapData, setScrapData] = useState<any>(null);
    const [scrapQuantity, setScrapQuantity] = useState(1);
    const [scrapReason, setScrapReason] = useState('');

    if (error) return <div>Failed to load operations</div>;
    if (!moves) return <div>Loading...</div>;

    const handleScrapClick = (move: any) => {
        if (!move.batch) {
            alert('Cannot scrap: No batch information available for this move.');
            return;
        }
        if (move.batch.currentQuantity <= 0) {
            alert('Cannot scrap: Batch is empty.');
            return;
        }
        setScrapData(move);
        setScrapQuantity(1);
        setScrapReason('');
        setIsScrapModalOpen(true);
    };

    const handleScrapSubmit = async () => {
        if (!scrapData) return;
        try {
            await createScrapOrder({
                locationId: scrapData.batch.locationId,
                productId: scrapData.productId,
                quantity: scrapQuantity,
                reason: scrapReason || `Scrap from move ${scrapData.id}`,
            });
            setIsScrapModalOpen(false);
            mutate(); // Refresh data
            alert('Scrap order created successfully');
        } catch (err) {
            console.error(err);
            alert('Failed to create scrap order');
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Inventory Operations</h1>
            </div>

            {/* Transit Operations Link */}
            <div className="mb-6">
                <button
                    onClick={() => router.push('/inventory/operations/transit')}
                    className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 flex items-center gap-2"
                >
                    <span>Transit Operations</span>
                    <span className="bg-indigo-500 px-2 py-0.5 rounded text-xs">
                        {moves.filter((m: any) => m.type === 'TRANSFER' && m.location?.type === 'TRANSIT').length}
                    </span>
                </button>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {moves.map((move: any) => (
                            <tr key={move.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {format(new Date(move.date), 'MMM d, yyyy')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{move.referenceId || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{move.product?.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {move.type === 'IN' ? 'Vendor' : move.batch?.location?.name || 'Unknown'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {move.type === 'OUT' ? 'Customer' : 'Stock'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                                    {move.quantity}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                        Done
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    {move.batch && move.batch.currentQuantity > 0 && (
                                        <button
                                            onClick={() => handleScrapClick(move)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            Scrap
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Scrap Modal */}
            {isScrapModalOpen && scrapData && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
                    <div className="relative p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3 text-center">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">Scrap Item</h3>
                            <div className="mt-2 px-7 py-3">
                                <p className="text-sm text-gray-500 mb-4">
                                    Scrapping {scrapData.product?.name} from {scrapData.batch?.location?.name}
                                </p>
                                <input
                                    type="number"
                                    className="mb-3 px-3 py-2 border rounded w-full"
                                    placeholder="Quantity"
                                    value={scrapQuantity}
                                    onChange={(e) => setScrapQuantity(Number(e.target.value))}
                                />
                                <input
                                    type="text"
                                    className="mb-3 px-3 py-2 border rounded w-full"
                                    placeholder="Reason"
                                    value={scrapReason}
                                    onChange={(e) => setScrapReason(e.target.value)}
                                />
                            </div>
                            <div className="items-center px-4 py-3">
                                <button
                                    id="ok-btn"
                                    className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300"
                                    onClick={handleScrapSubmit}
                                >
                                    Confirm Scrap
                                </button>
                                <button
                                    className="mt-3 px-4 py-2 bg-gray-100 text-gray-700 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
                                    onClick={() => setIsScrapModalOpen(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
