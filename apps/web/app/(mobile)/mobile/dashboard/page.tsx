'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Package, Truck, ClipboardList, Scan } from 'lucide-react';

export default function MobileDashboard() {
    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">Hello, Worker</h2>
                <p className="text-sm text-gray-500">Ready for your next task?</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Link href="/mobile/picking" className="block">
                    <Card className="h-full hover:bg-indigo-50 transition-colors cursor-pointer border-l-4 border-l-indigo-500">
                        <CardContent className="flex flex-col items-center justify-center p-6 space-y-2">
                            <Package className="w-8 h-8 text-indigo-600" />
                            <span className="font-semibold text-gray-700">Picking</span>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/mobile/putaway" className="block">
                    <Card className="h-full hover:bg-emerald-50 transition-colors cursor-pointer border-l-4 border-l-emerald-500">
                        <CardContent className="flex flex-col items-center justify-center p-6 space-y-2">
                            <Truck className="w-8 h-8 text-emerald-600" />
                            <span className="font-semibold text-gray-700">Putaway</span>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/mobile/stocktaking" className="block">
                    <Card className="h-full hover:bg-amber-50 transition-colors cursor-pointer border-l-4 border-l-amber-500">
                        <CardContent className="flex flex-col items-center justify-center p-6 space-y-2">
                            <ClipboardList className="w-8 h-8 text-amber-600" />
                            <span className="font-semibold text-gray-700">Stocktake</span>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/mobile/scan" className="block">
                    <Card className="h-full hover:bg-slate-50 transition-colors cursor-pointer border-l-4 border-l-slate-500">
                        <CardContent className="flex flex-col items-center justify-center p-6 space-y-2">
                            <Scan className="w-8 h-8 text-slate-600" />
                            <span className="font-semibold text-gray-700">Scan</span>
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    );
}
