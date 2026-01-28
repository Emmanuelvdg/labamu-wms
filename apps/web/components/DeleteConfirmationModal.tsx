import { useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { API_URL } from '@/lib/api';

interface DeleteConfirmationModalProps {
    resourceName: string; // e.g., "Warehouse A"
    resourceType: string; // e.g., "Warehouse"
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    dependencyCheckUrl?: string; // e.g., "/warehouses/123/dependencies"
}

interface DependencyResult {
    hasDependencies: boolean;
    dependencies: string[];
    blocking: boolean;
}

export function DeleteConfirmationModal({
    resourceName,
    resourceType,
    isOpen,
    onClose,
    onConfirm,
    dependencyCheckUrl
}: DeleteConfirmationModalProps) {
    const [step, setStep] = useState<'CHECK' | 'CONFIRM' | 'DELETING'>('CHECK');
    const [dependencies, setDependencies] = useState<DependencyResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initial Check
    const startCheck = async () => {
        if (!isOpen) return;

        // If no check URL, go straight to confirm
        if (!dependencyCheckUrl) {
            setStep('CONFIRM');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}${dependencyCheckUrl}`);
            if (!res.ok) throw new Error('Failed to check dependencies');
            const data: DependencyResult = await res.json();

            setDependencies(data);
            setStep(data.blocking ? 'CONFIRM' : 'CONFIRM'); // Both go to confirm UI, but UI changes based on blocking
        } catch (err: any) {
            console.error(err);
            setError('Could not verify dependencies. Proceed with caution.');
            setStep('CONFIRM');
        } finally {
            setLoading(false);
        }
    };

    // Reset state on open
    if (isOpen && step === 'CHECK' && !loading && !dependencies && !error) {
        startCheck();
    }

    const handleConfirm = async () => {
        setStep('DELETING');
        try {
            await onConfirm();
            onClose();
        } catch (err) {
            console.error(err);
            setError('Failed to delete resource.');
            setStep('CONFIRM');
        }
    };

    const handleClose = () => {
        setStep('CHECK');
        setDependencies(null);
        setError(null);
        setLoading(false);
        onClose();
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={handleClose}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                        <Trash2 className="h-5 w-5" />
                        Delete {resourceType}?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to delete <strong>{resourceName}</strong>?
                    </AlertDialogDescription>
                </AlertDialogHeader>

                {loading && (
                    <div className="py-6 flex justify-center flex-col items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="text-sm">Checking dependencies...</span>
                    </div>
                )}

                {/* Dependency Warning */}
                {!loading && dependencies?.hasDependencies && (
                    <div className="bg-destructive/10 p-4 rounded-md border border-destructive/20 my-2">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                            <div className="space-y-2">
                                <h4 className="font-semibold text-destructive text-sm">
                                    {dependencies.blocking ? 'Deletion Blocked' : 'Warning: Linked Resources'}
                                </h4>
                                <ul className="list-disc pl-4 text-sm text-destructive/90 space-y-1">
                                    {dependencies.dependencies.map((dep, idx) => (
                                        <li key={idx}>{dep}</li>
                                    ))}
                                </ul>
                                {dependencies.blocking && (
                                    <p className="text-xs font-medium mt-2">
                                        You must remove these dependencies before deleting this {resourceType.toLowerCase()}.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm my-2">
                        {error}
                    </div>
                )}

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={step === 'DELETING'}>Cancel</AlertDialogCancel>

                    {(!dependencies?.blocking || !dependencyCheckUrl) && (
                        <Button
                            variant="destructive"
                            onClick={(e) => { e.preventDefault(); handleConfirm(); }}
                            disabled={step === 'DELETING' || loading}
                        >
                            {step === 'DELETING' ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                'Confirm Delete'
                            )}
                        </Button>
                    )}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
