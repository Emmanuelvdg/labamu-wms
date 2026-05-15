'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchWarehouses, fetchStrategies, createStrategy, toggleStrategy, updateWarehouse } from '@/lib/api';
import {
    Settings as SettingsIcon,
    Truck,
    Layers,
    Box,
    CheckCircle2,
    Save,
    ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function WarehouseDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const warehouseId = params.id as string;

    const [warehouse, setWarehouse] = useState<any>(null);
    const [pickingStrategy, setPickingStrategy] = useState('standard');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingInfo, setSavingInfo] = useState(false);

    // Configuration states
    const [batchCriteria, setBatchCriteria] = useState<string[]>(['location']);
    const [clusterSize, setClusterSize] = useState(4);
    const [waveCriteria, setWaveCriteria] = useState('product');

    // Warehouse information states
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [country, setCountry] = useState('');
    const [phone, setPhone] = useState('');
    const [incomingSteps, setIncomingSteps] = useState('1_step');
    const [outgoingSteps, setOutgoingSteps] = useState('1_step');
    const [autoReplenishmentEnabled, setAutoReplenishmentEnabled] = useState(false);
    const [requireWeightVerification, setRequireWeightVerification] = useState(false);
    const [savingAdvanced, setSavingAdvanced] = useState(false);

    useEffect(() => {
        loadData();
    }, [warehouseId]);

    async function loadData() {
        try {
            // 1. Fetch Warehouse Details (using list for now as we don't have getWarehouse endpoint yet, or we can filter)
            const warehouses = await fetchWarehouses();
            const wh = warehouses.find((w: any) => w.id === warehouseId);
            setWarehouse(wh);

            // Populate address fields
            if (wh) {
                setAddress(wh.address || '');
                setCity(wh.city || '');
                setState(wh.state || '');
                setPostalCode(wh.postalCode || '');
                setCountry(wh.country || '');
                setPhone(wh.phone || '');
                setIncomingSteps(wh.incomingSteps || '1_step');
                setOutgoingSteps(wh.outgoingSteps || '1_step');
                setAutoReplenishmentEnabled(wh.autoReplenishmentEnabled ?? false);
                setRequireWeightVerification(wh.requireWeightVerification ?? false);
            }

            // 2. Fetch Strategies
            const strategies = await fetchStrategies('picking', warehouseId);
            const active = strategies.find((s: any) => s.active);

            if (active) {
                setPickingStrategy(active.name.toLowerCase());
                // Parse rules if needed
                try {
                    const rules = JSON.parse(active.rules);
                    if (active.name === 'Batch') setBatchCriteria(rules.criteria || ['location']);
                    if (active.name === 'Cluster') setClusterSize(rules.size || 4);
                    if (active.name === 'Wave') setWaveCriteria(rules.criteria || 'product');
                } catch (e) {
                    // ignore
                }
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to load warehouse details');
        } finally {
            setLoading(false);
        }
    }

    const handleSaveAdvanced = async () => {
        setSavingAdvanced(true);
        try {
            await updateWarehouse(warehouseId, { autoReplenishmentEnabled, requireWeightVerification });
            toast.success('Advanced settings saved');
        } catch (err) {
            console.error(err);
            toast.error('Failed to save advanced settings');
        } finally {
            setSavingAdvanced(false);
        }
    };

    const handleSaveInfo = async () => {
        setSavingInfo(true);
        try {
            await updateWarehouse(warehouseId, {
                address,
                city,
                state,
                postalCode,
                country,
                phone,
                incomingSteps,
                outgoingSteps,
            });

            toast.success('Warehouse information updated');
        } catch (err) {
            console.error(err);
            toast.error('Failed to save warehouse information');
        } finally {
            setSavingInfo(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Create new strategy (which will be active)
            // In a real app we might update existing, but create is simpler for now as per service logic
            let rules = {};
            if (pickingStrategy === 'batch') rules = { criteria: batchCriteria };
            if (pickingStrategy === 'cluster') rules = { size: clusterSize };
            if (pickingStrategy === 'wave') rules = { criteria: waveCriteria };

            // First, we might want to deactivate others or just create new one which becomes active
            // The service logic for createPickingStrategy doesn't auto-deactivate others yet, 
            // but let's assume we want to enforce single active strategy.
            // For now, just create.

            await createStrategy('picking', {
                name: pickingStrategy.charAt(0).toUpperCase() + pickingStrategy.slice(1),
                rules: JSON.stringify(rules),
                warehouseId
            });

            toast.success('Picking strategy updated');
        } catch (err) {
            console.error(err);
            toast.error('Failed to save strategy');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;
    if (!warehouse) return <div className="p-8">Warehouse not found</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <header className="mb-8 flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        {warehouse.name}
                    </h1>
                    <p className="text-gray-600 mt-1">Warehouse Configuration</p>
                </div>
            </header>

            {/* Warehouse Information Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-5xl mx-auto mb-6">
                <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <SettingsIcon className="h-5 w-5" />
                        Warehouse Information
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                        Update warehouse address and contact details.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Street Address
                        </label>
                        <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                            placeholder="123 Main Street"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            City
                        </label>
                        <input
                            type="text"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                            placeholder="Jakarta"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            State/Province
                        </label>
                        <input
                            type="text"
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                            placeholder="DKI Jakarta"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Postal Code
                        </label>
                        <input
                            type="text"
                            value={postalCode}
                            onChange={(e) => setPostalCode(e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                            placeholder="12190"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Country
                        </label>
                        <input
                            type="text"
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                            placeholder="Indonesia"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phone Number <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                            placeholder="+6281234567890"
                        />
                        <p className="text-xs text-gray-500 mt-1">Required for Lalamove deliveries. Include country code (e.g., +62 for Indonesia)</p>
                    </div>
                </div>

                <div className="flex items-center justify-end">
                    <Button
                        onClick={handleSaveInfo}
                        disabled={savingInfo}
                        className="flex items-center gap-2"
                    >
                        <Save className="h-4 w-4" />
                        {savingInfo ? 'Saving...' : 'Save Information'}
                    </Button>
                </div>
            </div>

            {/* Operations Configuration Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-5xl mx-auto mb-6">
                <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <Truck className="h-5 w-5" />
                        Operations Configuration
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                        Configure the number of steps for inbound and outbound operations.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Inbound Steps (Receiving)
                        </label>
                        <select
                            value={incomingSteps}
                            onChange={(e) => setIncomingSteps(e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                        >
                            <option value="1_step">1 Step – Direct Receipt (Receive → Stock)</option>
                            <option value="2_steps">2 Steps – Input + Stock (Receive → Input → Stock)</option>
                            <option value="3_steps">3 Steps – Input + QC + Stock (Receive → Input → QC → Stock)</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">How goods are processed from receiving dock to storage</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Outbound Steps (Shipping)
                        </label>
                        <select
                            value={outgoingSteps}
                            onChange={(e) => setOutgoingSteps(e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                        >
                            <option value="1_step">1 Step – Direct Ship (Stock → Ship)</option>
                            <option value="2_steps">2 Steps – Pick + Ship (Stock → Output → Ship)</option>
                            <option value="3_steps">3 Steps – Pick + Pack + Ship (Stock → Pick → Pack → Ship)</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">How goods are processed from storage to shipping dock</p>
                    </div>
                </div>

                <div className="flex items-center justify-end">
                    <Button
                        onClick={handleSaveInfo}
                        disabled={savingInfo}
                        className="flex items-center gap-2"
                    >
                        <Save className="h-4 w-4" />
                        {savingInfo ? 'Saving...' : 'Save Operations Config'}
                    </Button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-5xl mx-auto">
                <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <SettingsIcon className="h-5 w-5" />
                        Picking Strategy
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                        Select how orders should be grouped and processed in this warehouse.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <StrategyCard
                        id="standard"
                        title="Standard"
                        description="Pick orders one by one. Best for low volume or bulky items."
                        icon={<CheckCircle2 className="h-6 w-6" />}
                        selected={pickingStrategy === 'standard'}
                        onSelect={setPickingStrategy}
                    />
                    <StrategyCard
                        id="batch"
                        title="Batch Picking"
                        description="Group multiple orders to pick them together in one go."
                        icon={<Layers className="h-6 w-6" />}
                        selected={pickingStrategy === 'batch'}
                        onSelect={setPickingStrategy}
                    />
                    <StrategyCard
                        id="cluster"
                        title="Cluster Picking"
                        description="Pick items for multiple orders into specific totes/boxes."
                        icon={<Box className="h-6 w-6" />}
                        selected={pickingStrategy === 'cluster'}
                        onSelect={setPickingStrategy}
                    />
                    <StrategyCard
                        id="wave"
                        title="Wave Picking"
                        description="Pick all items of the same type for many orders at once."
                        icon={<Truck className="h-6 w-6" />}
                        selected={pickingStrategy === 'wave'}
                        onSelect={setPickingStrategy}
                    />
                </div>

                {/* Configuration Details */}
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    {pickingStrategy === 'standard' && (
                        <div>
                            <h3 className="font-medium text-gray-900 mb-2">Standard Configuration</h3>
                            <p className="text-sm text-gray-600">No additional configuration required. Orders will be assigned individually.</p>
                        </div>
                    )}

                    {pickingStrategy === 'batch' && (
                        <div>
                            <h3 className="font-medium text-gray-900 mb-4">Batch Configuration</h3>
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-gray-700">Group Batches By:</label>
                                <div className="flex gap-4">
                                    {['contact', 'carrier', 'location'].map((criteria) => (
                                        <label key={criteria} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={batchCriteria.includes(criteria)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setBatchCriteria([...batchCriteria, criteria]);
                                                    } else {
                                                        setBatchCriteria(batchCriteria.filter(c => c !== criteria));
                                                    }
                                                }}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="capitalize text-sm text-gray-700">{criteria}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {pickingStrategy === 'cluster' && (
                        <div>
                            <h3 className="font-medium text-gray-900 mb-4">Cluster Configuration</h3>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Max Orders per Cluster</label>
                                <input
                                    type="number"
                                    value={clusterSize}
                                    onChange={(e) => setClusterSize(parseInt(e.target.value))}
                                    min={1}
                                    max={20}
                                    className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                                />
                                <p className="text-xs text-gray-500 mt-1">Number of totes/boxes a picker can handle at once.</p>
                            </div>
                        </div>
                    )}

                    {pickingStrategy === 'wave' && (
                        <div>
                            <h3 className="font-medium text-gray-900 mb-4">Wave Configuration</h3>
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-gray-700">Group Waves By:</label>
                                <div className="flex gap-4">
                                    {['product', 'category'].map((criteria) => (
                                        <label key={criteria} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="waveCriteria"
                                                checked={waveCriteria === criteria}
                                                onChange={() => setWaveCriteria(criteria)}
                                                className="border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="capitalize text-sm text-gray-700">{criteria}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-6 flex items-center justify-end gap-4">
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2"
                    >
                        <Save className="h-4 w-4" />
                        {saving ? 'Saving...' : 'Save Configuration'}
                    </Button>
                </div>
            </div>

            {/* Advanced Settings */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-5xl mx-auto mt-6">
                <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <SettingsIcon className="h-5 w-5" />
                        Advanced Settings
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                        Automation and verification controls for this warehouse.
                    </p>
                </div>

                <div className="space-y-6">
                    <div className="flex items-start justify-between gap-6 py-4 border-b border-gray-100">
                        <div>
                            <p className="font-medium text-gray-900">Automatic Replenishment</p>
                            <p className="text-sm text-gray-500 mt-0.5">
                                When enabled, a daily scheduled job (06:00) checks stock levels and auto-creates
                                draft purchase orders for any products that fall below their reorder point.
                                Products must have a preferred supplier configured.
                            </p>
                        </div>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={autoReplenishmentEnabled}
                            onClick={() => setAutoReplenishmentEnabled(v => !v)}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${autoReplenishmentEnabled ? 'bg-blue-600' : 'bg-gray-200'}`}
                        >
                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${autoReplenishmentEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    <div className="flex items-start justify-between gap-6 py-4">
                        <div>
                            <p className="font-medium text-gray-900">Weight Verification at Packing</p>
                            <p className="text-sm text-gray-500 mt-0.5">
                                When enabled, the packing station compares the entered parcel weight against
                                the expected weight calculated from product master data. Packers must confirm
                                or explain any variance exceeding 5% before completing the session.
                            </p>
                        </div>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={requireWeightVerification}
                            onClick={() => setRequireWeightVerification(v => !v)}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${requireWeightVerification ? 'bg-blue-600' : 'bg-gray-200'}`}
                        >
                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${requireWeightVerification ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>
                </div>

                <div className="mt-6 flex items-center justify-end">
                    <Button onClick={handleSaveAdvanced} disabled={savingAdvanced} className="flex items-center gap-2">
                        <Save className="h-4 w-4" />
                        {savingAdvanced ? 'Saving...' : 'Save Advanced Settings'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function StrategyCard({ id, title, description, icon, selected, onSelect }: any) {
    return (
        <div
            onClick={() => onSelect(id)}
            className={`cursor-pointer rounded-lg border p-4 transition-all ${selected
                ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                }`}
        >
            <div className={`mb-3 ${selected ? 'text-blue-600' : 'text-gray-500'}`}>
                {icon}
            </div>
            <h3 className={`font-medium mb-1 ${selected ? 'text-blue-900' : 'text-gray-900'}`}>{title}</h3>
            <p className={`text-xs ${selected ? 'text-blue-700' : 'text-gray-500'}`}>{description}</p>
        </div>
    );
}
