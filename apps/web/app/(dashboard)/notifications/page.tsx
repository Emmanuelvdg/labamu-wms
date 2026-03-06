'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/api';
import { Bell, Check, CheckCheck, Clock, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function NotificationsPage() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

    useEffect(() => { loadNotifications(); }, [filter]);

    async function loadNotifications() {
        setLoading(true);
        try {
            const readFilter = filter === 'all' ? undefined : filter === 'unread' ? false : true;
            const data = await fetchNotifications({ read: readFilter });
            setNotifications(data);
        } catch (err) {
            toast.error('Failed to load notifications');
        } finally {
            setLoading(false);
        }
    }

    async function handleMarkRead(id: string) {
        try {
            await markNotificationRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        } catch (err) {
            toast.error('Failed to mark as read');
        }
    }

    async function handleMarkAllRead() {
        try {
            await markAllNotificationsRead();
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            toast.success('All notifications marked as read');
        } catch (err) {
            toast.error('Failed to mark all as read');
        }
    }

    function getTypeLabel(type: string) {
        const labels: Record<string, { label: string; color: string }> = {
            EXPIRY_WARNING: { label: '⏰ Expiry Warning', color: 'bg-orange-100 text-orange-800' },
            EXPIRED_STOCK: { label: '🔴 Expired', color: 'bg-red-100 text-red-800' },
            LOW_STOCK: { label: '🟡 Low Stock', color: 'bg-yellow-100 text-yellow-800' },
            CRITICAL_LOW: { label: '🔴 Critical Low', color: 'bg-red-100 text-red-800' },
            ORDER_SHIPPED: { label: '📦 Shipped', color: 'bg-blue-100 text-blue-800' },
            RETURN_RECEIVED: { label: '↩️ Return', color: 'bg-purple-100 text-purple-800' },
        };
        return labels[type] || { label: type, color: 'bg-gray-100 text-gray-800' };
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Bell className="h-6 w-6" /> Notifications
                    </h1>
                    <button onClick={handleMarkAllRead} className="flex items-center gap-1 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg">
                        <CheckCheck className="h-4 w-4" /> Mark all read
                    </button>
                </div>

                <div className="flex gap-2 mb-4">
                    {(['all', 'unread', 'read'] as const).map(f => (
                        <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${filter === f ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                            {f}
                        </button>
                    ))}
                </div>

                {loading ? <p className="text-gray-500">Loading...</p> : (
                    <div className="space-y-2">
                        {notifications.length === 0 ? (
                            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-500">
                                No notifications found.
                            </div>
                        ) : notifications.map(n => {
                            const typeInfo = getTypeLabel(n.type);
                            return (
                                <div key={n.id} className={`bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow ${!n.read ? 'border-l-4 border-l-blue-500' : ''}`}>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeInfo.color}`}>{typeInfo.label}</span>
                                                <span className="text-xs text-gray-400 flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(n.createdAt).toLocaleString()}</span>
                                            </div>
                                            <div className="font-medium text-gray-900">{n.title}</div>
                                            <div className="text-sm text-gray-600 mt-0.5">{n.body}</div>
                                            {n.link && (
                                                <button onClick={() => router.push(n.link)} className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                                                    View details <ExternalLink className="h-3 w-3" />
                                                </button>
                                            )}
                                        </div>
                                        {!n.read && (
                                            <button onClick={() => handleMarkRead(n.id)} className="text-gray-400 hover:text-blue-600 ml-2" title="Mark as read">
                                                <Check className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
