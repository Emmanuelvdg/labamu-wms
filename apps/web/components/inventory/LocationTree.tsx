import { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface LocationNode {
    id: string;
    name: string;
    type: string;
    children?: LocationNode[];
}

interface LocationTreeProps {
    locations: LocationNode[];
    onSelectLocation?: (location: LocationNode) => void;
}

const LocationTreeNode = ({ node, level = 0, onSelect }: { node: LocationNode; level?: number; onSelect?: (node: LocationNode) => void }) => {
    const [isOpen, setIsOpen] = useState(true);
    const hasChildren = node.children && node.children.length > 0;

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
                {node.type === 'VIEW' ? (
                    <Folder className="h-4 w-4 mr-2 text-blue-500" />
                ) : (
                    <MapPin className="h-4 w-4 mr-2 text-green-500" />
                )}
                <span className="text-sm">{node.name}</span>
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
