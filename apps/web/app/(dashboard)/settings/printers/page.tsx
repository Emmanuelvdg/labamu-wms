'use client';

import { useState, useEffect } from 'react';
import { Plus, Printer, Star, Trash2, Lock } from 'lucide-react';

interface PrinterConfig {
    id: string;
    name: string;
    outputType: 'PDF' | 'ZPL';
    host?: string;
    port?: number;
    isDefault: boolean;
    labelWidth: number;
    labelHeight: number;
}

const EMPTY_FORM = { name: '', outputType: 'PDF' as 'PDF' | 'ZPL', host: '', port: '', isDefault: false, labelWidth: 288, labelHeight: 144 };

export default function PrintersPage() {
    const [printers, setPrinters] = useState<PrinterConfig[]>([]);
    const [flagEnabled, setFlagEnabled] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    useEffect(() => { init(); }, []);

    async function init() {
        const flagRes = await fetch('/api/feature-flags').catch(() => null);
        if (flagRes?.ok) {
            const flags: Array<{ key: string; enabled: boolean }> = await flagRes.json();
            setFlagEnabled(flags.find(f => f.key === 'BARCODE_PRINT')?.enabled ?? false);
        } else {
            setFlagEnabled(false);
        }
        await loadPrinters();
    }

    async function loadPrinters() {
        try {
            const res = await fetch('/api/printing/printers');
            if (res.ok) setPrinters(await res.json());
        } catch { /* flag may be off */ }
        setLoading(false);
    }

    async function handleCreate() {
        setSaving(true);
        try {
            const body = { ...form, port: form.port ? Number(form.port) : undefined, host: form.host || undefined };
            const res = await fetch('/api/printing/printers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (res.ok) { setForm(EMPTY_FORM); setShowForm(false); await loadPrinters(); }
            else alert('Failed to create printer');
        } finally { setSaving(false); }
    }

    async function handleDelete(id: string) {
        if (!confirm('Delete this printer?')) return;
        await fetch(`/api/printing/printers/${id}`, { method: 'DELETE' });
        await loadPrinters();
    }

    async function handleSetDefault(id: string) {
        await fetch(`/api/printing/printers/${id}/default`, { method: 'PATCH' });
        await loadPrinters();
    }

    return (
        <div className="p-6 max-w-3xl">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Printers</h1>
                    <p className="text-gray-600 mt-1">Configure label printers for barcode printing</p>
                </div>
                {flagEnabled && (
                    <button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2">
                        <Plus className="h-4 w-4" /> Add Printer
                    </button>
                )}
            </div>

            {flagEnabled === false && (
                <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <Lock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-amber-900">Barcode Printing not enabled</p>
                        <p className="text-sm text-amber-700 mt-1">Enable the <strong>Barcode Printing</strong> feature flag in the admin portal to configure printers.</p>
                    </div>
                </div>
            )}

            {loading ? <p className="text-gray-500">Loading...</p> : printers.length === 0 && flagEnabled ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <Printer className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No printers configured yet.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {printers.map(p => (
                        <div key={p.id} className="flex items-center justify-between bg-white border rounded-lg p-4">
                            <div className="flex items-center gap-3">
                                <Printer className="h-5 w-5 text-gray-500" />
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{p.name}</span>
                                        {p.isDefault && <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full flex items-center gap-1"><Star className="h-3 w-3" /> Default</span>}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {p.outputType} · {p.labelWidth}×{p.labelHeight}pt
                                        {p.host && ` · ${p.host}${p.port ? `:${p.port}` : ''}`}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {!p.isDefault && (
                                    <button onClick={() => handleSetDefault(p.id)} className="text-sm text-blue-600 hover:text-blue-800">Set default</button>
                                )}
                                <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h2 className="text-lg font-bold mb-4">Add Printer</h2>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                                <input className="w-full border rounded-md px-3 py-2" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Warehouse Zebra ZT411" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Output Type</label>
                                <select className="w-full border rounded-md px-3 py-2" value={form.outputType} onChange={e => setForm({ ...form, outputType: e.target.value as 'PDF' | 'ZPL' })}>
                                    <option value="PDF">PDF</option>
                                    <option value="ZPL">ZPL (Thermal)</option>
                                </select>
                            </div>
                            {form.outputType === 'ZPL' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Host / IP</label>
                                        <input className="w-full border rounded-md px-3 py-2" value={form.host} onChange={e => setForm({ ...form, host: e.target.value })} placeholder="192.168.1.100" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                                        <input type="number" className="w-full border rounded-md px-3 py-2" value={form.port} onChange={e => setForm({ ...form, port: e.target.value })} placeholder="9100" />
                                    </div>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Label Width (pt)</label>
                                    <input type="number" className="w-full border rounded-md px-3 py-2" value={form.labelWidth} onChange={e => setForm({ ...form, labelWidth: Number(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Label Height (pt)</label>
                                    <input type="number" className="w-full border rounded-md px-3 py-2" value={form.labelHeight} onChange={e => setForm({ ...form, labelHeight: Number(e.target.value) })} />
                                </div>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={form.isDefault} onChange={e => setForm({ ...form, isDefault: e.target.checked })} />
                                <span className="text-sm">Set as default printer</span>
                            </label>
                        </div>
                        <div className="mt-5 flex gap-3">
                            <button onClick={() => setShowForm(false)} className="flex-1 py-2 bg-gray-200 hover:bg-gray-300 rounded-md">Cancel</button>
                            <button onClick={handleCreate} disabled={!form.name || saving} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:bg-gray-400">
                                {saving ? 'Saving...' : 'Add Printer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
