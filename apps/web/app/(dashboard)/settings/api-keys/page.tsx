'use client';

import { useState, useEffect } from 'react';
import { Plus, Copy, Trash2, AlertTriangle, Check, Key, Lock } from 'lucide-react';

interface ApiKey {
    id: string;
    name: string;
    description?: string;
    scopes: string[];
    lastUsedAt?: string;
    expiresAt?: string;
    isActive: boolean;
    createdAt: string;
}

const AVAILABLE_SCOPES = [
    { value: 'INVENTORY:READ',        label: 'Inventory — Read' },
    { value: 'INVENTORY:CREATE',      label: 'Inventory — Create' },
    { value: 'INVENTORY:UPDATE',      label: 'Inventory — Update' },
    { value: 'INVENTORY:DELETE',      label: 'Inventory — Delete' },
    { value: 'ORDERS:READ',           label: 'Orders — Read' },
    { value: 'ORDERS:CREATE',         label: 'Orders — Create' },
    { value: 'PURCHASE_ORDERS:READ',  label: 'Purchase Orders — Read' },
    { value: 'PURCHASE_ORDERS:CREATE', label: 'Purchase Orders — Create' },
    { value: 'PUTAWAY:READ',          label: 'Putaway — Read' },
    { value: 'PUTAWAY:UPDATE',        label: 'Putaway — Update' },
];

export default function ApiKeysPage() {
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [flagEnabled, setFlagEnabled] = useState<boolean | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newKey, setNewKey] = useState({ name: '', description: '', scopes: [] as string[] });
    const [generatedKey, setGeneratedKey] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        checkFlagThenLoad();
    }, []);

    const checkFlagThenLoad = async () => {
        try {
            const flagRes = await fetch('/api/feature-flags');
            if (flagRes.ok) {
                const flags: Array<{ key: string; enabled: boolean }> = await flagRes.json();
                const apiAccess = flags.find(f => f.key === 'API_ACCESS');
                setFlagEnabled(apiAccess?.enabled ?? false);
            } else {
                setFlagEnabled(false);
            }
        } catch {
            setFlagEnabled(false);
        }

        await loadApiKeys();
    };

    const loadApiKeys = async () => {
        try {
            const response = await fetch('/api/api-keys');
            if (!response.ok) throw new Error(`API error: ${response.status}`);
            const data = await response.json();
            setKeys(Array.isArray(data) ? data : []);
        } catch {
            setKeys([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateKey = async () => {
        try {
            const response = await fetch('/api/api-keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newKey),
            });
            if (!response.ok) {
                const err = await response.json();
                alert(err.message || 'Failed to create API key');
                return;
            }
            const data = await response.json();
            setGeneratedKey(data.key);
            setNewKey({ name: '', description: '', scopes: [] });
            await loadApiKeys();
        } catch {
            alert('Failed to create API key');
        }
    };

    const handleRevokeKey = async (keyId: string) => {
        if (!confirm('Are you sure you want to revoke this API key?')) return;
        try {
            await fetch(`/api/api-keys/${keyId}/revoke`, { method: 'DELETE' });
            await loadApiKeys();
        } catch {
            alert('Failed to revoke API key');
        }
    };

    const copyToClipboard = async () => {
        if (generatedKey) {
            await navigator.clipboard.writeText(generatedKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const toggleScope = (scope: string) => {
        setNewKey(prev => ({
            ...prev,
            scopes: prev.scopes.includes(scope)
                ? prev.scopes.filter(s => s !== scope)
                : [...prev.scopes, scope],
        }));
    };

    return (
        <div className="p-6">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
                    <p className="text-gray-600 mt-1">Manage API keys for external integrations and MCP servers</p>
                </div>
                {flagEnabled && (
                    <button
                        onClick={() => { setShowCreateModal(true); setGeneratedKey(null); }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
                    >
                        <Plus className="h-5 w-5" />
                        Generate New Key
                    </button>
                )}
            </div>

            {/* Feature flag disabled banner */}
            {flagEnabled === false && (
                <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <Lock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-amber-900">API Access not enabled</p>
                        <p className="text-sm text-amber-700 mt-1">
                            API key generation is disabled for your account. Contact your platform administrator to enable the <strong>API Access</strong> feature.
                        </p>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="text-center py-12">Loading...</div>
            ) : keys.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                        {flagEnabled ? 'No API keys yet. Create one to get started.' : 'No API keys found.'}
                    </p>
                </div>
            ) : (
                <div className="bg-white shadow rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scopes</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Used</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {keys.map(key => (
                                <tr key={key.id}>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{key.name}</div>
                                        {key.description && <div className="text-sm text-gray-500">{key.description}</div>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {key.scopes.slice(0, 3).map(scope => (
                                                <span key={scope} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                                    {scope}
                                                </span>
                                            ))}
                                            {key.scopes.length > 3 && (
                                                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                                    +{key.scopes.length - 3} more
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${key.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {key.isActive ? 'Active' : 'Revoked'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {key.isActive && (
                                            <button
                                                onClick={() => handleRevokeKey(key.id)}
                                                className="text-red-600 hover:text-red-800 flex items-center gap-1 ml-auto"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                Revoke
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        {generatedKey ? (
                            <>
                                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                    <Check className="h-6 w-6 text-green-600" />
                                    API Key Created
                                </h2>
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                        <p className="text-sm text-yellow-800">
                                            <strong>Important:</strong> Copy this key now — you will not be able to see it again.
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Your API Key</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={generatedKey}
                                            readOnly
                                            className="flex-1 px-3 py-2 border rounded-md font-mono text-sm"
                                        />
                                        <button
                                            onClick={copyToClipboard}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                                        >
                                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                            {copied ? 'Copied!' : 'Copy'}
                                        </button>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="w-full py-2 bg-gray-200 hover:bg-gray-300 rounded-md"
                                >
                                    Close
                                </button>
                            </>
                        ) : (
                            <>
                                <h2 className="text-xl font-bold mb-4">Create New API Key</h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                                        <input
                                            type="text"
                                            value={newKey.name}
                                            onChange={e => setNewKey({ ...newKey, name: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-md"
                                            placeholder="e.g., MCP Server — Production"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                        <textarea
                                            value={newKey.description}
                                            onChange={e => setNewKey({ ...newKey, description: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-md"
                                            rows={2}
                                            placeholder="Optional description"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Scopes *</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {AVAILABLE_SCOPES.map(scope => (
                                                <label key={scope.value} className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={newKey.scopes.includes(scope.value)}
                                                        onChange={() => toggleScope(scope.value)}
                                                        className="rounded"
                                                    />
                                                    <span className="text-sm">{scope.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6 flex gap-3">
                                    <button
                                        onClick={() => setShowCreateModal(false)}
                                        className="flex-1 py-2 bg-gray-200 hover:bg-gray-300 rounded-md"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCreateKey}
                                        disabled={!newKey.name || newKey.scopes.length === 0}
                                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:bg-gray-400"
                                    >
                                        Generate Key
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
