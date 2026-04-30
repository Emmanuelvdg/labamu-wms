'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, CalendarRange, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

interface SeasonalityPeriod {
    id: string;
    label: string;
    startMD: string;
    endMD: string;
    multiplier: number;
}

interface SeasonalityProfile {
    id: string;
    name: string;
    periods: SeasonalityPeriod[];
}

export default function SeasonalityPage() {
    const [profiles, setProfiles] = useState<SeasonalityProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [newProfileName, setNewProfileName] = useState('');
    const [creating, setCreating] = useState(false);
    const [periodForms, setPeriodForms] = useState<Record<string, { label: string; startMD: string; endMD: string; multiplier: string }>>({});

    useEffect(() => { loadProfiles(); }, []);

    async function loadProfiles() {
        setLoading(true);
        try {
            const res = await fetch('/api/replenishment/seasonality');
            if (res.ok) setProfiles(await res.json());
        } catch {
            toast.error('Failed to load seasonality profiles');
        } finally {
            setLoading(false);
        }
    }

    async function createProfile() {
        if (!newProfileName.trim()) return;
        setCreating(true);
        try {
            const res = await fetch('/api/replenishment/seasonality', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newProfileName.trim() }),
            });
            if (!res.ok) throw new Error();
            setNewProfileName('');
            await loadProfiles();
            toast.success('Profile created');
        } catch {
            toast.error('Failed to create profile');
        } finally {
            setCreating(false);
        }
    }

    async function addPeriod(profileId: string) {
        const form = periodForms[profileId];
        if (!form?.label || !form?.startMD || !form?.endMD || !form?.multiplier) {
            toast.error('Fill in all fields');
            return;
        }
        const multiplier = parseFloat(form.multiplier);
        if (isNaN(multiplier) || multiplier <= 0) {
            toast.error('Multiplier must be a positive number');
            return;
        }
        try {
            const res = await fetch(`/api/replenishment/seasonality/${profileId}/periods`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ label: form.label, startMD: form.startMD, endMD: form.endMD, multiplier }),
            });
            if (!res.ok) throw new Error();
            setPeriodForms(prev => ({ ...prev, [profileId]: { label: '', startMD: '', endMD: '', multiplier: '' } }));
            await loadProfiles();
            toast.success('Period added');
        } catch {
            toast.error('Failed to add period');
        }
    }

    function initPeriodForm(profileId: string) {
        if (!periodForms[profileId]) {
            setPeriodForms(prev => ({ ...prev, [profileId]: { label: '', startMD: '', endMD: '', multiplier: '' } }));
        }
    }

    function toggleExpand(id: string) {
        setExpanded(prev => prev === id ? null : id);
        initPeriodForm(id);
    }

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-3xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <CalendarRange className="h-6 w-6" />
                        Seasonality Profiles
                    </h1>
                    <p className="text-gray-500 mt-1 text-sm">Define demand multipliers for date ranges to improve AI forecast accuracy.</p>
                </div>

                {/* Create new profile */}
                <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
                    <h2 className="text-sm font-semibold text-gray-700 mb-3">New Profile</h2>
                    <div className="flex gap-3">
                        <input
                            value={newProfileName}
                            onChange={e => setNewProfileName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && createProfile()}
                            placeholder="Profile name (e.g. Ramadan Season)"
                            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            onClick={createProfile}
                            disabled={creating || !newProfileName.trim()}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                        >
                            <Plus className="h-4 w-4" />
                            Create
                        </button>
                    </div>
                </div>

                {/* Profile list */}
                {profiles.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-gray-200">
                        No seasonality profiles yet. Create one above to get started.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {profiles.map(profile => {
                            const form = periodForms[profile.id] ?? { label: '', startMD: '', endMD: '', multiplier: '' };
                            return (
                                <div key={profile.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                    <button
                                        onClick={() => toggleExpand(profile.id)}
                                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 text-left"
                                    >
                                        <span className="font-medium text-gray-900">{profile.name}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-400">{profile.periods.length} period(s)</span>
                                            {expanded === profile.id ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                                        </div>
                                    </button>

                                    {expanded === profile.id && (
                                        <div className="border-t border-gray-100 px-5 py-4">
                                            {/* Periods table */}
                                            {profile.periods.length > 0 && (
                                                <table className="w-full text-sm mb-4">
                                                    <thead>
                                                        <tr className="text-xs text-gray-500 uppercase">
                                                            <th className="text-left py-1 pr-4">Label</th>
                                                            <th className="text-left py-1 pr-4">Start (MM-DD)</th>
                                                            <th className="text-left py-1 pr-4">End (MM-DD)</th>
                                                            <th className="text-left py-1 pr-4">Multiplier</th>
                                                            <th></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {profile.periods.map(p => (
                                                            <tr key={p.id} className="text-gray-700">
                                                                <td className="py-2 pr-4">{p.label}</td>
                                                                <td className="py-2 pr-4 font-mono text-xs">{p.startMD}</td>
                                                                <td className="py-2 pr-4 font-mono text-xs">{p.endMD}</td>
                                                                <td className="py-2 pr-4">
                                                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${p.multiplier >= 1.2 ? 'bg-green-100 text-green-800' : p.multiplier <= 0.8 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'}`}>
                                                                        ×{p.multiplier}
                                                                    </span>
                                                                </td>
                                                                <td className="py-2 text-right">
                                                                    <button
                                                                        onClick={async () => {
                                                                            try {
                                                                                const res = await fetch(`/api/replenishment/seasonality/periods/${p.id}`, { method: 'DELETE' });
                                                                                if (!res.ok) throw new Error();
                                                                                await loadProfiles();
                                                                                toast.success('Period removed');
                                                                            } catch {
                                                                                toast.error('Failed to remove period');
                                                                            }
                                                                        }}
                                                                        className="p-1 text-gray-400 hover:text-red-600 rounded"
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}

                                            {/* Add period form */}
                                            <div className="grid grid-cols-5 gap-2 items-end">
                                                <input
                                                    value={form.label}
                                                    onChange={e => setPeriodForms(prev => ({ ...prev, [profile.id]: { ...form, label: e.target.value } }))}
                                                    placeholder="Label"
                                                    className="col-span-1 border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                                <input
                                                    value={form.startMD}
                                                    onChange={e => setPeriodForms(prev => ({ ...prev, [profile.id]: { ...form, startMD: e.target.value } }))}
                                                    placeholder="01-01"
                                                    className="border border-gray-300 rounded-md px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                                <input
                                                    value={form.endMD}
                                                    onChange={e => setPeriodForms(prev => ({ ...prev, [profile.id]: { ...form, endMD: e.target.value } }))}
                                                    placeholder="01-31"
                                                    className="border border-gray-300 rounded-md px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                                <input
                                                    value={form.multiplier}
                                                    onChange={e => setPeriodForms(prev => ({ ...prev, [profile.id]: { ...form, multiplier: e.target.value } }))}
                                                    placeholder="×1.5"
                                                    type="number"
                                                    step="0.1"
                                                    min="0.1"
                                                    className="border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                                <button
                                                    onClick={() => addPeriod(profile.id)}
                                                    className="flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                    Add
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
