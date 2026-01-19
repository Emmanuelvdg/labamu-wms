'use client';

import { useState } from 'react';
import { generateReport } from '@/lib/api';

export default function ReportsPage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleGenerate = async (type: string) => {
        setLoading(true);
        try {
            const data = await generateReport(type, new Date().toISOString().slice(0, 7)); // Current month
            setResult(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Compliance Reports</h1>

            {result && (
                <div className="mb-8 bg-green-50 p-4 rounded-lg border border-green-200">
                    <h3 className="text-lg font-medium text-green-800">Report Generated Successfully</h3>
                    <pre className="mt-2 text-sm text-green-700 overflow-auto">
                        {JSON.stringify(result, null, 2)}
                    </pre>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">VAT Report (PPN)</h2>
                    <p className="text-gray-600 mb-4">Generate monthly VAT reports for Indonesian tax compliance.</p>
                    <button
                        onClick={() => handleGenerate('VAT')}
                        disabled={loading}
                        className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {loading ? 'Generating...' : 'Generate PDF'}
                    </button>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">SAF-T Export</h2>
                    <p className="text-gray-600 mb-4">Export Standard Audit File for Tax (SAF-T) JSON.</p>
                    <button
                        onClick={() => handleGenerate('SAF-T')}
                        disabled={loading}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                    >
                        {loading ? 'Exporting...' : 'Export JSON'}
                    </button>
                </div>
            </div>
        </div>
    );
}
