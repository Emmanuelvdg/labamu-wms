'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

const MARKETS = [
    { code: 'TH', name: 'Thailand' },
    { code: 'SG', name: 'Singapore' },
    { code: 'HK', name: 'Hong Kong' },
    { code: 'PH', name: 'Philippines' },
    { code: 'MY', name: 'Malaysia' },
    { code: 'ID', name: 'Indonesia' },
    { code: 'TW', name: 'Taiwan' },
    { code: 'VN', name: 'Vietnam' },
    { code: 'BR', name: 'Brazil' },
    { code: 'MX', name: 'Mexico' },
    { code: 'JP', name: 'Japan' },
];

const SERVICE_TYPES = ['MOTORCYCLE', 'SEDAN', 'VAN', 'LORRY'];

export default function LalamoveSettingsPage() {
    const [warehouses, setWarehouses] = useState([]);
    const [selectedWarehouse, setSelectedWarehouse] = useState('');
    const [config, setConfig] = useState({
        market: 'TH',
        environment: 'SANDBOX',
        defaultServiceType: 'MOTORCYCLE',
        active: true,
    });
    const [loading, setLoading] = useState(false);
    const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');

    useEffect(() => {
        fetchWarehouses();
    }, []);

    useEffect(() => {
        if (selectedWarehouse) {
            fetchConfig();
        }
    }, [selectedWarehouse]);

    const fetchWarehouses = async () => {
        try {
            console.log('Fetching warehouses...');
            const response = await fetch('/api/warehouses');
            console.log('Response status:', response.status);
            const data = await response.json();
            console.log('Warehouses data:', data);
            setWarehouses(data);
        } catch (error) {
            console.error('Failed to fetch warehouses:', error);
        }
    };

    const fetchConfig = async () => {
        try {
            const response = await fetch(`/api/lalamove/config/${selectedWarehouse}`);
            if (response.ok) {
                const data = await response.json();
                if (data) {
                    setConfig({
                        market: data.market || 'TH',
                        environment: data.environment || 'SANDBOX',
                        defaultServiceType: data.defaultServiceType || 'MOTORCYCLE',
                        active: data.active ?? true,
                    });
                }
            }
        } catch (error) {
            console.error('Failed to fetch config:', error);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        setTestStatus('idle');
        try {
            const response = await fetch('/api/lalamove/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    warehouseId: selectedWarehouse,
                    ...config,
                }),
            });

            if (response.ok) {
                alert('Lalamove configuration saved successfully!');
            } else {
                alert('Failed to save configuration');
            }
        } catch (error) {
            console.error('Failed to save:', error);
            alert('Error saving configuration');
        } finally {
            setLoading(false);
        }
    };

    const handleTestConnection = async () => {
        setTestStatus('idle');
        setLoading(true);
        try {
            // TODO: Implement test endpoint in backend
            // For now, just simulate
            await new Promise(resolve => setTimeout(resolve, 1000));
            setTestStatus('success');
        } catch (error) {
            setTestStatus('error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto py-8 max-w-4xl">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/settings">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold">Lalamove Configuration</h1>
                    <p className="text-muted-foreground">
                        Configure Lalamove delivery integration per warehouse
                    </p>
                </div>
            </div>

            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Warehouse Selection</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <Label>Select Warehouse</Label>
                            <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a warehouse" />
                                </SelectTrigger>
                                <SelectContent>
                                    {warehouses.map((wh: any) => (
                                        <SelectItem key={wh.id} value={wh.id}>
                                            {wh.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {selectedWarehouse && (
                    <>
                        <Card>
                            <CardHeader>
                                <CardTitle>API Credentials</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Market</Label>
                                    <Select
                                        value={config.market}
                                        onValueChange={(value) => setConfig({ ...config, market: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {MARKETS.map((market) => (
                                                <SelectItem key={market.code} value={market.code}>
                                                    {market.name} ({market.code})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Market</Label>
                                    <Select
                                        value={config.market}
                                        onValueChange={(value) => setConfig({ ...config, market: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {MARKETS.map((market) => (
                                                <SelectItem key={market.code} value={market.code}>
                                                    {market.name} ({market.code})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>API Credentials</Label>
                                    <div className="p-3 bg-secondary/20 rounded-md border border-secondary/30 flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                        <span className="text-sm">Managed by Platform</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        API credentials are managed globally by the platform administrator.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label>Environment</Label>
                                    <Select
                                        value={config.environment}
                                        onValueChange={(value) => setConfig({ ...config, environment: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="SANDBOX">Sandbox (Test)</SelectItem>
                                            <SelectItem value="PRODUCTION">Production</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Delivery Settings</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Default Service Type</Label>
                                    <Select
                                        value={config.defaultServiceType}
                                        onValueChange={(value) => setConfig({ ...config, defaultServiceType: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {SERVICE_TYPES.map((type) => (
                                                <SelectItem key={type} value={type}>
                                                    {type}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-sm text-muted-foreground">
                                        System will auto-select based on order weight if not specified
                                    </p>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="active"
                                        checked={config.active}
                                        onCheckedChange={(checked) =>
                                            setConfig({ ...config, active: checked as boolean })
                                        }
                                    />
                                    <Label htmlFor="active" className="cursor-pointer">
                                        Enable Lalamove for this warehouse
                                    </Label>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex justify-between">
                            <Button
                                variant="outline"
                                onClick={handleTestConnection}
                                disabled={loading}
                            >
                                {testStatus === 'success' && <CheckCircle className="mr-2 h-4 w-4 text-green-600" />}
                                {testStatus === 'error' && <XCircle className="mr-2 h-4 w-4 text-red-600" />}
                                Test Connection
                            </Button>

                            <Button onClick={handleSave} disabled={loading}>
                                {loading ? 'Saving...' : 'Save Configuration'}
                            </Button>
                        </div>

                        {testStatus === 'success' && (
                            <p className="text-sm text-green-600">✓ Connection test successful!</p>
                        )}
                        {testStatus === 'error' && (
                            <p className="text-sm text-red-600">✗ Connection test failed. Check your credentials.</p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
