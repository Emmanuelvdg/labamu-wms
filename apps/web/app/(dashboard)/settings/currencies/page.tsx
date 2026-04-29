'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, RefreshCw, Star, Lock } from 'lucide-react';

interface Currency {
    id: string;
    code: string;
    name: string;
    symbol: string;
    isBase: boolean;
    enabled: boolean;
}

interface ExchangeRate {
    id: string;
    fromCode: string;
    toCode: string;
    rate: number;
    source: string;
    fetchedAt: string;
}

const EMPTY_CURRENCY = { code: '', name: '', symbol: '', isBase: false, enabled: true };
const EMPTY_RATE = { fromCode: '', toCode: '', rate: '' };

export default function CurrenciesPage() {
    const [flagEnabled, setFlagEnabled] = useState<boolean | null>(null);
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [rates, setRates] = useState<ExchangeRate[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCurrencyForm, setShowCurrencyForm] = useState(false);
    const [showRateForm, setShowRateForm] = useState(false);
    const [currencyForm, setCurrencyForm] = useState(EMPTY_CURRENCY);
    const [rateForm, setRateForm] = useState(EMPTY_RATE);
    const [syncing, setSyncing] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => { init(); }, []);

    async function init() {
        const flagRes = await fetch('/api/feature-flags').catch(() => null);
        if (flagRes?.ok) {
            const flags: Array<{ key: string; enabled: boolean }> = await flagRes.json();
            setFlagEnabled(flags.find(f => f.key === 'MULTI_CURRENCY')?.enabled ?? false);
        } else {
            setFlagEnabled(false);
        }
        await Promise.all([loadCurrencies(), loadRates()]);
        setLoading(false);
    }

    async function loadCurrencies() {
        const res = await fetch('/api/currencies').catch(() => null);
        if (res?.ok) setCurrencies(await res.json());
    }

    async function loadRates() {
        const res = await fetch('/api/currencies/rates').catch(() => null);
        if (res?.ok) setRates(await res.json());
    }

    async function handleCreateCurrency() {
        setSaving(true);
        try {
            const res = await fetch('/api/currencies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(currencyForm) });
            if (res.ok) { setCurrencyForm(EMPTY_CURRENCY); setShowCurrencyForm(false); await loadCurrencies(); }
            else alert('Failed to create currency');
        } finally { setSaving(false); }
    }

    async function handleDeleteCurrency(code: string) {
        if (!confirm(`Delete ${code}?`)) return;
        await fetch(`/api/currencies/${code}`, { method: 'DELETE' });
        await loadCurrencies();
    }

    async function handleSetBase(code: string) {
        await fetch(`/api/currencies/${code}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isBase: true }) });
        await loadCurrencies();
    }

    async function handleSetRate() {
        setSaving(true);
        try {
            const res = await fetch('/api/currencies/rates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fromCode: rateForm.fromCode, toCode: rateForm.toCode, rate: Number(rateForm.rate) }),
            });
            if (res.ok) { setRateForm(EMPTY_RATE); setShowRateForm(false); await loadRates(); }
            else alert('Failed to set rate');
        } finally { setSaving(false); }
    }

    async function handleSync() {
        setSyncing(true);
        try {
            const res = await fetch('/api/currencies/sync', { method: 'POST' });
            if (res.ok) { await loadRates(); }
            else alert('Sync failed — check that a base currency is set');
        } finally { setSyncing(false); }
    }

    return (
        <div className="p-6 max-w-4xl">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Currencies</h1>
                <p className="text-gray-600 mt-1">Manage currencies and exchange rates for multi-currency transactions</p>
            </div>

            {/* M6.8 — flag banner */}
            {flagEnabled === false && (
                <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <Lock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-amber-900">Multi-Currency not enabled</p>
                        <p className="text-sm text-amber-700 mt-1">Enable the <strong>Multi Currency</strong> feature flag in the admin portal to configure currencies and exchange rates.</p>
                    </div>
                </div>
            )}

            {loading ? <p className="text-gray-500">Loading...</p> : (
                <>
                    {/* Currencies section */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-lg font-semibold">Currencies</h2>
                            {flagEnabled && (
                                <button onClick={() => setShowCurrencyForm(true)} className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm">
                                    <Plus className="h-4 w-4" /> Add Currency
                                </button>
                            )}
                        </div>

                        {currencies.length === 0 ? (
                            <p className="text-gray-500 text-sm py-4">No currencies configured.</p>
                        ) : (
                            <div className="space-y-2">
                                {currencies.map(c => (
                                    <div key={c.code} className="flex items-center justify-between bg-white border rounded-lg px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg font-mono font-bold text-gray-700 w-10">{c.symbol}</span>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{c.code}</span>
                                                    {c.isBase && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full"><Star className="h-3 w-3" /> Base</span>}
                                                    {!c.enabled && <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">Disabled</span>}
                                                </div>
                                                <p className="text-sm text-gray-500">{c.name}</p>
                                            </div>
                                        </div>
                                        {flagEnabled && (
                                            <div className="flex items-center gap-2">
                                                {!c.isBase && <button onClick={() => handleSetBase(c.code)} className="text-sm text-blue-600 hover:text-blue-800">Set base</button>}
                                                <button onClick={() => handleDeleteCurrency(c.code)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Exchange Rates section */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-lg font-semibold">Exchange Rates</h2>
                            {flagEnabled && (
                                <div className="flex gap-2">
                                    <button onClick={handleSync} disabled={syncing} className="flex items-center gap-1 border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-md text-sm">
                                        <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} /> {syncing ? 'Syncing…' : 'Sync FX Rates'}
                                    </button>
                                    <button onClick={() => setShowRateForm(true)} className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm">
                                        <Plus className="h-4 w-4" /> Set Rate
                                    </button>
                                </div>
                            )}
                        </div>

                        {rates.length === 0 ? (
                            <p className="text-gray-500 text-sm py-4">No exchange rates configured.</p>
                        ) : (
                            <div className="bg-white border rounded-lg overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            {['From', 'To', 'Rate', 'Source', 'Fetched'].map(h => (
                                                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {rates.map(r => (
                                            <tr key={r.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium">{r.fromCode}</td>
                                                <td className="px-4 py-3 font-medium">{r.toCode}</td>
                                                <td className="px-4 py-3 tabular-nums">{r.rate.toFixed(6)}</td>
                                                <td className="px-4 py-3 text-gray-500">{r.source}</td>
                                                <td className="px-4 py-3 text-gray-500">{new Date(r.fetchedAt).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Add Currency Modal */}
            {showCurrencyForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-sm">
                        <h2 className="text-lg font-bold mb-4">Add Currency</h2>
                        <div className="space-y-3">
                            {[
                                { label: 'Code (ISO 4217)', key: 'code', placeholder: 'USD' },
                                { label: 'Name', key: 'name', placeholder: 'US Dollar' },
                                { label: 'Symbol', key: 'symbol', placeholder: '$' },
                            ].map(f => (
                                <div key={f.key}>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                                    <input className="w-full border rounded-md px-3 py-2 text-sm" placeholder={f.placeholder}
                                        value={(currencyForm as any)[f.key]} onChange={e => setCurrencyForm({ ...currencyForm, [f.key]: e.target.value })} />
                                </div>
                            ))}
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input type="checkbox" checked={currencyForm.isBase} onChange={e => setCurrencyForm({ ...currencyForm, isBase: e.target.checked })} />
                                Set as base currency
                            </label>
                        </div>
                        <div className="mt-5 flex gap-3">
                            <button onClick={() => setShowCurrencyForm(false)} className="flex-1 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-sm">Cancel</button>
                            <button onClick={handleCreateCurrency} disabled={!currencyForm.code || !currencyForm.name || saving}
                                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm disabled:bg-gray-400">
                                {saving ? 'Saving…' : 'Add'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Set Rate Modal */}
            {showRateForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-sm">
                        <h2 className="text-lg font-bold mb-4">Set Exchange Rate</h2>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                                    <select className="w-full border rounded-md px-3 py-2 text-sm" value={rateForm.fromCode} onChange={e => setRateForm({ ...rateForm, fromCode: e.target.value })}>
                                        <option value="">—</option>
                                        {currencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                                    <select className="w-full border rounded-md px-3 py-2 text-sm" value={rateForm.toCode} onChange={e => setRateForm({ ...rateForm, toCode: e.target.value })}>
                                        <option value="">—</option>
                                        {currencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Rate (1 From = ? To)</label>
                                <input type="number" step="0.000001" className="w-full border rounded-md px-3 py-2 text-sm" value={rateForm.rate}
                                    onChange={e => setRateForm({ ...rateForm, rate: e.target.value })} placeholder="e.g. 15800" />
                            </div>
                        </div>
                        <div className="mt-5 flex gap-3">
                            <button onClick={() => setShowRateForm(false)} className="flex-1 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-sm">Cancel</button>
                            <button onClick={handleSetRate} disabled={!rateForm.fromCode || !rateForm.toCode || !rateForm.rate || saving}
                                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm disabled:bg-gray-400">
                                {saving ? 'Saving…' : 'Set Rate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
