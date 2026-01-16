
'use client';

import { useState, useEffect } from 'react';
import { fetchStocktakeSessions } from '@/lib/api';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';

export default function StocktakingPage() {
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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

            <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {sessions.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                                    No active sessions
                                </td>
                            </tr>
                        ) : (
                            sessions.map((session) => (
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
