'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Edit, Copy, Plus, Search, Filter } from 'lucide-react';

interface PutawayRule {
    id: string;
    name: string;
    description?: string;
    strategy: string;
    priority: number;
    active: boolean;
    warehouse?: { name: string };
    product?: { name: string; sku: string };
    categoryId?: string;
    createdAt: string;
}

const STRATEGY_LABELS: Record<string, { label: string; icon: string; color: string }> = {
    FIXED: { label: 'Fixed Location', icon: '📍', color: 'bg-blue-100 text-blue-800' },
    ZONE_PRIORITY: { label: 'Zone Priority', icon: '🎯', color: 'bg-purple-100 text-purple-800' },
    CLOSEST: { label: 'Closest', icon: '📏', color: 'bg-green-100 text-green-800' },
    LEAST_OCCUPIED: { label: 'Least Occupied', icon: '⚖️', color: 'bg-yellow-100 text-yellow-800' },
    BALANCED: { label: 'Balanced', icon: '🎲', color: 'bg-orange-100 text-orange-800' },
};

export default function PutawayRulesPage() {
    const router = useRouter();
    const [rules, setRules] = useState<PutawayRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [strategyFilter, setStrategyFilter] = useState<string>('');
    const [activeFilter, setActiveFilter] = useState<string>('all');
    const [showFilters, setShowFilters] = useState(false);
    const [colFilters, setColFilters] = useState({ priority: '', scope: '' });

    useEffect(() => {
        fetchRules();
    }, []);

    async function fetchRules() {
        try {
            setLoading(true);
            const response = await fetch('/api/inventory/putaway-rules');
            const data = await response.json();
            setRules(data);
        } catch (error) {
            console.error('Error fetching putaway rules:', error);
        } finally {
            setLoading(false);
        }
    }

    async function toggleActive(ruleId: string, currentActive: boolean) {
        try {
            await fetch(`/api/inventory/putaway-rules/${ruleId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': localStorage.getItem('userId') || '',
                },
                body: JSON.stringify({ active: !currentActive }),
            });
            fetchRules();
        } catch (error) {
            console.error('Error toggling rule:', error);
        }
    }

    async function deleteRule(ruleId: string, ruleName: string) {
        if (!confirm(`Are you sure you want to delete the rule "${ruleName}"?`)) return;

        try {
            await fetch(`/api/inventory/putaway-rules/${ruleId}`, {
                method: 'DELETE',
                headers: { 'x-user-id': localStorage.getItem('userId') || '' },
            });
            fetchRules();
        } catch (error) {
            console.error('Error deleting rule:', error);
        }
    }

    async function duplicateRule(rule: PutawayRule) {
        router.push(`/inventory/putaway-rules/new?duplicate=${rule.id}`);
    }

    const filteredRules = rules.filter((rule) => {
        const matchesSearch =
            rule.name.toLowerCase().includes(searchQuery.toLowerCase

                ()) ||
            rule.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStrategy = !strategyFilter || rule.strategy === strategyFilter;
        const matchesActive =
            activeFilter === 'all' || (activeFilter === 'active' && rule.active) || (activeFilter === 'inactive' && !rule.active);
        const matchesPriority = !colFilters.priority || rule.priority.toString().includes(colFilters.priority);
        const matchesScope = !colFilters.scope ||
            (rule.warehouse?.name || 'All Warehouses').toLowerCase().includes(colFilters.scope.toLowerCase());

        return matchesSearch && matchesStrategy && matchesActive && matchesPriority && matchesScope;
    });

    function getPriorityBadge(priority: number) {
        if (priority >= 150) return 'bg-red-100 text-red-800 font-semibold';
        if (priority >= 100) return 'bg-yellow-100 text-yellow-800 font-medium';
        return 'bg-gray-100 text-gray-800';
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading putaway rules...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Putaway Rules</h1>
                    <p className="mt-2 text-gray-600">Manage automated putaway location selection rules</p>
                </div>
                <button
                    onClick={() => router.push('/inventory/putaway-rules/new')}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                >
                    <Plus size={20} />
                    Create Rule
                </button>
            </div>

            {/* Status Tabs */}
            <div className="flex space-x-1 border-b border-gray-200 mb-6 overflow-x-auto">
                {[{ label: 'All', value: 'all' }, { label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }].map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => setActiveFilter(tab.value)}
                        className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                            activeFilter === tab.value
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        {tab.label}
                        <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                            activeFilter === tab.value ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                        }`}>
                            {tab.value === 'all' ? rules.length : rules.filter(r => tab.value === 'active' ? r.active : !r.active).length}
                        </span>
                    </button>
                ))}
            </div>

            {/* Search and Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                <div className="flex gap-4 flex-wrap">
                    {/* Search */}
                    <div className="flex-1 min-w-[300px]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search rules by name or description..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Filter Toggle */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <Filter size={20} />
                        Filters
                    </button>
                </div>

                {/* Advanced Filters */}
                {showFilters && (
                    <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Strategy Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Strategy</label>
                            <select
                                value={strategyFilter}
                                onChange={(e) => setStrategyFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Strategies</option>
                                {Object.entries(STRATEGY_LABELS).map(([value, { label }]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Active Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                            <select
                                value={activeFilter}
                                onChange={(e) => setActiveFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All Rules</option>
                                <option value="active">Active Only</option>
                                <option value="inactive">Inactive Only</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* Rules Count */}
            <div className="mb-4 text-sm text-gray-600">
                Showing {filteredRules.length} of {rules.length} rules
            </div>

            {/* Rules Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Priority</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Rule Name</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Strategy</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Scope</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                            </tr>
                            {/* Column Filter Row */}
                            <tr className="bg-blue-50/50 border-t border-blue-100">
                                <th className="px-2 py-1.5">
                                    <input type="number" placeholder="Priority..." value={colFilters.priority}
                                        onChange={e => setColFilters(p => ({ ...p, priority: e.target.value }))}
                                        className="w-full text-xs border border-gray-200 rounded px-2 py-1 font-normal focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white placeholder-gray-400" />
                                </th>
                                <th className="px-2 py-1.5">
                                    <input type="text" placeholder="Name..." value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full text-xs border border-gray-200 rounded px-2 py-1 font-normal focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white placeholder-gray-400" />
                                </th>
                                <th className="px-2 py-1.5">
                                    <select value={strategyFilter} onChange={e => setStrategyFilter(e.target.value)}
                                        className="w-full text-xs border border-gray-200 rounded px-2 py-1 font-normal focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white">
                                        <option value="">All Strategies</option>
                                        {Object.entries(STRATEGY_LABELS).map(([value, { label }]) => (
                                            <option key={value} value={value}>{label}</option>
                                        ))}
                                    </select>
                                </th>
                                <th className="px-2 py-1.5">
                                    <input type="text" placeholder="Warehouse..." value={colFilters.scope}
                                        onChange={e => setColFilters(p => ({ ...p, scope: e.target.value }))}
                                        className="w-full text-xs border border-gray-200 rounded px-2 py-1 font-normal focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white placeholder-gray-400" />
                                </th>
                                <th className="px-2 py-1.5">
                                    <select value={activeFilter} onChange={e => setActiveFilter(e.target.value)}
                                        className="w-full text-xs border border-gray-200 rounded px-2 py-1 font-normal focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white">
                                        <option value="all">All</option>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </th>
                                <th className="px-2 py-1.5">
                                    <button
                                        onClick={() => { setSearchQuery(''); setStrategyFilter(''); setActiveFilter('all'); setColFilters({ priority: '', scope: '' }); }}
                                        className="w-full text-xs text-red-400 hover:text-red-600 py-1 rounded hover:bg-red-50 transition-colors">
                                        Clear
                                    </button>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredRules.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        <div className="text-center">
                                            <p className="text-lg font-medium">No rules found</p>
                                            <p className="mt-1 text-sm">Create your first putaway rule to get started</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredRules.map((rule) => (
                                    <tr key={rule.id} className="hover:bg-gray-50 transition-colors">
                                        {/* Priority */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-3 py-1 rounded-full text-sm ${getPriorityBadge(rule.priority)}`}>
                                                {rule.priority}
                                            </span>
                                        </td>

                                        {/* Rule Name */}
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-gray-900">{rule.name}</span>
                                                {rule.description && <span className="text-sm text-gray-500 mt-1">{rule.description}</span>}
                                                {rule.product && (
                                                    <span className="text-xs text-blue-600 mt-1">Product: {rule.product.sku}</span>
                                                )}
                                                {rule.categoryId && (
                                                    <span className="text-xs text-purple-600 mt-1">Category: {rule.categoryId}</span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Strategy */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm ${STRATEGY_LABELS[rule.strategy]?.color || 'bg-gray-100'}`}>
                                                <span>{STRATEGY_LABELS[rule.strategy]?.icon}</span>
                                                <span>{STRATEGY_LABELS[rule.strategy]?.label || rule.strategy}</span>
                                            </span>
                                        </td>

                                        {/* Scope */}
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {rule.warehouse ? rule.warehouse.name : 'All Warehouses'}
                                        </td>

                                        {/* Status */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <button
                                                onClick={() => toggleActive(rule.id, rule.active)}
                                                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${rule.active
                                                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {rule.active ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>

                                        {/* Actions */}
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => router.push(`/inventory/putaway-rules/${rule.id}/edit`)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit rule"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => duplicateRule(rule)}
                                                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                                    title="Duplicate rule"
                                                >
                                                    <Copy size={18} />
                                                </button>
                                                <button
                                                    onClick={() => deleteRule(rule.id, rule.name)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete rule"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Help Text */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 How Putaway Rules Work</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Rules are evaluated in <strong>priority order</strong> (highest first)</li>
                    <li>• The first matching rule determines the putaway location</li>
                    <li>• If no rules match, the system uses velocity-based fallback logic</li>
                    <li>• Inactive rules are skipped during evaluation</li>
                </ul>
            </div>
        </div>
    );
}
