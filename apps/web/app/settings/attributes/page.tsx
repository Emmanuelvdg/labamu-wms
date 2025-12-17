
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
        const error = new Error('An error occurred while fetching the data.');
        // Attach extra info to the error object.
        (error as any).info = await res.json();
        (error as any).status = res.status;
        throw error;
    }
    return res.json();
};

export default function AttributesSettingsPage() {
    const { data, mutate, error } = useSWR('http://localhost:3001/settings/attributes', fetcher);
    const attributes = Array.isArray(data) ? data : [];
    const [newAttr, setNewAttr] = useState({ name: '', type: 'TEXT', options: '' });

    const handleCreate = async () => {
        try {
            const res = await fetch('http://localhost:3001/settings/attributes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newAttr),
            });
            if (!res.ok) throw new Error('Failed to create attribute');
            toast.success('Attribute created');
            setNewAttr({ name: '', type: 'TEXT', options: '' });
            mutate();
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure?')) return;
        try {
            await fetch(`http://localhost:3001/settings/attributes/${id}`, { method: 'DELETE' });
            toast.success('Attribute deleted');
            mutate();
        } catch (e) {
            toast.error('Failed to delete');
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Location Attributes</h1>

            <div className="bg-white p-6 rounded-lg shadow mb-8">
                <h2 className="text-xl font-semibold mb-4">Add New Attribute</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <Label>Name</Label>
                        <Input
                            value={newAttr.name}
                            onChange={(e) => setNewAttr({ ...newAttr, name: e.target.value })}
                            placeholder="e.g. Temperature"
                        />
                    </div>
                    <div>
                        <Label>Type</Label>
                        <Select
                            value={newAttr.type}
                            onValueChange={(val) => setNewAttr({ ...newAttr, type: val })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="TEXT">Text</SelectItem>
                                <SelectItem value="NUMBER">Number</SelectItem>
                                <SelectItem value="BOOLEAN">Yes/No</SelectItem>
                                <SelectItem value="SELECT">Dropdown</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {newAttr.type === 'SELECT' && (
                        <div>
                            <Label>Options (comma separated)</Label>
                            <Input
                                value={newAttr.options}
                                onChange={(e) => setNewAttr({ ...newAttr, options: e.target.value })}
                                placeholder="Option 1, Option 2"
                            />
                        </div>
                    )}
                    <Button onClick={handleCreate}>Add Attribute</Button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Options</TableHead>
                            <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {attributes?.map((attr: any) => (
                            <TableRow key={attr.id}>
                                <TableCell className="font-medium">{attr.name}</TableCell>
                                <TableCell>{attr.type}</TableCell>
                                <TableCell>{attr.options || '-'}</TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(attr.id)}>
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {attributes?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                    No custom attributes defined.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
