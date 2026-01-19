'use client';

import { useState, useEffect } from 'react';
import { fetchStrategies, toggleStrategy, createStrategy, updateStrategy, deleteStrategy } from '@/lib/api';

export default function SettingsPage() {
    const [pickingStrategies, setPickingStrategies] = useState<any[]>([]);
    const [reservationStrategies, setReservationStrategies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState<'picking' | 'reservation'>('picking');
    const [editingStrategy, setEditingStrategy] = useState<any>(null);
    const [formData, setFormData] = useState({ name: '', rules: '{}' });

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

    const handleDelete = async (type: 'picking' | 'reservation', id: string) => {
        if (!confirm('Are you sure you want to delete this strategy?')) return;
        try {
            await deleteStrategy(type, id);
            loadStrategies();
        } catch (err) {
            console.error('Failed to delete strategy', err);
        }
    };

    const [reservationForm, setReservationForm] = useState({ method: 'at_confirmation', daysBefore: 0 });

    const openCreateModal = (type: 'picking' | 'reservation') => {
        setModalType(type);
        setEditingStrategy(null);
        setFormData({ name: '', rules: '{}' });
        if (type === 'reservation') {
            setReservationForm({ method: 'at_confirmation', daysBefore: 0 });
        }
        setShowModal(true);
    };

    const openEditModal = (type: 'picking' | 'reservation', strategy: any) => {
        setModalType(type);
        setEditingStrategy(strategy);
        setFormData({ name: strategy.name, rules: strategy.rules || '{}' });

        if (type === 'reservation') {
            try {
                const rules = JSON.parse(strategy.rules || '{}');
                setReservationForm({
                    method: rules.method || 'at_confirmation',
                    daysBefore: rules.daysBefore || 0
                });
            } catch (e) {
                setReservationForm({ method: 'at_confirmation', daysBefore: 0 });
            }
        }
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let dataToSave = { ...formData };

            if (modalType === 'reservation') {
                dataToSave.rules = JSON.stringify(reservationForm);
            }

            if (editingStrategy) {
                await updateStrategy(modalType, editingStrategy.id, dataToSave);
            } else {
                await createStrategy(modalType, dataToSave);
            }
            setShowModal(false);
            loadStrategies();
        } catch (err) {
            alert('Failed to save strategy');
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Picking Strategies */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Picking Strategies</h2>
                        <button
                            onClick={() => openCreateModal('picking')}
                            className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                        >
                            + Add
                        </button>
                    </div>
                    <div className="space-y-4">
                        {pickingStrategies.map((strategy) => (
                            <div key={strategy.id} className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <h3 className="font-medium text-gray-900">{strategy.name}</h3>
                                    <p className="text-sm text-gray-500">
                                        {strategy.active ? 'Active' : 'Inactive'}
                                    </p>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <button
                                        onClick={() => openEditModal('picking', strategy)}
                                        className="text-gray-600 hover:text-blue-600"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete('picking', strategy.id)}
                                        className="text-red-600 hover:text-red-800"
                                    >
                                        Delete
                                    </button>
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
                            </div>
                        ))}
                    </div>
                </div>

                {/* Reservation Strategies */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Reservation Strategies</h2>
                        <button
                            onClick={() => openCreateModal('reservation')}
                            className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                        >
                            + Add
                        </button>
                    </div>
                    <div className="space-y-4">
                        {reservationStrategies.map((strategy) => (
                            <div key={strategy.id} className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <h3 className="font-medium text-gray-900">{strategy.name}</h3>
                                    <p className="text-sm text-gray-500">
                                        {strategy.active ? 'Active' : 'Inactive'}
                                    </p>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <button
                                        onClick={() => openEditModal('reservation', strategy)}
                                        className="text-gray-600 hover:text-blue-600"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete('reservation', strategy.id)}
                                        className="text-red-600 hover:text-red-800"
                                    >
                                        Delete
                                    </button>
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
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                            {editingStrategy ? 'Edit' : 'Create'} {modalType === 'picking' ? 'Picking' : 'Reservation'} Strategy
                        </h3>
                        <form onSubmit={handleSubmit}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>

                                {modalType === 'picking' ? (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Rules (JSON)</label>
                                        <textarea
                                            className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3 h-24 font-mono text-sm"
                                            value={formData.rules}
                                            onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Reservation Method</label>
                                            <select
                                                className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                                value={reservationForm.method}
                                                onChange={(e) => setReservationForm({ ...reservationForm, method: e.target.value })}
                                            >
                                                <option value="at_confirmation">At Confirmation</option>
                                                <option value="manually">Manually</option>
                                                <option value="before_date">Before Scheduled Date</option>
                                            </select>
                                        </div>

                                        {reservationForm.method === 'before_date' && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Reserve X Days Before</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                                                    value={reservationForm.daysBefore}
                                                    onChange={(e) => setReservationForm({ ...reservationForm, daysBefore: parseInt(e.target.value) || 0 })}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="mt-6 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                                >
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
