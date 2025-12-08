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
    attributes?: { color?: string;[key: string]: any };
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
        // @ts-ignore
        const color = node.attributes?.color;
        const style = color ? { color } : undefined;
        const className = `h-4 w-4 mr-2 ${!color ? 'text-blue-500' : ''}`; // Default color class if no custom color

        if (node.type === 'VIEW') return <Folder className={className} style={style} />;

        switch (node.structuralType) {
            case 'WAREHOUSE': return <Factory className={`h-4 w-4 mr-2 ${!color ? 'text-purple-600' : ''}`} style={style} />;
            case 'ROOM': return <DoorOpen className={`h-4 w-4 mr-2 ${!color ? 'text-orange-500' : ''}`} style={style} />;
            case 'ROW': return <AlignJustify className={`h-4 w-4 mr-2 ${!color ? 'text-yellow-600' : ''}`} style={style} />;
            case 'BAY': return <Columns className={`h-4 w-4 mr-2 ${!color ? 'text-cyan-600' : ''}`} style={style} />;
            case 'SHELF': return <Layers className={`h-4 w-4 mr-2 ${!color ? 'text-indigo-500' : ''}`} style={style} />;
            case 'POSITION': return <Target className={`h-4 w-4 mr-2 ${!color ? 'text-red-500' : ''}`} style={style} />;
            default: return <MapPin className={`h-4 w-4 mr-2 ${!color ? 'text-green-500' : ''}`} style={style} />;
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
