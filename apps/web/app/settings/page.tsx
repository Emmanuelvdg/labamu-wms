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
                            <a
                                href="/settings/roles"
                                className="px-4 py-3 text-left text-sm font-medium border-l-4 border-transparent text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                Roles & Permissions
                            </a>
                            <a
                                href="/settings/attributes"
                                className="px-4 py-3 text-left text-sm font-medium border-l-4 border-transparent text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                Location Attributes
                            </a>
                            <a
                                href="/settings/users"
                                className="px-4 py-3 text-left text-sm font-medium border-l-4 border-transparent text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                Users
                            </a>
                        </nav>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1">
                    {activeTab === 'picking' ? (
                        <div>
                            {/* Configuration Details */}
                            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                                <p className="text-gray-500 italic">
                                    Picking strategies are now configured per warehouse. Please go to
                                    <a href="/inventory/warehouses" className="text-blue-600 hover:underline ml-1">Warehouses</a>
                                    to configure them.
                                </p>
                            </div>
                        </div>
                    ) : (
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
