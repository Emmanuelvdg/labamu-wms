'use client';

import { useState, useEffect } from 'react';
import { Waves, Plus, Trash2, Play, ToggleLeft, ToggleRight } from 'lucide-react';
import { fetchWarehouses, fetchWaveRules, createWaveRule, updateWaveRule, deleteWaveRule, triggerWaveRule } from '@/lib/api';

type TriggerType = 'MANUAL' | 'ORDER_COUNT' | 'TIME_BASED';

interface WaveRule {
    id: string;
    name: string;
    warehouseId: string;
    triggerType: TriggerType;
    cronExpression: string | null;
    minOrders: number;
    maxOrders: number;
    enabled: boolean;
    createdAt: string;
}

export default function WaveRulesPage() {
    const [rules, setRules] = useState<WaveRule[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [triggerResult, setTriggerResult] = useState<string | null>(null);

    const [name, setName] = useState('');
    const [warehouseId, setWarehouseId] = useState('');
    const [triggerType, setTriggerType] = useState<TriggerType>('MANUAL');
    const [cronExpression, setCronExpression] = useState('');
    const [minOrders, setMinOrders] = useState(5);
    const [maxOrders, setMaxOrders] = useState(50);

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        try {
            const wh = await fetchWarehouses();
            setWarehouses(wh);
            if (wh.length > 0) {
                setWarehouseId(wh[0].id);
                const r = await fetchWaveRules(wh[0].id);
                setRules(Array.isArray(r) ? r : []);
            }
        } catch (err) {
            console.error('Failed to load wave rules', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleWarehouseChange(whId: string) {
        setWarehouseId(whId);
        try {
            const r = await fetchWaveRules(whId);
            setRules(Array.isArray(r) ? r : []);
        } catch { setRules([]); }
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim() || !warehouseId) return;
        try {
            await createWaveRule({
                warehouseId,
                name: name.trim(),
                triggerType,
                cronExpression: triggerType === 'TIME_BASED' ? cronExpression : undefined,
                minOrders,
                maxOrders,
                enabled: true,
            });
            setShowForm(false);
            setName(''); setCronExpression(''); setMinOrders(5); setMaxOrders(50);
            await handleWarehouseChange(warehouseId);
        } catch (err) {
            console.error('Failed to create wave rule', err);
            alert('Failed to create wave rule');
        }
    }

    async function toggleEnabled(rule: WaveRule) {
        try {
            await updateWaveRule(rule.id, { enabled: !rule.enabled });
            await handleWarehouseChange(warehouseId);
        } catch { alert('Failed to update rule'); }
    }

    async function handleDelete(id: string) {
        if (!confirm('Delete this wave rule?')) return;
        try {
            await deleteWaveRule(id);
            await handleWarehouseChange(warehouseId);
        } catch { alert('Failed to delete rule'); }
    }

    async function handleTrigger(rule: WaveRule) {
        setTriggerResult(null);
        try {
            const res = await triggerWaveRule(rule.id);
            setTriggerResult(res.message ?? (res.success ? 'Wave released successfully' : 'No orders available'));
        } catch (err: any) {
            setTriggerResult('Error: ' + (err.message ?? 'Unknown error'));
        }
    }

    const triggerBadge: Record<TriggerType, string> = {
        MANUAL: 'bg-gray-100 text-gray-700',
        ORDER_COUNT: 'bg-blue-100 text-blue-700',
        TIME_BASED: 'bg-purple-100 text-purple-700',
    };

    if (loading) return <div className="p-8 text-gray-500">Loading wave rules…</div>;

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Waves className="h-6 w-6 text-blue-600" />
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Wave Release Rules</h2>
                        <p className="text-sm text-gray-500">Automate wave creation based on order count or time triggers.</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowForm(v => !v)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                >
                    <Plus className="h-4 w-4" />
                    New Rule
                </button>
            </div>

            {/* Warehouse selector */}
            <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">Warehouse</label>
                <select
                    value={warehouseId}
                    onChange={e => handleWarehouseChange(e.target.value)}
                    className="border border-gray-300 rounded-md py-1.5 px-3 text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
            </div>

            {/* Trigger result banner */}
            {triggerResult && (
                <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm flex justify-between">
                    <span>{triggerResult}</span>
                    <button onClick={() => setTriggerResult(null)} className="text-green-600 hover:text-green-800">✕</button>
                </div>
            )}

            {/* Create form */}
            {showForm && (
                <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 shadow-sm">
                    <h3 className="font-semibold text-gray-800">New Wave Rule</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Rule Name</label>
                            <input
                                required
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g. Morning Wave"
                                className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Trigger Type</label>
                            <select
                                value={triggerType}
                                onChange={e => setTriggerType(e.target.value as TriggerType)}
                                className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="MANUAL">Manual</option>
                                <option value="ORDER_COUNT">Order Count (auto)</option>
                                <option value="TIME_BASED">Time-Based (cron)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Min Orders to Release</label>
                            <input
                                type="number" min={1} max={500}
                                value={minOrders}
                                onChange={e => setMinOrders(parseInt(e.target.value) || 1)}
                                className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Max Orders per Wave</label>
                            <input
                                type="number" min={1} max={500}
                                value={maxOrders}
                                onChange={e => setMaxOrders(parseInt(e.target.value) || 50)}
                                className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        {triggerType === 'TIME_BASED' && (
                            <div className="col-span-2">
                                <label className="block text-xs font-medium text-gray-600 mb-1">Cron Expression</label>
                                <input
                                    value={cronExpression}
                                    onChange={e => setCronExpression(e.target.value)}
                                    placeholder="e.g. 0 8 * * * (8 AM daily)"
                                    className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm font-mono focus:ring-blue-500 focus:border-blue-500"
                                />
                                <p className="text-xs text-gray-400 mt-1">The system evaluates TIME_BASED and ORDER_COUNT rules every minute.</p>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-3 justify-end pt-2">
                        <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                            Cancel
                        </button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                            Create Rule
                        </button>
                    </div>
                </form>
            )}

            {/* Rules list */}
            {rules.length === 0 ? (
                <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center text-gray-400">
                    <Waves className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No wave rules configured</p>
                    <p className="text-sm mt-1">Create a rule to automate wave releases for this warehouse.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {rules.map(rule => (
                        <div key={rule.id} className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4 shadow-sm">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-gray-900 text-sm">{rule.name}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${triggerBadge[rule.triggerType as TriggerType] ?? triggerBadge.MANUAL}`}>
                                        {rule.triggerType.replace('_', ' ')}
                                    </span>
                                    {!rule.enabled && (
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">Disabled</span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500">
                                    Min {rule.minOrders} orders → release up to {rule.maxOrders} per wave
                                    {rule.cronExpression && <span className="ml-2 font-mono">[{rule.cronExpression}]</span>}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => handleTrigger(rule)}
                                    title="Trigger wave now"
                                    className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-medium hover:bg-green-100 transition"
                                >
                                    <Play className="h-3 w-3" /> Trigger
                                </button>
                                <button
                                    onClick={() => toggleEnabled(rule)}
                                    title={rule.enabled ? 'Disable rule' : 'Enable rule'}
                                    className="text-gray-400 hover:text-blue-600 transition"
                                >
                                    {rule.enabled
                                        ? <ToggleRight className="h-5 w-5 text-blue-600" />
                                        : <ToggleLeft className="h-5 w-5" />}
                                </button>
                                <button
                                    onClick={() => handleDelete(rule.id)}
                                    title="Delete rule"
                                    className="text-gray-400 hover:text-red-600 transition"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
