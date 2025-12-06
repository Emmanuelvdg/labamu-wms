'use client';

import { useState } from 'react';
import {
    Settings as SettingsIcon,
    Truck,
    Layers,
    Box,
    CheckCircle2,
    Save
} from 'lucide-react';
import { createStrategy } from '@/lib/api';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('picking');
    const [pickingStrategy, setPickingStrategy] = useState('standard');
    const [batchCriteria, setBatchCriteria] = useState<string[]>(['location']);
    const [clusterSize, setClusterSize] = useState(4);
    const [waveCriteria, setWaveCriteria] = useState('product');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        setSuccess(false);

        // In a real app, we would save these preferences to the backend
        // For now, we'll just simulate a save delay
        setTimeout(() => {
            setLoading(false);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        }, 1000);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <SettingsIcon className="h-8 w-8 text-gray-700" />
                    Settings
                </h1>
                <p className="text-gray-600 mt-1">Configure your warehouse operations and preferences.</p>
            </header>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Navigation for Settings */}
                <div className="w-full md:w-64 flex-shrink-0">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <nav className="flex flex-col">
                            <button
                                onClick={() => setActiveTab('general')}
                                className={`px-4 py-3 text-left text-sm font-medium border-l-4 transition-colors ${activeTab === 'general'
                                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                                        : 'border-transparent text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                General
                            </button>
                            <button
                                onClick={() => setActiveTab('picking')}
                                className={`px-4 py-3 text-left text-sm font-medium border-l-4 transition-colors ${activeTab === 'picking'
                                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                                        : 'border-transparent text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                Picking Strategies
                            </button>
                            <button
                                onClick={() => setActiveTab('users')}
                                className={`px-4 py-3 text-left text-sm font-medium border-l-4 transition-colors ${activeTab === 'users'
                                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                                        : 'border-transparent text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                Users & Permissions
                            </button>
                        </nav>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1">
                    {activeTab === 'picking' && (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="mb-6">
                                <h2 className="text-xl font-semibold text-gray-900">Picking Strategy Configuration</h2>
                                <p className="text-gray-500 text-sm mt-1">
                                    Select how orders should be grouped and processed by warehouse workers.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                <StrategyCard
                                    id="standard"
                                    title="Standard"
                                    description="Pick orders one by one. Best for low volume or bulky items."
                                    icon={<CheckCircle2 className="h-6 w-6" />}
                                    selected={pickingStrategy === 'standard'}
                                    onSelect={setPickingStrategy}
                                />
                                <StrategyCard
                                    id="batch"
                                    title="Batch Picking"
                                    description="Group multiple orders to pick them together in one go."
                                    icon={<Layers className="h-6 w-6" />}
                                    selected={pickingStrategy === 'batch'}
                                    onSelect={setPickingStrategy}
                                />
                                <StrategyCard
                                    id="cluster"
                                    title="Cluster Picking"
                                    description="Pick items for multiple orders into specific totes/boxes."
                                    icon={<Box className="h-6 w-6" />}
                                    selected={pickingStrategy === 'cluster'}
                                    onSelect={setPickingStrategy}
                                />
                                <StrategyCard
                                    id="wave"
                                    title="Wave Picking"
                                    description="Pick all items of the same type for many orders at once."
                                    icon={<Truck className="h-6 w-6" />}
                                    selected={pickingStrategy === 'wave'}
                                    onSelect={setPickingStrategy}
                                />
                            </div>

                            {/* Configuration Details */}
                            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                                {pickingStrategy === 'standard' && (
                                    <div>
                                        <h3 className="font-medium text-gray-900 mb-2">Standard Configuration</h3>
                                        <p className="text-sm text-gray-600">No additional configuration required. Orders will be assigned individually.</p>
                                    </div>
                                )}

                                {pickingStrategy === 'batch' && (
                                    <div>
                                        <h3 className="font-medium text-gray-900 mb-4">Batch Configuration</h3>
                                        <div className="space-y-3">
                                            <label className="block text-sm font-medium text-gray-700">Group Batches By:</label>
                                            <div className="flex gap-4">
                                                {['contact', 'carrier', 'location'].map((criteria) => (
                                                    <label key={criteria} className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={batchCriteria.includes(criteria)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setBatchCriteria([...batchCriteria, criteria]);
                                                                } else {
                                                                    setBatchCriteria(batchCriteria.filter(c => c !== criteria));
                                                                }
                                                            }}
                                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <span className="capitalize text-sm text-gray-700">{criteria}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {pickingStrategy === 'cluster' && (
                                    <div>
                                        <h3 className="font-medium text-gray-900 mb-4">Cluster Configuration</h3>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Max Orders per Cluster</label>
                                            <input
                                                type="number"
                                                value={clusterSize}
                                                onChange={(e) => setClusterSize(parseInt(e.target.value))}
                                                min={1}
                                                max={20}
                                                className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Number of totes/boxes a picker can handle at once.</p>
                                        </div>
                                    </div>
                                )}

                                {pickingStrategy === 'wave' && (
                                    <div>
                                        <h3 className="font-medium text-gray-900 mb-4">Wave Configuration</h3>
                                        <div className="space-y-3">
                                            <label className="block text-sm font-medium text-gray-700">Group Waves By:</label>
                                            <div className="flex gap-4">
                                                {['product', 'category'].map((criteria) => (
                                                    <label key={criteria} className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="waveCriteria"
                                                            checked={waveCriteria === criteria}
                                                            onChange={() => setWaveCriteria(criteria)}
                                                            className="border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <span className="capitalize text-sm text-gray-700">{criteria}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 flex items-center justify-end gap-4">
                                {success && (
                                    <span className="text-green-600 text-sm font-medium flex items-center gap-1 animate-fade-in">
                                        <CheckCircle2 className="h-4 w-4" />
                                        Settings Saved
                                    </span>
                                )}
                                <button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                    <Save className="h-4 w-4" />
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab !== 'picking' && (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                            <p className="text-gray-500">This section is under development.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function StrategyCard({ id, title, description, icon, selected, onSelect }: any) {
    return (
        <div
            onClick={() => onSelect(id)}
            className={`cursor-pointer rounded-lg border p-4 transition-all ${selected
                    ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                }`}
        >
            <div className={`mb-3 ${selected ? 'text-blue-600' : 'text-gray-500'}`}>
                {icon}
            </div>
            <h3 className={`font-medium mb-1 ${selected ? 'text-blue-900' : 'text-gray-900'}`}>{title}</h3>
            <p className={`text-xs ${selected ? 'text-blue-700' : 'text-gray-500'}`}>{description}</p>
        </div>
    );
}
