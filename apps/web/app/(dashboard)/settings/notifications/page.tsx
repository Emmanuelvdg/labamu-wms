'use client';

import { useState, useEffect } from 'react';
import { Bell, Mail, Users, Save, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { fetchNotificationConfigs, updateNotificationConfig } from '@/lib/api';
import { toast } from 'sonner';

const NOTIFICATION_LABELS: Record<string, { label: string; description: string; category: string }> = {
    LOW_STOCK:                  { label: 'Low Stock',                  description: 'Stock falls below the reorder point for a product.',          category: 'Inventory' },
    CRITICAL_STOCK:             { label: 'Critical Stock',             description: 'Stock falls below the safety stock threshold.',                category: 'Inventory' },
    EXPIRY_WARNING:             { label: 'Expiry Warning',             description: 'A batch is approaching its expiry date.',                      category: 'Inventory' },
    EXPIRED_STOCK:              { label: 'Expired Stock',              description: 'A batch has expired and still has remaining stock.',           category: 'Inventory' },
    PO_APPROVAL_REQUIRED:       { label: 'PO Approval Required',       description: 'A purchase order has been submitted and needs approval.',      category: 'Procurement' },
    ORDER_SHIPPED:              { label: 'Order Shipped',              description: 'An order has been dispatched to the carrier.',                 category: 'Orders' },
    WORKFLOW_TASK_SLA_BREACH:   { label: 'Workflow SLA Breach',        description: 'A workflow task has exceeded its SLA deadline.',              category: 'Workflows' },
    SUPPLIER_INVOICE_UPLOADED:  { label: 'Supplier Invoice Uploaded',  description: 'A supplier has uploaded an invoice via the supplier portal.',  category: 'Procurement' },
};

interface NotificationConfig {
    notificationType: string;
    emailEnabled: boolean;
    recipients: string[] | null;
}

interface RowState {
    emailEnabled: boolean;
    recipientsText: string; // comma-separated in the input
    saving: boolean;
    dirty: boolean;
}

export default function NotificationSettingsPage() {
    const { user } = useAuth();
    const [configs, setConfigs] = useState<Record<string, RowState>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.companyId) return;
        fetchNotificationConfigs(user.companyId)
            .then((data: NotificationConfig[]) => {
                const state: Record<string, RowState> = {};
                for (const c of data) {
                    state[c.notificationType] = {
                        emailEnabled: c.emailEnabled,
                        recipientsText: c.recipients?.join(', ') ?? '',
                        saving: false,
                        dirty: false,
                    };
                }
                setConfigs(state);
            })
            .catch(() => toast.error('Failed to load notification settings'))
            .finally(() => setLoading(false));
    }, [user?.companyId]);

    const update = (type: string, patch: Partial<RowState>) => {
        setConfigs((prev) => ({
            ...prev,
            [type]: { ...prev[type], ...patch, dirty: true },
        }));
    };

    const save = async (type: string) => {
        if (!user?.companyId) return;
        const row = configs[type];
        const recipients = row.recipientsText.trim()
            ? row.recipientsText.split(',').map((e) => e.trim()).filter(Boolean)
            : null;

        setConfigs((prev) => ({ ...prev, [type]: { ...prev[type], saving: true } }));
        try {
            await updateNotificationConfig(user.companyId!, type, {
                emailEnabled: row.emailEnabled,
                recipients,
            });
            setConfigs((prev) => ({ ...prev, [type]: { ...prev[type], saving: false, dirty: false } }));
            toast.success(`${NOTIFICATION_LABELS[type]?.label ?? type} settings saved`);
        } catch {
            setConfigs((prev) => ({ ...prev, [type]: { ...prev[type], saving: false } }));
            toast.error('Failed to save — please try again');
        }
    };

    const categories = Array.from(new Set(Object.values(NOTIFICATION_LABELS).map((v) => v.category)));

    if (!user?.companyId) {
        return (
            <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
                <p className="text-gray-500">You must be associated with a company to manage notification settings.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <Bell className="h-8 w-8 text-gray-700" />
                    Notification Settings
                </h1>
                <p className="text-gray-600 mt-1">
                    Control which events send email notifications and who receives them.
                </p>
            </header>

            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                <Mail className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">How email notifications work</p>
                    <p>
                        When an event fires, an in-app notification is always created. If email is enabled for that type,
                        the system also sends an email. Leave <strong>Recipients</strong> blank to send to all users in
                        your organisation, or enter specific addresses separated by commas.
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
            ) : (
                <div className="space-y-8">
                    {categories.map((category) => {
                        const types = Object.entries(NOTIFICATION_LABELS)
                            .filter(([, v]) => v.category === category)
                            .map(([type]) => type);

                        return (
                            <section key={category}>
                                <h2 className="text-lg font-semibold text-gray-700 mb-3">{category}</h2>
                                <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
                                    {types.map((type) => {
                                        const meta = NOTIFICATION_LABELS[type];
                                        const row = configs[type];
                                        if (!row) return null;

                                        return (
                                            <div key={type} className="p-5">
                                                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                                                    {/* Left: label + description */}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-gray-900">{meta.label}</p>
                                                        <p className="text-sm text-gray-500 mt-0.5">{meta.description}</p>
                                                    </div>

                                                    {/* Right: controls */}
                                                    <div className="flex flex-col gap-3 sm:w-96">
                                                        {/* Email enabled toggle */}
                                                        <label className="flex items-center gap-3 cursor-pointer">
                                                            <button
                                                                type="button"
                                                                role="switch"
                                                                aria-checked={row.emailEnabled}
                                                                onClick={() => update(type, { emailEnabled: !row.emailEnabled })}
                                                                className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                                                    row.emailEnabled ? 'bg-blue-600' : 'bg-gray-200'
                                                                }`}
                                                            >
                                                                <span
                                                                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                                                                        row.emailEnabled ? 'translate-x-5' : 'translate-x-0'
                                                                    }`}
                                                                />
                                                            </button>
                                                            <span className="text-sm text-gray-700">
                                                                {row.emailEnabled ? 'Email enabled' : 'Email disabled'}
                                                            </span>
                                                        </label>

                                                        {/* Recipients */}
                                                        {row.emailEnabled && (
                                                            <div>
                                                                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1">
                                                                    <Users className="h-3.5 w-3.5" />
                                                                    Recipients (comma-separated)
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={row.recipientsText}
                                                                    onChange={(e) => update(type, { recipientsText: e.target.value })}
                                                                    placeholder="Leave blank to notify all organisation users"
                                                                    className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                />
                                                            </div>
                                                        )}

                                                        {/* Save button */}
                                                        {row.dirty && (
                                                            <button
                                                                onClick={() => save(type)}
                                                                disabled={row.saving}
                                                                className="self-end flex items-center gap-2 rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
                                                            >
                                                                {row.saving ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <Save className="h-4 w-4" />
                                                                )}
                                                                Save
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
