'use client';

import useSWR from 'swr';
import { checkCycleCounts, startCycleCount } from '@/lib/api';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function CycleCountsPage() {
    const { data: locations, error } = useSWR('cycle-counts', checkCycleCounts);
    const router = useRouter();
    const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
    const [isStarting, setIsStarting] = useState(false);

    if (error) return <div>Failed to load cycle counts</div>;
    if (!locations) return <div>Loading...</div>;

    const toggleLocation = (id: string) => {
        setSelectedLocations(prev =>
            prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]
        );
    };

    const toggleAll = () => {
        if (selectedLocations.length === locations.length) {
            setSelectedLocations([]);
        } else {
            setSelectedLocations(locations.map((l: any) => l.id));
        }
    };

    const handleStartCount = async () => {
        if (selectedLocations.length === 0) return;
        setIsStarting(true);
        try {
            await startCycleCount(selectedLocations);
            router.push('/inventory/adjustments');
        } catch (e) {
            console.error(e);
            alert('Failed to start cycle count');
        } finally {
            setIsStarting(false);
        }
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Cycle Counts Dashboard</h1>
                <button
                    onClick={handleStartCount}
                    disabled={selectedLocations.length === 0 || isStarting}
                    className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
                >
                    {isStarting ? 'Starting...' : `Start Count (${selectedLocations.length})`}
                </button>
            </div>

            <div className="grid gap-6">
                <div className="border rounded-lg shadow-sm bg-white">
                    <div className="p-6 border-b">
                        <h3 className="text-lg font-semibold">Locations Due for Inventory</h3>
                    </div>
                    <div className="p-6">
                        {locations.length === 0 ? (
                            <p className="text-gray-500">No locations due for inventory.</p>
                        ) : (
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedLocations.length === locations.length && locations.length > 0}
                                                onChange={toggleAll}
                                            />
                                        </th>
                                        <th className="px-6 py-3">Location</th>
                                        <th className="px-6 py-3">Warehouse</th>
                                        <th className="px-6 py-3">Next Inventory Date</th>
                                        <th className="px-6 py-3">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {locations.map((location: any) => (
                                        <tr key={location.id} className="bg-white border-b hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedLocations.includes(location.id)}
                                                    onChange={() => toggleLocation(location.id)}
                                                />
                                            </td>
                                            <td className="px-6 py-4 font-medium">{location.name}</td>
                                            <td className="px-6 py-4">{location.warehouse?.name || '-'}</td>
                                            <td className="px-6 py-4">
                                                {location.nextInventoryDate
                                                    ? format(new Date(location.nextInventoryDate), 'PPP')
                                                    : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => router.push(`/inventory/adjustments?locationId=${location.id}`)}
                                                    className="text-blue-600 hover:underline"
                                                >
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
