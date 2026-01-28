
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DeleteConfirmationModal } from '@/components/DeleteConfirmationModal';
import { deleteLocation } from '@/lib/api';
import { toast } from 'sonner';
import { Edit2, Trash2 } from 'lucide-react';

interface LocationNode {
    id: string;
    name: string;
    type: string;
    structuralType?: string;
    children?: LocationNode[];
}

interface LocationTreeProps {
    locations: LocationNode[];
}

export default function LocationTree({ locations }: LocationTreeProps) {
    const router = useRouter();
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [nodeToDelete, setNodeToDelete] = useState<LocationNode | null>(null);

    const handleDeleteClick = (node: LocationNode) => {
        setNodeToDelete(node);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!nodeToDelete) return;
        try {
            await deleteLocation(nodeToDelete.id);
            toast.success('Location deleted');
            router.refresh(); // Refresh to update tree
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete location');
        } finally {
            setNodeToDelete(null);
        }
    };

    const renderNode = (node: LocationNode, level: number) => {
        const [expanded, setExpanded] = useState(false);
        const hasChildren = node.children && node.children.length > 0;
        const paddingLeft = level * 20;

        return (
            <div key={node.id} className="select-none">
                <div
                    className={`flex items-center py-2 px-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100
                        ${level === 0 ? 'bg-gray-100 font-semibold' : ''}`}
                    style={{ paddingLeft: `${paddingLeft + 16}px` }}
                    onClick={() => {
                        if (hasChildren) setExpanded(!expanded);
                        else router.push(`/inventory/locations/${node.id}`);
                    }}
                >
                    <div className="mr-2 w-4 text-gray-500">
                        {hasChildren && (
                            <span>{expanded ? '▼' : '▶'}</span>
                        )}
                    </div>
                    <div className="flex-1 flex items-center">
                        <span className={`mr-2 px-2 py-0.5 rounded text-xs 
                            ${node.structuralType === 'WAREHOUSE' ? 'bg-blue-100 text-blue-800' :
                                node.structuralType === 'ROOM' ? 'bg-green-100 text-green-800' :
                                    node.structuralType === 'ROW' ? 'bg-yellow-100 text-yellow-800' :
                                        node.structuralType === 'SHELF' ? 'bg-purple-100 text-purple-800' :
                                            'bg-gray-200 text-gray-800'}`}>
                            {node.structuralType || node.type}
                        </span>
                        <span>{node.name}</span>
                    </div>
                    <div className="text-sm text-gray-400 flex gap-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/inventory/locations/${node.id}`);
                            }}
                            className="hover:text-blue-600 p-1"
                            title="Edit"
                        >
                            <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(node);
                            }}
                            className="hover:text-destructive text-gray-400 hover:text-red-600 p-1"
                            title="Delete"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                </div>
                {expanded && hasChildren && (
                    <div>
                        {node.children!.map(child => renderNode(child, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
            {locations.map(loc => renderNode(loc, 0))}

            <DeleteConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                resourceName={nodeToDelete?.name || ''}
                resourceType="Location"
                dependencyCheckUrl={nodeToDelete ? `/inventory/locations/${nodeToDelete.id}/dependencies` : undefined}
            />
        </div>
    );
}
