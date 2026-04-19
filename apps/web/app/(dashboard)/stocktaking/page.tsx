
'use client';

import { useState, useEffect } from 'react';
import { fetchStocktakeSessions } from '@/lib/api';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';

export default function StocktakingPage() {
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusTab, setStatusTab] = useState('ALL');
    const [colFilters, setColFilters] = useState({ date: '', type: '', description: '' });

    useEffect(() => {
        load();
    }, []);

    async function load() {
        try {
            const data = await fetchStocktakeSessions();
            setSessions(data);
        } catch (error) {
            console.error('Failed to fetch sessions:', error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <div className="p-8">Loading...</div>;

    const inputCls = 'w-full text-xs border border-gray-200 rounded px-2 py-1 font-normal focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white placeholder-gray-400';
    const getCount = (s: string) => s === 'ALL' ? sessions.length : sessions.filter(x => x.status === s).length;
    const filtered = sessions.filter(s => {
        if (statusTab !== 'ALL' && s.status !== statusTab) return false;
        if (colFilters.date) {
            const dateStr = format(new Date(s.createdAt), 'MMM d, HH:mm');
            if (!dateStr.toLowerCase().includes(colFilters.date.toLowerCase())) return false;
        }
        if (colFilters.type && !(s.type || '').toLowerCase().includes(colFilters.type.toLowerCase())) return false;
        if (colFilters.description && !(s.description || '').toLowerCase().includes(colFilters.description.toLowerCase())) return false;
        return true;
    });

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Stocktaking & Cycle Counting</h1>
                    <p className="text-gray-500">Manage blind counts, cycle counts, and reconciliations.</p>
                </div>
                <Link href="/stocktaking/new">
                    <Button>+ New Cycle Count</Button>
                </Link>
            </div>

            {/* Status Tabs */}
            <div className="flex space-x-1 border-b border-gray-200 mb-0 overflow-x-auto bg-white rounded-t-lg px-4 pt-4 shadow-sm">
                {[{ label: 'All', value: 'ALL' }, { label: 'Planned', value: 'PLANNED' }, { label: 'In Progress', value: 'IN_PROGRESS' }, { label: 'Completed', value: 'COMPLETED' }, { label: 'Cancelled', value: 'CANCELLED' }].map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => setStatusTab(tab.value)}
                        className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                            statusTab === tab.value ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        {tab.label}
                        <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                            statusTab === tab.value ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                        }`}>{getCount(tab.value)}</span>
                    </button>
                ))}
            </div>

            <div className="bg-white shadow rounded-b-lg overflow-hidden border border-gray-200 border-t-0">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                        {/* Column Filter Row */}
                        <tr className="bg-blue-50/50 border-t border-blue-100">
                            <th className="px-2 py-1.5">
                                <input type="text" placeholder="Date..." value={colFilters.date}
                                    onChange={e => setColFilters(p => ({ ...p, date: e.target.value }))} className={inputCls} />
                            </th>
                            <th className="px-2 py-1.5">
                                <input type="text" placeholder="Type..." value={colFilters.type}
                                    onChange={e => setColFilters(p => ({ ...p, type: e.target.value }))} className={inputCls} />
                            </th>
                            <th className="px-2 py-1.5">
                                <select value={statusTab === 'ALL' ? '' : statusTab} onChange={e => setStatusTab(e.target.value || 'ALL')} className={inputCls}>
                                    <option value="">All</option>
                                    <option value="PLANNED">Planned</option>
                                    <option value="IN_PROGRESS">In Progress</option>
                                    <option value="COMPLETED">Completed</option>
                                    <option value="CANCELLED">Cancelled</option>
                                </select>
                            </th>
                            <th className="px-2 py-1.5">
                                <input type="text" placeholder="Description..." value={colFilters.description}
                                    onChange={e => setColFilters(p => ({ ...p, description: e.target.value }))} className={inputCls} />
                            </th>
                            <th className="px-2 py-1.5">
                                <button onClick={() => { setStatusTab('ALL'); setColFilters({ date:'', type:'', description:'' }); }}
                                    className="w-full text-xs text-red-400 hover:text-red-600 py-1 rounded hover:bg-red-50 transition-colors">Clear</button>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                                    No active sessions
                                </td>
                            </tr>
                        ) : (
                            filtered.map((session) => (
                                <tr key={session.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {format(new Date(session.createdAt), 'MMM d, HH:mm')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {session.type}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <SessionStatusBadge status={session.status} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {session.description || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        {session.status !== 'COMPLETED' && (
                                            <Link href={`/stocktaking/${session.id}/count`}>
                                                <Button variant="outline" size="sm">Count</Button>
                                            </Link>
                                        )}
                                        {(session.status === 'IN_PROGRESS' || session.status === 'COMPLETED') && (
                                            <Link href={`/stocktaking/${session.id}/reconcile`}>
                                                <Button variant="outline" size="sm">
                                                    {session.status === 'COMPLETED' ? 'Review' : 'Reconcile'}
                                                </Button>
                                            </Link>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function SessionStatusBadge({ status }: { status: string }) {
    const colors: any = {
        'PLANNED': 'bg-gray-100 text-gray-800',
        'IN_PROGRESS': 'bg-blue-100 text-blue-800',
        'COMPLETED': 'bg-green-100 text-green-800',
        'CANCELLED': 'bg-red-100 text-red-800',
    };
    return (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colors[status] || 'bg-gray-100'}`}>
            {status}
        </span>
    );
}
