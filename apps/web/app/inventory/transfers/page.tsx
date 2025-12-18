
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetchTransfers } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function TransfersPage() {
    const { data: transfers } = useSWR('transfers', fetchTransfers);

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Stock Transfers</h1>
                <Link href="/inventory/transfers/new">
                    <Button><Plus className="mr-2 h-4 w-4" /> New Transfer</Button>
                </Link>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Source</TableHead>
                            <TableHead>Destination</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transfers?.map((transfer: any) => (
                            <TableRow key={transfer.id}>
                                <TableCell className="font-medium">{transfer.id.substring(0, 8)}...</TableCell>
                                <TableCell>{transfer.sourceWarehouse?.name || 'External'}</TableCell>
                                <TableCell>{transfer.destinationWarehouse?.name}</TableCell>
                                <TableCell>
                                    <Badge variant={
                                        transfer.status === 'RECEIVED' ? 'default' :
                                            transfer.status === 'PLANNED' ? 'secondary' :
                                                'outline'
                                    }>
                                        {transfer.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>{new Date(transfer.createdAt).toLocaleDateString()}</TableCell>
                                <TableCell>
                                    <Link href={`/inventory/transfers/${transfer.id}`}>
                                        <Button variant="ghost" size="sm">View</Button>
                                    </Link>
                                </TableCell>
                            </TableRow>
                        ))}
                        {transfers?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                    No transfers found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
