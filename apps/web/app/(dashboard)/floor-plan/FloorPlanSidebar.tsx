
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Trash2, Save, X } from 'lucide-react';

interface FloorPlanSidebarProps {
    element: any;
    elementType: 'area' | 'zone' | 'bin';
    onUpdate: (id: string, updates: any) => void;
    onDelete: (id: string) => void;
    onClose: () => void;
}

export function FloorPlanSidebar({ element, elementType, onUpdate, onDelete, onClose }: FloorPlanSidebarProps) {
    const [formData, setFormData] = useState({ ...element });

    // Update form data when element changes
    useEffect(() => {
        setFormData({ ...element });
    }, [element]);

    const handleChange = (field: string, value: any) => {
        const newData = { ...formData, [field]: value };
        setFormData(newData);
        // Optional: Live update prompt for visual feedback, but performant 
        // onUpdate(element.id, { [field]: value });
    };

    const handleSave = () => {
        onUpdate(element.id, formData);
    };

    const handleDelete = () => {
        if (confirm('Are you sure you want to delete this element?')) {
            onDelete(element.id);
        }
    };

    if (!element) return null;

    return (
        <div className="w-80 border-l bg-white h-full flex flex-col shadow-xl z-20">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                <div>
                    <h3 className="font-semibold text-lg">Edit {elementType === 'area' ? 'Area' : elementType === 'zone' ? 'Zone' : 'Bin'}</h3>
                    <p className="text-xs text-muted-foreground font-mono">{element.id.substring(0, 8)}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                    <X className="h-4 w-4" />
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Properties</h4>

                    <div className="space-y-2">
                        <Label>Name</Label>
                        <Input
                            value={formData.name || ''}
                            onChange={(e) => handleChange('name', e.target.value)}
                        />
                    </div>

                    {elementType === 'area' && (
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select
                                value={formData.areaType}
                                onValueChange={(v) => handleChange('areaType', v)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="RECEIVING">Receiving</SelectItem>
                                    <SelectItem value="STAGING">Staging</SelectItem>
                                    <SelectItem value="STORAGE">Storage</SelectItem>
                                    <SelectItem value="PICKING">Picking</SelectItem>
                                    <SelectItem value="PACKING">Packing</SelectItem>
                                    <SelectItem value="SHIPPING">Shipping</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {(elementType === 'zone' || elementType === 'bin') && (
                        <div className="space-y-2">
                            <Label>Structural Type</Label>
                            <Input value={formData.structuralType} disabled className="bg-muted" />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Color</Label>
                        <div className="flex gap-2">
                            <Input
                                type="color"
                                value={formData.color || '#cccccc'}
                                onChange={(e) => handleChange('color', e.target.value)}
                                className="w-12 h-10 p-1 cursor-pointer"
                            />
                            <Input
                                value={formData.color || ''}
                                onChange={(e) => handleChange('color', e.target.value)}
                                className="flex-1 font-mono uppercase"
                            />
                        </div>
                    </div>
                </div>

                <Separator />

                {/* Geometry */}
                <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Geometry</h4>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>X Position (m)</Label>
                            <Input
                                type="number"
                                step="0.1"
                                value={formData.x || 0}
                                onChange={(e) => handleChange('x', parseFloat(e.target.value))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Y Position (m)</Label>
                            <Input
                                type="number"
                                step="0.1"
                                value={formData.y || 0}
                                onChange={(e) => handleChange('y', parseFloat(e.target.value))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Width (m)</Label>
                            <Input
                                type="number"
                                step="0.1"
                                value={formData.width || 0}
                                onChange={(e) => handleChange('width', parseFloat(e.target.value))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Height (m)</Label>
                            <Input
                                type="number"
                                step="0.1"
                                value={formData.height || 0}
                                onChange={(e) => handleChange('height', parseFloat(e.target.value))}
                            />
                        </div>
                        <div className="space-y-2 col-span-2">
                            <Label>Rotation (deg)</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    value={formData.rotation || 0}
                                    onChange={(e) => handleChange('rotation', parseFloat(e.target.value))}
                                />
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleChange('rotation', ((formData.rotation || 0) + 90) % 360)}
                                    title="Rotate +90°"
                                >
                                    <span className="text-xs">↻</span>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {(elementType === 'bin' || (elementType === 'zone' && formData.structuralType !== 'ROOM')) && (
                    <>
                        <Separator />
                        <div className="space-y-4">
                            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Capacity</h4>
                            <div className="space-y-2">
                                <Label>Max Weight (kg)</Label>
                                <Input
                                    type="number"
                                    value={formData.maxWeight || 0}
                                    onChange={(e) => handleChange('maxWeight', parseFloat(e.target.value))}
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-between space-x-2">
                <Button variant="destructive" onClick={handleDelete} className="flex-1">
                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                </Button>
                <Button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                    <Save className="h-4 w-4 mr-2" /> Save
                </Button>
            </div>
        </div>
    );
}
