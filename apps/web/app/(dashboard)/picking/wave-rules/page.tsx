'use client';

import { useState, useEffect } from 'react';
import {
    fetchWarehouses,
    fetchWaveRules,
    createWaveRule,
    updateWaveRule,
    deleteWaveRule,
    triggerWaveRule,
} from '@/lib/api';
import { Waves, Plus, Play, Trash2, Pencil, Building, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';

const TRIGGER_OPTIONS = [
    { value: 'TIME_BASED', label: 'Time-based (cron schedule)' },
    { value: 'ORDER_COUNT', label: 'Order count threshold' },
    { value: 'MANUAL', label: 'Manual trigger only' },
];

const CRON_PRESETS = [
    { label: 'Every 30 min', value: '*/30 * * * *' },
    { label: 'Every hour', value: '0 * * * *' },
    { label: 'Every 2 hours', value: '0 */2 * * *' },
    { label: 'Every 4 hours', value: '0 */4 * * *' },
    { label: 'Twice a day (8am & 2pm)', value: '0 8,14 * * *' },
    { label: 'Once a day (6am)', value: '0 6 * * *' },
    { label: 'Custom…', value: '__custom__' },
];

function describeCron(expr: string): string {
    if (!expr) return '';
    const preset = CRON_PRESETS.find(p => p.value === expr && p.value !== '__custom__');
    if (preset) return preset.label;
    return `Custom: ${expr}`;
}

type RuleFormData = {
    name: string;
    triggerType: string;
    cronExpression: string;
    cronPreset: string;
    minOrders: number;
    maxOrders: number;
};

const EMPTY_FORM: RuleFormData = {
    name: '',
    triggerType: 'TIME_BASED',
    cronExpression: '*/30 * * * *',
    cronPreset: '*/30 * * * *',
    minOrders: 5,
    maxOrders: 50,
};

function RuleModal({
    initial,
    warehouseId,
    onSave,
    onClose,
}: {
    initial?: any;
    warehouseId: string;
    onSave: (data: any) => Promise<void>;
    onClose: () => void;
}) {
    const [form, setForm] = useState<RuleFormData>(
        initial
            ? {
                name: initial.name,
                triggerType: initial.triggerType || 'TIME_BASED',
                cronExpression: initial.cronExpression || '*/30 * * * *',
                cronPreset: CRON_PRESETS.find(p => p.value === initial.cronExpression) ? initial.cronExpression : '__custom__',
                minOrders: initial.minOrders ?? 5,
                maxOrders: initial.maxOrders ?? 50,
            }
            : EMPTY_FORM,
    );
    const [saving, setSaving] = useState(false);

    const handleCronPreset = (val: string) => {
        if (val === '__custom__') {
            setForm(f => ({ ...f, cronPreset: '__custom__' }));
        } else {
            setForm(f => ({ ...f, cronPreset: val, cronExpression: val }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) { toast.error('Name is required'); return; }
        setSaving(true);
        try {
            await onSave({
                warehouseId,
                name: form.name.trim(),
                triggerType: form.triggerType,
                cronExpression: form.triggerType === 'TIME_BASED' ? form.cronExpression : undefined,
                minOrders: form.minOrders,
                maxOrders: form.maxOrders,
                enabled: true,
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                    {initial ? 'Edit Wave Rule' : 'New Wave Release Rule'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Rule name</label>
                        <input className="w-full border border-gray-300 rounded-md p-2 text-sm"
                            value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="e.g. Morning Wave — Zone A" required />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Trigger type</label>
                        <select className="w-full border border-gray-300 rounded-md p-2 text-sm"
                            value={form.triggerType}
                            onChange={e => setForm(f => ({ ...f, triggerType: e.target.value }))}>
                            {TRIGGER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>

                    {form.triggerType === 'TIME_BASED' && (
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Release schedule</label>
                            <select className="w-full border border-gray-300 rounded-md p-2 text-sm"
                                value={form.cronPreset} onChange={e => handleCronPreset(e.target.value)}>
                                {CRON_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </select>
                            {form.cronPreset === '__custom__' && (
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Cron expression</label>
                                    <input className="w-full border border-gray-300 rounded-md p-2 text-sm font-mono"
                                        value={form.cronExpression}
                                        onChange={e => setForm(f => ({ ...f, cronExpression: e.target.value }))}
                                        placeholder="*/30 * * * *" />
                                    <p className="text-xs text-gray-400 mt-1">Format: minute hour day month weekday</p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Min orders to trigger</label>
                            <input type="number" min="1" className="w-full border border-gray-300 rounded-md p-2 text-sm"
                                value={form.minOrders}
                                onChange={e => setForm(f => ({ ...f, minOrders: parseInt(e.target.value) || 1 }))} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Max orders per wave</label>
                            <input type="number" min="1" className="w-full border border-gray-300 rounded-md p-2 text-sm"
                                value={form.maxOrders}
                                onChange={e => setForm(f => ({ ...f, maxOrders: parseInt(e.target.value) || 1 }))} />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50">
                            {saving ? 'Saving…' : initial ? 'Save changes' : 'Create rule'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function WaveRulesPage() {
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
    const [rules, setRules] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<any>(null);
    const [triggeringId, setTriggeringId] = useState<string | null>(null);

    useEffect(() => {
        fetchWarehouses().then(data => {
            setWarehouses(data);
            if (data.length > 0) setSelectedWarehouseId(data[0].id);
        }).catch(console.error);
    }, []);

    useEffect(() => {
        if (selectedWarehouseId) load();
    }, [selectedWarehouseId]);

    async function load() {
        setLoading(true);
        try {
            const data = await fetchWaveRules(selectedWarehouseId);
            setRules(Array.isArray(data) ? data : []);
        } catch { toast.error('Failed to load wave rules'); }
        finally { setLoading(false); }
    }

    const handleCreate = async (data: any) => {
        await createWaveRule(data);
        toast.success('Wave rule created');
        setModalOpen(false);
        load();
    };

    const handleEdit = async (data: any) => {
        await updateWaveRule(editingRule.id, data);
        toast.success('Wave rule updated');
        setEditingRule(null);
        load();
    };

    const handleToggle = async (rule: any) => {
        await updateWaveRule(rule.id, { enabled: !rule.enabled });
        load();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this wave rule?')) return;
        await deleteWaveRule(id);
        toast.success('Wave rule deleted');
        load();
    };

    const handleTrigger = async (id: string) => {
        setTriggeringId(id);
        try {
            const result = await triggerWaveRule(id);
            if (result.success) toast.success(`Wave released — ${result.ordersIncluded ?? 0} orders queued`);
            else toast.warning(result.message || 'No orders to release');
        } catch (e: any) { toast.error(e.message || 'Trigger failed'); }
        finally { setTriggeringId(null); }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <Waves className="h-8 w-8 text-blue-600" />
                        Wave Release Rules
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Configure automatic or scheduled wave releases for each warehouse.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
                        <Building className="h-5 w-5 text-gray-400 ml-1" />
                        <select value={selectedWarehouseId}
                            onChange={e => setSelectedWarehouseId(e.target.value)}
                            className="border-none focus:ring-0 text-sm text-gray-700 bg-transparent min-w-[180px]">
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>
                    <button onClick={() => { setEditingRule(null); setModalOpen(true); }}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm">
                        <Plus className="h-4 w-4" /> New Rule
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
            ) : rules.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <Waves className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No wave rules configured for this warehouse.</p>
                    <button onClick={() => setModalOpen(true)}
                        className="mt-4 text-sm text-blue-600 hover:underline font-medium">
                        + Create the first rule
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {rules.map(rule => (
                        <div key={rule.id}
                            className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className={`mt-0.5 h-3 w-3 rounded-full flex-shrink-0 ${rule.enabled ? 'bg-green-400' : 'bg-gray-300'}`} />
                                <div>
                                    <p className="font-semibold text-gray-900 text-sm">{rule.name}</p>
                                    <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500">
                                        <span className="bg-gray-100 px-2 py-0.5 rounded font-medium">
                                            {TRIGGER_OPTIONS.find(o => o.value === rule.triggerType)?.label ?? rule.triggerType}
                                        </span>
                                        {rule.triggerType === 'TIME_BASED' && rule.cronExpression && (
                                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono">
                                                {describeCron(rule.cronExpression)}
                                            </span>
                                        )}
                                        <span>Min {rule.minOrders ?? '—'} orders</span>
                                        <span>Max {rule.maxOrders ?? '—'} orders/wave</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                                {/* Enable/disable toggle */}
                                <button onClick={() => handleToggle(rule)}
                                    title={rule.enabled ? 'Disable rule' : 'Enable rule'}
                                    className="text-gray-500 hover:text-gray-700">
                                    {rule.enabled
                                        ? <ToggleRight className="h-6 w-6 text-green-500" />
                                        : <ToggleLeft className="h-6 w-6 text-gray-400" />}
                                </button>

                                {/* Manual trigger */}
                                <button onClick={() => handleTrigger(rule.id)}
                                    disabled={triggeringId === rule.id}
                                    title="Manually trigger this wave rule now"
                                    className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-3 py-1.5 rounded-md disabled:opacity-50 transition-colors">
                                    {triggeringId === rule.id
                                        ? <span className="h-3 w-3 rounded-full border border-green-600 border-t-transparent animate-spin" />
                                        : <Play className="h-3 w-3" />}
                                    Trigger now
                                </button>

                                <button onClick={() => { setEditingRule(rule); setModalOpen(true); }}
                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                                    <Pencil className="h-4 w-4" />
                                </button>

                                <button onClick={() => handleDelete(rule.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {(modalOpen) && (
                <RuleModal
                    initial={editingRule}
                    warehouseId={selectedWarehouseId}
                    onSave={editingRule ? handleEdit : handleCreate}
                    onClose={() => { setModalOpen(false); setEditingRule(null); }}
                />
            )}
        </div>
    );
}
