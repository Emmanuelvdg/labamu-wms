
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
                    <div className="text-sm text-gray-400">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/inventory/locations/${node.id}`);
                            }}
                            className="hover:text-blue-600"
                        >
                            Edit
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
        </div>
    );
}
