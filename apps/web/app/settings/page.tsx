'use client';

import { useState, useEffect } from 'react';
import { fetchStrategies, toggleStrategy } from '@/lib/api';

export default function SettingsPage() {
    const [pickingStrategies, setPickingStrategies] = useState<any[]>([]);
    const [reservationStrategies, setReservationStrategies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStrategies();
    }, []);

    async function loadStrategies() {
        try {
            const [picking, reservation] = await Promise.all([
                fetchStrategies('picking'),
                fetchStrategies('reservation'),
            ]);
            setPickingStrategies(picking);
            setReservationStrategies(reservation);
        } catch (err) {
            console.error('Failed to load strategies', err);
        } finally {
            setLoading(false);
        }
    }

    const handleToggle = async (type: 'picking' | 'reservation', id: string, currentStatus: boolean) => {
        try {
            await toggleStrategy(type, id, !currentStatus);
            loadStrategies(); // Refresh
        } catch (err) {
            console.error('Failed to toggle strategy', err);
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Picking Strategies */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">Picking Strategies</h2>
                    <div className="space-y-4">
                        {pickingStrategies.map((strategy) => (
                            <div key={strategy.id} className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <h3 className="font-medium text-gray-900">{strategy.name}</h3>
                                    <p className="text-sm text-gray-500">
                                        {strategy.active ? 'Active' : 'Inactive'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleToggle('picking', strategy.id, strategy.active)}
                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${strategy.active ? 'bg-indigo-600' : 'bg-gray-200'
                                        }`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${strategy.active ? 'translate-x-5' : 'translate-x-0'
                                            }`}
                                    />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Reservation Strategies */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">Reservation Strategies</h2>
                    <div className="space-y-4">
                        {reservationStrategies.map((strategy) => (
                            <div key={strategy.id} className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <h3 className="font-medium text-gray-900">{strategy.name}</h3>
                                    <p className="text-sm text-gray-500">
                                        {strategy.active ? 'Active' : 'Inactive'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleToggle('reservation', strategy.id, strategy.active)}
                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${strategy.active ? 'bg-indigo-600' : 'bg-gray-200'
                                        }`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${strategy.active ? 'translate-x-5' : 'translate-x-0'
                                            }`}
                                    />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
