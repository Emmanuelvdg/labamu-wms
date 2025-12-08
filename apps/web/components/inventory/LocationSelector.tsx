import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { LocationTree } from './LocationTree';
import { MapPin, Search } from 'lucide-react';

interface LocationNode {
    id: string;
    name: string;
    type: string;
    structuralType?: string;
    children?: LocationNode[];
    // Add other properties as needed for display
    maxVolume?: number;
    maxWeight?: number;
    attributes?: any;
}

interface LocationSelectorProps {
    locations: LocationNode[]; // Expecting a tree structure
    value?: string;
    onChange: (locationId: string) => void;
    placeholder?: string;
}

export function LocationSelector({ locations, value, onChange, placeholder = "Select Location" }: LocationSelectorProps) {
    const [open, setOpen] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<LocationNode | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Find the selected node in the tree to display its name
    useEffect(() => {
        if (value) {
            const findNode = (nodes: LocationNode[]): LocationNode | null => {
                for (const node of nodes) {
                    if (node.id === value) return node;
                    if (node.children) {
                        const found = findNode(node.children);
                        if (found) return found;
                    }
                }
                return null;
            };
            setSelectedLocation(findNode(locations));
        } else {
            setSelectedLocation(null);
        }
    }, [value, locations]);

    const handleSelect = (node: LocationNode) => {
        onChange(node.id);
        setOpen(false);
    };

    // Filter logic for the tree could be complex, for now we might just rely on the tree's own display
    // or implement a simple filter if needed. For this iteration, we'll show the full tree.

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                >
                    {selectedLocation ? (
                        <span className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            {selectedLocation.name}
                            <span className="text-xs text-gray-400">({selectedLocation.structuralType || selectedLocation.type})</span>
                        </span>
                    ) : (
                        <span className="text-gray-500">{placeholder}</span>
                    )}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Select Location</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto min-h-[300px] border rounded-md p-2">
                    <LocationTree
                        locations={locations}
                        onSelectLocation={handleSelect}
                    />
                </div>

                {selectedLocation && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-md border text-sm">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {selectedLocation.name} Details
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <span className="text-gray-500">Type:</span> {selectedLocation.structuralType || selectedLocation.type}
                            </div>
                            {selectedLocation.maxVolume && (
                                <div>
                                    <span className="text-gray-500">Max Volume:</span> {selectedLocation.maxVolume} m³
                                </div>
                            )}
                            {selectedLocation.maxWeight && (
                                <div>
                                    <span className="text-gray-500">Max Weight:</span> {selectedLocation.maxWeight} kg
                                </div>
                            )}
                            {/* Add more properties here as needed */}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
