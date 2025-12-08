import { useState } from 'react';
import {
    ChevronRight,
    ChevronDown,
    Folder,
    MapPin,
    Factory,
    DoorOpen,
    AlignJustify,
    Columns,
    Layers,
    Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface LocationNode {
    id: string;
    name: string;
    type: string;
    structuralType?: string;
    children?: LocationNode[];
}

interface LocationTreeProps {
    locations: LocationNode[];
    onSelectLocation?: (location: LocationNode) => void;
}

const LocationTreeNode = ({ node, level = 0, onSelect }: { node: LocationNode; level?: number; onSelect?: (node: LocationNode) => void }) => {
    const [isOpen, setIsOpen] = useState(true); // Default to open to show full tree
    const hasChildren = node.children && node.children.length > 0;

    const getIcon = (node: LocationNode) => {
        if (node.type === 'VIEW') return <Folder className="h-4 w-4 mr-2 text-blue-500" />;

        switch (node.structuralType) {
            case 'WAREHOUSE': return <Factory className="h-4 w-4 mr-2 text-purple-600" />;
            case 'ROOM': return <DoorOpen className="h-4 w-4 mr-2 text-orange-500" />;
            case 'ROW': return <AlignJustify className="h-4 w-4 mr-2 text-yellow-600" />;
            case 'BAY': return <Columns className="h-4 w-4 mr-2 text-cyan-600" />;
            case 'SHELF': return <Layers className="h-4 w-4 mr-2 text-indigo-500" />;
            case 'POSITION': return <Target className="h-4 w-4 mr-2 text-red-500" />;
            default: return <MapPin className="h-4 w-4 mr-2 text-green-500" />;
        }
    };

    return (
        <div className="select-none">
            <div
                className={cn(
                    "flex items-center py-1 px-2 hover:bg-muted/50 rounded-sm cursor-pointer",
                    level > 0 && "ml-4"
                )}
                onClick={() => onSelect?.(node)}
            >
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 mr-1 p-0 hover:bg-transparent"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(!isOpen);
                    }}
                >
                    {hasChildren ? (
                        isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
                    ) : (
                        <span className="w-3" />
                    )}
                </Button>
                {getIcon(node)}
                <Link
                    href={`/inventory/locations/${node.id}`}
                    className="text-sm hover:underline"
                    onClick={(e) => e.stopPropagation()}
                >
                    {node.name}
                </Link>
                <span className="ml-2 text-xs text-muted-foreground">({node.type})</span>
            </div>
            {isOpen && hasChildren && (
                <div className="ml-2 border-l pl-2">
                    {node.children!.map((child) => (
                        <LocationTreeNode key={child.id} node={child} level={level + 1} onSelect={onSelect} />
                    ))}
                </div>
            )}
        </div>
    );
};

export function LocationTree({ locations, onSelectLocation }: LocationTreeProps) {
    return (
        <div className="border rounded-md p-4 bg-card">
            {locations.map((location) => (
                <LocationTreeNode key={location.id} node={location} onSelect={onSelectLocation} />
            ))}
        </div>
    );
}
