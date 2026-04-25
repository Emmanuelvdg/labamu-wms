'use client';

import { useEffect, useState } from 'react';
import { listAnnouncements, createAnnouncement, deleteAnnouncement } from '@/lib/admin-api';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Megaphone } from 'lucide-react';

const TARGET_LABELS: Record<string, string> = {
    ALL: 'All Tenants',
    PLAN: 'By Plan',
    COMPANY: 'Specific Tenant',
};

export default function AnnouncementsPage() {
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [form, setForm] = useState({
        title: '',
        body: '',
        targetType: 'ALL',
        targetValue: '',
        startsAt: '',
        endsAt: '',
    });

    const load = () => {
        setLoading(true);
        listAnnouncements()
            .then((data: any[]) => setAnnouncements(Array.isArray(data) ? data : []))
            .catch((e: any) => setError(e.message || 'Failed to load announcements'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const handleCreate = async () => {
        setCreateError('');
        if (!form.title || !form.body) { setCreateError('Title and body are required.'); return; }
        setCreating(true);
        try {
            await createAnnouncement({
                title: form.title,
                body: form.body,
                targetType: form.targetType,
                targetValue: form.targetValue || undefined,
                startsAt: form.startsAt || undefined,
                endsAt: form.endsAt || undefined,
            });
            setShowCreate(false);
            setForm({ title: '', body: '', targetType: 'ALL', targetValue: '', startsAt: '', endsAt: '' });
            load();
        } catch (e: any) {
            setCreateError(e.message || 'Failed to create announcement');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this announcement?')) return;
        setDeletingId(id);
        try {
            await deleteAnnouncement(id);
            load();
        } catch (e: any) {
            alert(e.message || 'Failed to delete');
        } finally {
            setDeletingId(null);
        }
    };

    const isActive = (a: any) => {
        const now = new Date();
        const starts = new Date(a.startsAt);
        if (starts > now) return false;
        if (a.endsAt && new Date(a.endsAt) < now) return false;
        return true;
    };

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
                    <p className="text-sm text-gray-500 mt-1">In-app announcements visible to tenants</p>
                </div>
                <Button onClick={() => setShowCreate(true)}>
                    <Plus className="w-4 h-4 mr-2" /> New Announcement
                </Button>
            </div>

            {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm">{error}</div>}

            {loading ? (
                <div className="text-sm text-gray-500">Loading...</div>
            ) : announcements.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <div className="bg-gray-50 inline-flex p-4 rounded-full mb-4">
                        <Megaphone className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500">No announcements yet</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {announcements.map((a: any) => {
                        const active = isActive(a);
                        return (
                            <div key={a.id} className={`bg-white rounded-xl border p-5 flex items-start justify-between gap-4 ${active ? 'border-green-200' : 'border-gray-200 opacity-70'}`}>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {active ? 'Active' : 'Inactive'}
                                        </span>
                                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                            {TARGET_LABELS[a.targetType] ?? a.targetType}
                                            {a.targetValue ? `: ${a.targetValue}` : ''}
                                        </span>
                                    </div>
                                    <h3 className="font-semibold text-gray-900 text-sm">{a.title}</h3>
                                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{a.body}</p>
                                    <div className="flex gap-4 mt-2 text-xs text-gray-400">
                                        <span>Starts: {new Date(a.startsAt).toLocaleDateString()}</span>
                                        {a.endsAt && <span>Ends: {new Date(a.endsAt).toLocaleDateString()}</span>}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(a.id)}
                                    disabled={deletingId === a.id}
                                    className="flex-shrink-0 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl">
                        <h2 className="text-lg font-bold mb-4">New Announcement</h2>
                        {createError && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded">{createError}</div>}
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 p-2 rounded text-sm"
                                    value={form.title}
                                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                                    placeholder="System maintenance scheduled"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Body *</label>
                                <textarea
                                    className="w-full border border-gray-300 p-2 rounded text-sm"
                                    rows={3}
                                    value={form.body}
                                    onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
                                    placeholder="Provide details of the announcement..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Target</label>
                                    <select
                                        className="w-full border border-gray-300 p-2 rounded text-sm"
                                        value={form.targetType}
                                        onChange={e => setForm(p => ({ ...p, targetType: e.target.value, targetValue: '' }))}
                                    >
                                        <option value="ALL">All Tenants</option>
                                        <option value="PLAN">Specific Plan</option>
                                        <option value="COMPANY">Specific Tenant</option>
                                    </select>
                                </div>
                                {form.targetType !== 'ALL' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {form.targetType === 'PLAN' ? 'Plan name' : 'Company ID'}
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full border border-gray-300 p-2 rounded text-sm"
                                            value={form.targetValue}
                                            onChange={e => setForm(p => ({ ...p, targetValue: e.target.value }))}
                                            placeholder={form.targetType === 'PLAN' ? 'STARTER' : 'cmp_...'}
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Starts At</label>
                                    <input
                                        type="datetime-local"
                                        className="w-full border border-gray-300 p-2 rounded text-sm"
                                        value={form.startsAt}
                                        onChange={e => setForm(p => ({ ...p, startsAt: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ends At <span className="text-gray-400 font-normal">(optional)</span></label>
                                    <input
                                        type="datetime-local"
                                        className="w-full border border-gray-300 p-2 rounded text-sm"
                                        value={form.endsAt}
                                        onChange={e => setForm(p => ({ ...p, endsAt: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <Button variant="ghost" onClick={() => { setShowCreate(false); setCreateError(''); }}>Cancel</Button>
                            <Button onClick={handleCreate} disabled={creating}>{creating ? 'Creating...' : 'Publish'}</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
