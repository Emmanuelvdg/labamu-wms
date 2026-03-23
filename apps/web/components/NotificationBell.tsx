'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { fetchNotifications, fetchUnreadNotificationCount, markNotificationRead, markAllNotificationsRead } from '@/lib/api';
import { Bell, Check, CheckCheck, ExternalLink } from 'lucide-react';

export default function NotificationBell() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadUnreadCount();
        const interval = setInterval(loadUnreadCount, 30000); // poll every 30s
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (open) loadNotifications();
    }, [open]);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    async function loadUnreadCount() {
        try {
            const data = await fetchUnreadNotificationCount();
            setUnreadCount(data.count);
        } catch {
            // Silently ignore — transient network errors should not block the UI
        }
    }

    async function loadNotifications() {
        try {
            const data = await fetchNotifications({ limit: 10 });
            setNotifications(data);
        } catch {
            // Silently ignore
        }
    }

    async function handleMarkRead(id: string) {
        try {
            await markNotificationRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error(err);
        }
    }

    async function handleMarkAllRead() {
        try {
            await markAllNotificationsRead();
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error(err);
        }
    }

    function getTypeColor(type: string) {
        switch (type) {
            case 'EXPIRY_WARNING': return 'bg-orange-500';
            case 'EXPIRED_STOCK': return 'bg-red-500';
            case 'LOW_STOCK': return 'bg-yellow-500';
            case 'CRITICAL_LOW': return 'bg-red-500';
            case 'ORDER_SHIPPED': return 'bg-blue-500';
            default: return 'bg-gray-500';
        }
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setOpen(!open)}
                className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                title="Notifications"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[480px] overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <h3 className="font-semibold text-gray-900">Notifications</h3>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                >
                                    <CheckCheck className="h-3.5 w-3.5" />
                                    Mark all read
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="overflow-y-auto flex-1">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 text-sm">
                                No notifications
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div
                                    key={n.id}
                                    className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer ${!n.read ? 'bg-blue-50/50' : ''}`}
                                    onClick={() => {
                                        if (!n.read) handleMarkRead(n.id);
                                        if (n.link) {
                                            router.push(n.link);
                                            setOpen(false);
                                        }
                                    }}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${getTypeColor(n.type)}`} />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-gray-900">{n.title}</div>
                                            <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                {new Date(n.createdAt).toLocaleString()}
                                            </div>
                                        </div>
                                        {!n.read && (
                                            <button
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    handleMarkRead(n.id);
                                                }}
                                                className="text-gray-400 hover:text-blue-600 flex-shrink-0"
                                                title="Mark as read"
                                            >
                                                <Check className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="border-t border-gray-100 px-4 py-2">
                        <button
                            onClick={() => {
                                router.push('/notifications');
                                setOpen(false);
                            }}
                            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 w-full justify-center"
                        >
                            View all notifications
                            <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
