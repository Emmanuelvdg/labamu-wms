import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { API_URL } from '@/lib/api';

interface ImportLocationsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    warehouseId: string;
}

export function ImportLocationsModal({ isOpen, onClose, onSuccess, warehouseId }: ImportLocationsModalProps) {
    const [csvContent, setCsvContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<{ created: number; updated: number; errors: string[] } | null>(null);

    const handleImport = async () => {
        if (!csvContent.trim()) {
            toast.error("Please paste CSV content.");
            return;
        }

        setIsLoading(true);
        setResult(null);

        try {
            const res = await fetch(`${API_URL}/inventory/locations/import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ csv: csvContent, warehouseId })
            });

            if (res.ok) {
                const data = await res.json();
                setResult(data);
                toast.success(`Import complete: ${data.created} created, ${data.updated} updated.`);
                if (data.errors.length === 0) {
                    setTimeout(() => {
                        onSuccess();
                        onClose();
                    }, 1500);
                }
            } else {
                const err = await res.json();
                toast.error(`Import failed: ${err.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error(error);
            toast.error("Import failed due to network error.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Import Locations</DialogTitle>
                    <DialogDescription>
                        Paste your CSV content here. Required columns: Name, StructuralType.
                        <br />
                        Optional: Code, ParentCode, X, Y, Width, Height, Attributes.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <Textarea
                        placeholder="Name,StructuralType,Code,ParentCode,X,Y...&#10;Row1,ROW,R1,,10,10..."
                        value={csvContent}
                        onChange={(e) => setCsvContent(e.target.value)}
                        className="h-[200px] font-mono text-xs"
                    />

                    {result && (
                        <div className="bg-muted p-3 rounded text-sm">
                            <p className="font-medium text-green-600">Successfully Created: {result.created}</p>
                            <p className="font-medium text-blue-600">Successfully Updated: {result.updated}</p>
                            {result.errors.length > 0 && (
                                <div className="mt-2 text-red-600">
                                    <p className="font-bold">Errors ({result.errors.length}):</p>
                                    <ul className="list-disc pl-4 max-h-[100px] overflow-auto">
                                        {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
                    <Button onClick={handleImport} disabled={isLoading}>
                        {isLoading ? "Importing..." : "Import CSV"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
