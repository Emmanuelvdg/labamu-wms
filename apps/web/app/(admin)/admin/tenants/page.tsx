'use client';

import { useEffect, useState } from 'react';
import {
    fetchTenants, registerTenant, updateTenant, updateTenantStatus,
    inviteUserToTenant, bulkStatusChange, bulkPlanChange,
} from '@/lib/admin-api';
import { Button } from '@/components/ui/button';
import { SearchX, Building2, UserPlus, Pencil, ExternalLink, CheckSquare, Square } from 'lucide-react';
import Link from 'next/link';

const inputCls = 'w-full text-xs border border-gray-200 rounded px-2 py-1 font-normal focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white placeholder-gray-400';

const planBadge: Record<string, string> = {
    FREE: 'bg-gray-100 text-gray-600',
    STARTER: 'bg-blue-100 text-blue-700',
    PROFESSIONAL: 'bg-purple-100 text-purple-700',
    ENTERPRISE: 'bg-amber-100 text-amber-700',
};
const statusBadge: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700',
    SUSPENDED: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-gray-100 text-gray-500',
};

export default function AdminTenantsPage() {
    const [tenants, setTenants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkAction, setBulkAction] = useState('');
    const [bulkValue, setBulkValue] = useState('');
    const [bulkRunning, setBulkRunning] = useState(false);

    // Column filters
    const [colFilters, setColFilters] = useState({ name: '', plan: '', status: '' });

    // Create tenant modal
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createForm, setCreateForm] = useState({
        name: '', slug: '', plan: 'STARTER',
        adminName: '', adminEmail: '', adminPassword: '',
    });
    const [createError, setCreateError] = useState('');

    // Edit tenant modal
    const [editTarget, setEditTarget] = useState<any | null>(null);
    const [editForm, setEditForm] = useState({ name: '', slug: '', plan: '' });
    const [editing, setEditing] = useState(false);
    const [editError, setEditError] = useState('');

    // Invite user modal
    const [inviteTarget, setInviteTarget] = useState<{ id: string; name: string } | null>(null);
    const [inviting, setInviting] = useState(false);
    const [inviteForm, setInviteForm] = useState({ name: '', email: '', password: '' });
    const [inviteError, setInviteError] = useState('');

    // Status change
    const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

    useEffect(() => { loadTenants(); }, []);

    const loadTenants = async () => {
        setLoading(true);
        try {
            const data = await fetchTenants();
            setTenants(Array.isArray(data) ? data : []);
        } catch (e: any) {
            setError(e.message || 'Failed to load tenants');
        } finally {
            setLoading(false);
        }
    };

    const openEdit = (t: any) => {
        setEditTarget(t);
        setEditForm({ name: t.name, slug: t.slug, plan: t.plan });
        setEditError('');
    };

    const handleEdit = async () => {
        setEditError('');
        if (!editForm.name || !editForm.slug) { setEditError('Name and slug are required.'); return; }
        setEditing(true);
        try {
            await updateTenant(editTarget.id, editForm);
            await loadTenants();
            setEditTarget(null);
        } catch (e: any) {
            setEditError(e.message || 'Failed to update tenant');
        } finally {
            setEditing(false);
        }
    };

    const handleCreate = async () => {
        setCreateError('');
        if (!createForm.name || !createForm.slug || !createForm.adminEmail || !createForm.adminPassword) {
            setCreateError('Name, slug, admin email, and password are required.');
            return;
        }
        setCreating(true);
        try {
            await registerTenant(createForm);
            await loadTenants();
            setShowCreate(false);
            setCreateForm({ name: '', slug: '', plan: 'STARTER', adminName: '', adminEmail: '', adminPassword: '' });
        } catch (e: any) {
            setCreateError(e.message || 'Failed to create tenant');
        } finally {
            setCreating(false);
        }
    };

    const handleStatusChange = async (id: string, status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED') => {
        setUpdatingStatus(id);
        try {
            await updateTenantStatus(id, status);
            await loadTenants();
        } catch (e: any) {
            alert(e.message || 'Failed to update status');
        } finally {
            setUpdatingStatus(null);
        }
    };

    const handleInvite = async () => {
        setInviteError('');
        if (!inviteForm.name || !inviteForm.email || !inviteForm.password) {
            setInviteError('Name, email, and password are required.');
            return;
        }
        if (!inviteTarget) return;
        setInviting(true);
        try {
            await inviteUserToTenant(inviteTarget.id, inviteForm);
            setInviteTarget(null);
            setInviteForm({ name: '', email: '', password: '' });
        } catch (e: any) {
            setInviteError(e.message || 'Failed to invite user');
        } finally {
            setInviting(false);
        }
    };

    const setCF = (key: string, val: string) => setColFilters(prev => ({ ...prev, [key]: val }));
    const clearColFilters = () => setColFilters({ name: '', plan: '', status: '' });

    const filtered = tenants.filter(t => {
        if (colFilters.name && !t.name.toLowerCase().includes(colFilters.name.toLowerCase()) && !t.slug.toLowerCase().includes(colFilters.name.toLowerCase())) return false;
        if (colFilters.plan && t.plan !== colFilters.plan) return false;
        if (colFilters.status && t.status !== colFilters.status) return false;
        return true;
    });

    const allFilteredSelected = filtered.length > 0 && filtered.every(t => selectedIds.has(t.id));

    const toggleAll = () => {
        if (allFilteredSelected) {
            setSelectedIds(prev => { const n = new Set(prev); filtered.forEach(t => n.delete(t.id)); return n; });
        } else {
            setSelectedIds(prev => { const n = new Set(prev); filtered.forEach(t => n.add(t.id)); return n; });
        }
    };

    const toggleOne = (id: string) => {
        setSelectedIds(prev => {
            const n = new Set(prev);
            n.has(id) ? n.delete(id) : n.add(id);
            return n;
        });
    };

    const handleBulkAction = async () => {
        if (!bulkAction || selectedIds.size === 0) return;
        const ids = [...selectedIds];
        setBulkRunning(true);
        try {
            if (bulkAction === 'status') {
                if (!bulkValue) { alert('Select a status'); return; }
                await bulkStatusChange(ids, bulkValue as any);
            } else if (bulkAction === 'plan') {
                if (!bulkValue) { alert('Select a plan'); return; }
                await bulkPlanChange(ids, bulkValue);
            }
            setSelectedIds(new Set());
            setBulkAction('');
            setBulkValue('');
            await loadTenants();
        } catch (e: any) {
            alert(e.message || 'Bulk action failed');
        } finally {
            setBulkRunning(false);
        }
    };

    if (loading) return <div className="p-8 text-sm text-gray-500">Loading tenants...</div>;
    if (error) return <div className="p-8"><div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm">{error}</div></div>;

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
                    <p className="text-sm text-gray-500">Manage all companies on the platform</p>
                </div>
                <Button onClick={() => setShowCreate(true)}>
                    <Building2 className="w-4 h-4 mr-2" />
                    New Tenant
                </Button>
            </div>

            {/* Bulk action toolbar */}
            {selectedIds.size > 0 && (
                <div className="mb-3 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
                    <span className="text-sm font-medium text-blue-700">{selectedIds.size} selected</span>
                    <div className="flex items-center gap-2 ml-auto">
                        <select
                            value={bulkAction}
                            onChange={e => { setBulkAction(e.target.value); setBulkValue(''); }}
                            className="text-sm border border-blue-200 rounded px-2 py-1 bg-white focus:outline-none"
                        >
                            <option value="">Choose action…</option>
                            <option value="status">Change Status</option>
                            <option value="plan">Change Plan</option>
                        </select>
                        {bulkAction === 'status' && (
                            <select value={bulkValue} onChange={e => setBulkValue(e.target.value)}
                                className="text-sm border border-blue-200 rounded px-2 py-1 bg-white focus:outline-none">
                                <option value="">Select status…</option>
                                <option value="ACTIVE">Active</option>
                                <option value="SUSPENDED">Suspended</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                        )}
                        {bulkAction === 'plan' && (
                            <select value={bulkValue} onChange={e => setBulkValue(e.target.value)}
                                className="text-sm border border-blue-200 rounded px-2 py-1 bg-white focus:outline-none">
                                <option value="">Select plan…</option>
                                <option value="FREE">FREE</option>
                                <option value="STARTER">STARTER</option>
                                <option value="PROFESSIONAL">PROFESSIONAL</option>
                                <option value="ENTERPRISE">ENTERPRISE</option>
                            </select>
                        )}
                        <Button size="sm" onClick={handleBulkAction} disabled={bulkRunning || !bulkAction || !bulkValue}>
                            {bulkRunning ? 'Applying...' : 'Apply'}
                        </Button>
                        <button onClick={() => { setSelectedIds(new Set()); setBulkAction(''); setBulkValue(''); }}
                            className="text-sm text-gray-500 hover:text-gray-700">
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 w-10">
                                <button onClick={toggleAll} className="text-gray-400 hover:text-gray-600">
                                    {allFilteredSelected
                                        ? <CheckSquare className="w-4 h-4 text-blue-600" />
                                        : <Square className="w-4 h-4" />}
                                </button>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Company</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                        <tr className="bg-blue-50/50 border-t border-blue-100">
                            <th className="px-4 py-1.5" />
                            <th className="px-2 py-1.5">
                                <input type="text" placeholder="Name / slug..." value={colFilters.name}
                                    onChange={e => setCF('name', e.target.value)} className={inputCls} />
                            </th>
                            <th className="px-2 py-1.5">
                                <select value={colFilters.plan} onChange={e => setCF('plan', e.target.value)} className={inputCls}>
                                    <option value="">All plans</option>
                                    <option value="FREE">FREE</option>
                                    <option value="STARTER">STARTER</option>
                                    <option value="PROFESSIONAL">PROFESSIONAL</option>
                                    <option value="ENTERPRISE">ENTERPRISE</option>
                                </select>
                            </th>
                            <th className="px-2 py-1.5">
                                <select value={colFilters.status} onChange={e => setCF('status', e.target.value)} className={inputCls}>
                                    <option value="">All statuses</option>
                                    <option value="ACTIVE">ACTIVE</option>
                                    <option value="SUSPENDED">SUSPENDED</option>
                                    <option value="CANCELLED">CANCELLED</option>
                                </select>
                            </th>
                            <th className="px-2 py-1.5" />
                            <th className="px-2 py-1.5">
                                <button onClick={clearColFilters}
                                    className="w-full text-xs text-red-400 hover:text-red-600 py-1 rounded hover:bg-red-50 transition-colors">
                                    Clear
                                </button>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-16 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="bg-gray-50 p-4 rounded-full">
                                            <SearchX className="h-8 w-8 text-gray-400" />
                                        </div>
                                        <h3 className="text-sm font-medium text-gray-900">No tenants found</h3>
                                        <button onClick={clearColFilters}
                                            className="text-blue-600 text-sm hover:text-blue-700 hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors">
                                            Clear Filters
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filtered.map(t => (
                                <tr key={t.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.has(t.id) ? 'bg-blue-50/30' : ''}`}>
                                    <td className="px-4 py-4">
                                        <button onClick={() => toggleOne(t.id)} className="text-gray-400 hover:text-blue-600">
                                            {selectedIds.has(t.id)
                                                ? <CheckSquare className="w-4 h-4 text-blue-600" />
                                                : <Square className="w-4 h-4" />}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{t.name}</div>
                                        <div className="text-xs text-gray-400">{t.slug}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${planBadge[t.plan] || 'bg-gray-100 text-gray-600'}`}>
                                            {t.plan}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge[t.status] || 'bg-gray-100 text-gray-600'}`}>
                                            {t.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {new Date(t.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-3">
                                            <Link href={`/admin/tenants/${t.id}`}
                                                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                                                <ExternalLink className="w-3 h-3" /> Detail
                                            </Link>
                                            <button onClick={() => openEdit(t)}
                                                className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1">
                                                <Pencil className="w-3 h-3" /> Edit
                                            </button>
                                            <button
                                                onClick={() => { setInviteTarget({ id: t.id, name: t.name }); setInviteForm({ name: '', email: '', password: '' }); setInviteError(''); }}
                                                className="text-xs text-indigo-600 hover:text-indigo-900 flex items-center gap-1">
                                                <UserPlus className="w-3 h-3" /> Invite
                                            </button>
                                            {t.status === 'ACTIVE' ? (
                                                <button disabled={updatingStatus === t.id}
                                                    onClick={() => handleStatusChange(t.id, 'SUSPENDED')}
                                                    className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50">
                                                    Suspend
                                                </button>
                                            ) : t.status === 'SUSPENDED' ? (
                                                <button disabled={updatingStatus === t.id}
                                                    onClick={() => handleStatusChange(t.id, 'ACTIVE')}
                                                    className="text-xs text-green-600 hover:text-green-800 disabled:opacity-50">
                                                    Reactivate
                                                </button>
                                            ) : null}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            <p className="mt-3 text-xs text-gray-500">Showing {filtered.length} of {tenants.length} tenants</p>

            {/* Create Tenant Modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                        <h2 className="text-lg font-bold mb-4">New Tenant</h2>
                        {createError && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded">{createError}</div>}
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                                <input type="text" className="w-full border border-gray-300 p-2 rounded text-sm"
                                    value={createForm.name}
                                    onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))}
                                    placeholder="Acme Corp" autoFocus />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Slug * <span className="text-gray-400 font-normal">(URL identifier)</span></label>
                                <input type="text" className="w-full border border-gray-300 p-2 rounded text-sm"
                                    value={createForm.slug}
                                    onChange={e => setCreateForm(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                                    placeholder="acme-corp" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                                <select className="w-full border border-gray-300 p-2 rounded text-sm"
                                    value={createForm.plan}
                                    onChange={e => setCreateForm(p => ({ ...p, plan: e.target.value }))}>
                                    <option value="FREE">FREE</option>
                                    <option value="STARTER">STARTER</option>
                                    <option value="PROFESSIONAL">PROFESSIONAL</option>
                                    <option value="ENTERPRISE">ENTERPRISE</option>
                                </select>
                            </div>
                            <hr className="my-2" />
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Admin Account</p>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Admin Name</label>
                                <input type="text" className="w-full border border-gray-300 p-2 rounded text-sm"
                                    value={createForm.adminName}
                                    onChange={e => setCreateForm(p => ({ ...p, adminName: e.target.value }))}
                                    placeholder="John Doe" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Admin Email *</label>
                                <input type="email" className="w-full border border-gray-300 p-2 rounded text-sm"
                                    value={createForm.adminEmail}
                                    onChange={e => setCreateForm(p => ({ ...p, adminEmail: e.target.value }))}
                                    placeholder="admin@acme-corp.com" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Admin Password *</label>
                                <input type="password" className="w-full border border-gray-300 p-2 rounded text-sm"
                                    value={createForm.adminPassword}
                                    onChange={e => setCreateForm(p => ({ ...p, adminPassword: e.target.value }))}
                                    placeholder="••••••••" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <Button variant="ghost" onClick={() => { setShowCreate(false); setCreateError(''); }}>Cancel</Button>
                            <Button onClick={handleCreate} disabled={creating}>{creating ? 'Creating...' : 'Create Tenant'}</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Tenant Modal */}
            {editTarget && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                        <h2 className="text-lg font-bold mb-4">Edit Tenant</h2>
                        {editError && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded">{editError}</div>}
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                                <input type="text" className="w-full border border-gray-300 p-2 rounded text-sm"
                                    value={editForm.name}
                                    onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                                    autoFocus />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Slug * <span className="text-gray-400 font-normal">(URL identifier)</span></label>
                                <input type="text" className="w-full border border-gray-300 p-2 rounded text-sm"
                                    value={editForm.slug}
                                    onChange={e => setEditForm(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                                <select className="w-full border border-gray-300 p-2 rounded text-sm"
                                    value={editForm.plan}
                                    onChange={e => setEditForm(p => ({ ...p, plan: e.target.value }))}>
                                    <option value="FREE">FREE</option>
                                    <option value="STARTER">STARTER</option>
                                    <option value="PROFESSIONAL">PROFESSIONAL</option>
                                    <option value="ENTERPRISE">ENTERPRISE</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <Button variant="ghost" onClick={() => { setEditTarget(null); setEditError(''); }}>Cancel</Button>
                            <Button onClick={handleEdit} disabled={editing}>{editing ? 'Saving...' : 'Save Changes'}</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Invite User Modal */}
            {inviteTarget && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                        <h2 className="text-lg font-bold mb-1">Invite User</h2>
                        <p className="text-sm text-gray-500 mb-4">Add a user to <span className="font-medium text-gray-700">{inviteTarget.name}</span></p>
                        {inviteError && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded">{inviteError}</div>}
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                                <input type="text" className="w-full border border-gray-300 p-2 rounded text-sm"
                                    value={inviteForm.name}
                                    onChange={e => setInviteForm(p => ({ ...p, name: e.target.value }))}
                                    placeholder="Jane Smith" autoFocus />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                <input type="email" className="w-full border border-gray-300 p-2 rounded text-sm"
                                    value={inviteForm.email}
                                    onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))}
                                    placeholder="jane@acme-corp.com" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                                <input type="password" className="w-full border border-gray-300 p-2 rounded text-sm"
                                    value={inviteForm.password}
                                    onChange={e => setInviteForm(p => ({ ...p, password: e.target.value }))}
                                    placeholder="••••••••" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <Button variant="ghost" onClick={() => { setInviteTarget(null); setInviteError(''); }}>Cancel</Button>
                            <Button onClick={handleInvite} disabled={inviting}>{inviting ? 'Inviting...' : 'Send Invite'}</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
