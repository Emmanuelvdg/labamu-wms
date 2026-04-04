'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getWorkflowTemplate, updateWorkflowTemplate, validateWorkflowTemplate, activateWorkflowTemplate } from '@/lib/api';
import { ArrowLeft, Save, CheckCircle2, Play, Trash2 } from 'lucide-react';

const ROUTE_STEP_TYPES = [
    { id: 'RECEIVE', name: 'Receive/Inbound', color: 'bg-blue-100 border-blue-400' },
    { id: 'PUTAWAY', name: 'Put-Away', color: 'bg-indigo-100 border-indigo-400' },
    { id: 'QC_INSPECT', name: 'QC Inspect', color: 'bg-yellow-100 border-yellow-400' },
    { id: 'STAGE', name: 'Staging', color: 'bg-purple-100 border-purple-400' },
    { id: 'PICK', name: 'Pick', color: 'bg-orange-100 border-orange-400' },
    { id: 'WAVE_PICK', name: 'Wave Pick', color: 'bg-green-100 border-green-400' },
];

function RouteBuilderContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [template, setTemplate] = useState<any>(null);
    const [steps, setSteps] = useState<any[]>([]);
    const [transitions, setTransitions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // UI State
    const [selectedStep, setSelectedStep] = useState<string | null>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
    const [draggingStep, setDraggingStep] = useState<string | null>(null);

    const templateId = searchParams?.get('id');

    useEffect(() => {
        if (!templateId) {
            setLoading(false);
            return;
        }
        loadTemplate(templateId);
    }, [templateId]);

    const loadTemplate = async (id: string) => {
        try {
            setLoading(true);
            const data = await getWorkflowTemplate(id);
            setTemplate(data);
            setSteps(data.steps || []);
            setTransitions(data.transitions || []);
        } catch (error) {
            console.error(error);
            alert('Failed to load route template');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!template) return;
        setSaving(true);
        try {
            await updateWorkflowTemplate(template.id, {
                steps,
                transitions
            });
            alert('Route graph saved successfully!');
            loadTemplate(template.id);
        } catch (error) {
            console.error(error);
            alert('Failed to save route graph');
        } finally {
            setSaving(false);
        }
    };

    const handleAddStepToCanvas = (typeId: string, e: React.MouseEvent) => {
        if (!canvasRef.current) return;
        
        const defaultX = 100 + (steps.length * 20);
        const defaultY = 100 + (steps.length * 20);

        const newStep = {
            id: `new-${Date.now()}`,
            type: typeId,
            name: ROUTE_STEP_TYPES.find(t => t.id === typeId)?.name || 'New Route Node',
            positionX: defaultX,
            positionY: defaultY,
            config: {},
            isStart: steps.length === 0,
            isEnd: false
        };

        setSteps([...steps, newStep]);
        setSelectedStep(newStep.id);
    };

    const handleNodeMouseDown = (e: React.MouseEvent, stepId: string) => {
        e.stopPropagation();
        setSelectedStep(stepId);
        setDraggingStep(stepId);
    };

    const handleCanvasMouseMove = (e: React.MouseEvent) => {
        if (!draggingStep || !canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left - 75; // 75 is half node width roughly
        const y = e.clientY - rect.top - 25; // 25 is half node height roughly

        setSteps(prev => prev.map(s =>
            s.id === draggingStep
                ? { ...s, positionX: Math.max(0, x), positionY: Math.max(0, y) }
                : s
        ));
    };

    const handleCanvasMouseUp = () => {
        setDraggingStep(null);
    };

    const deleteSelectedStep = () => {
        if (!selectedStep) return;
        setSteps(steps.filter(s => s.id !== selectedStep));
        setTransitions(transitions.filter(t => t.fromStepId !== selectedStep && t.toStepId !== selectedStep));
        setSelectedStep(null);
    };

    const updateStepConfig = (key: string, value: any) => {
        setSteps(prev => prev.map(s => {
            if (s.id === selectedStep) {
                return { ...s, config: { ...s.config, [key]: value } };
            }
            return s;
        }));
    };

    const activeNode = steps.find(s => s.id === selectedStep);

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading Route Builder...</div>;
    }

    if (!template) {
        return <div className="p-8 text-center text-red-500">Route Template not found or no ID provided.</div>;
    }

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-gray-50 font-sans">
            <div className="flex items-center justify-between px-6 py-3 bg-white border-b shadow-sm z-10">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="sm" onClick={() => router.push('/inventory/routes')} className="text-gray-500">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Routes
                    </Button>
                    <div className="h-6 border-r border-gray-300"></div>
                    <div>
                        <h1 className="text-lg font-semibold text-gray-900">{template.name} (Route Editor)</h1>
                        <p className="text-xs text-gray-500">Version {template.version} • {template.status}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                        id="save-route-btn"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Saving...' : 'Save Route Graph'}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                            try {
                                const res = await validateWorkflowTemplate(template.id);
                                if (res.valid) alert('Route Graph is valid!');
                                else alert('Invalid graph: ' + res.errors.join(', '));
                            } catch (e: any) {
                                alert('Validation failed: ' + e.message);
                            }
                        }}
                        id="validate-route-btn"
                    >
                        <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                        Validate
                    </Button>
                    {template.status === 'DRAFT' && (
                        <Button
                            variant="default"
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={async () => {
                                try {
                                    await activateWorkflowTemplate(template.id);
                                    alert('Route activated successfully!');
                                    loadTemplate(template.id);
                                } catch (e: any) {
                                    alert('Activation failed: ' + e.message);
                                }
                            }}
                            id="activate-route-btn"
                        >
                            <Play className="w-4 h-4 mr-2" />
                            Activate Route
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                <div className="w-64 bg-white border-r flex flex-col shadow-sm z-0">
                    <div className="p-4 border-b bg-gray-50">
                        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Route Nodes</h2>
                    </div>
                    <div className="p-4 overflow-y-auto space-y-3">
                        <p className="text-xs text-gray-500 mb-2">Click to add physical movement step.</p>
                        {ROUTE_STEP_TYPES.map(type => (
                            <div
                                key={type.id}
                                onClick={(e) => handleAddStepToCanvas(type.id, e)}
                                className={`p-3 rounded-md border shadow-sm cursor-pointer hover:shadow hover:ring-2 hover:ring-blue-100 transition-all ${type.color}`}
                            >
                                <span className="text-sm font-medium text-gray-800">{type.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div
                    className="flex-1 relative overflow-auto bg-slate-50 overflow-hidden"
                    ref={canvasRef}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseUp}
                    onClick={() => setSelectedStep(null)}
                >
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        <defs>
                            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill="#9ca3af" />
                            </marker>
                        </defs>
                        {transitions.map((t, i) => {
                            const from = steps.find(s => s.id === t.fromStepId);
                            const to = steps.find(s => s.id === t.toStepId);
                            if (!from || !to) return null;

                            const x1 = from.positionX + 75;
                            const y1 = from.positionY + 30;
                            const x2 = to.positionX + 75;
                            const y2 = to.positionY + 30;

                            const dx = x2 - x1;
                            const dy = y2 - y1;
                            const absDx = Math.abs(dx);
                            const absDy = Math.abs(dy);

                            let targetX = x2;
                            let targetY = y2;

                            if (absDx > 0 || absDy > 0) {
                                const scaleX = absDx > 0 ? 80 / absDx : Infinity;
                                const scaleY = absDy > 0 ? 35 / absDy : Infinity;
                                const scale = Math.min(scaleX, scaleY);

                                if (scale < 1) {
                                    targetX = x2 - dx * scale;
                                    targetY = y2 - dy * scale;
                                }
                            }

                            return (
                                <line
                                    key={t.id || `line-${i}`}
                                    x1={x1} y1={y1} x2={targetX} y2={targetY}
                                    stroke="#9ca3af"
                                    strokeWidth="2"
                                    markerEnd="url(#arrowhead)"
                                />
                            );
                        })}
                    </svg>

                    {steps.map(step => {
                        const typeInfo = ROUTE_STEP_TYPES.find(t => t.id === step.type) || { color: 'bg-white border-gray-300' };
                        const isSelected = selectedStep === step.id;

                        return (
                            <div
                                key={step.id}
                                onMouseDown={(e) => handleNodeMouseDown(e, step.id)}
                                onClick={(e) => e.stopPropagation()}
                                className={`absolute w-[150px] p-3 rounded-md border shadow-sm cursor-grab active:cursor-grabbing select-none
                                    ${typeInfo.color}
                                    ${isSelected ? 'ring-2 ring-blue-500 shadow-md' : 'opacity-90'}
                                    ${step.isStart ? 'border-l-4 border-l-green-500' : ''}
                                    ${step.isEnd ? 'border-r-4 border-r-red-500' : ''}
                                `}
                                style={{
                                    left: `${step.positionX}px`,
                                    top: `${step.positionY}px`,
                                    transition: draggingStep === step.id ? 'none' : 'box-shadow 0.2s'
                                }}
                            >
                                <div className="text-xs font-bold text-gray-800 line-clamp-1">{step.name}</div>
                                <div className="text-[10px] text-gray-500 mt-1 uppercase">{step.type.replace('_', ' ')}</div>
                            </div>
                        );
                    })}
                </div>

                <div className="w-80 bg-white border-l flex flex-col shadow-sm z-0">
                    <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Node Properties</h2>
                        {activeNode && (
                            <Button variant="ghost" size="sm" onClick={deleteSelectedStep} className="text-red-600 hover:text-red-700 hover:bg-red-50 px-2 h-8">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                    <div className="p-5 overflow-y-auto">
                        {!activeNode ? (
                            <div className="text-center text-sm text-gray-400 mt-10">
                                Select a movement node on the canvas to edit properties.
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Node Name</label>
                                    <input
                                        type="text"
                                        className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                        value={activeNode.name}
                                        onChange={(e) => setSteps(steps.map(s => s.id === activeNode.id ? { ...s, name: e.target.value } : s))}
                                    />
                                </div>

                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="isStart"
                                        checked={activeNode.isStart}
                                        onChange={(e) => setSteps(steps.map(s => s.id === activeNode.id ? { ...s, isStart: e.target.checked } : s))}
                                        className="h-4 w-4 text-blue-600 rounded border-gray-300"
                                    />
                                    <label htmlFor="isStart" className="text-sm text-gray-700">Triggers workflow on input</label>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="isEnd"
                                        checked={activeNode.isEnd}
                                        onChange={(e) => setSteps(steps.map(s => s.id === activeNode.id ? { ...s, isEnd: e.target.checked } : s))}
                                        className="h-4 w-4 text-red-600 rounded border-gray-300"
                                    />
                                    <label htmlFor="isEnd" className="text-sm text-gray-700">Terminal (End) Node</label>
                                </div>

                                <hr className="border-gray-200 mt-4 mb-4" />
                                <div>
                                    <h3 className="text-xs font-semibold text-gray-800 uppercase mb-3">Links to Next Nodes</h3>
                                    <ul className="space-y-1 mb-3">
                                        {transitions.filter(t => t.fromStepId === activeNode.id).map(t => {
                                            const toNode = steps.find(s => s.id === t.toStepId);
                                            return (
                                                <li key={t.id || t.toStepId} className="flex justify-between items-center text-xs bg-gray-50 p-1 border rounded">
                                                    <span>To: {toNode?.name || 'Unknown'}</span>
                                                    <Button variant="ghost" size="sm" onClick={() => setTransitions(transitions.filter(x => x !== t))} className="h-6 w-6 p-0 text-red-500">X</Button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                    <select
                                        className="w-full text-xs p-2 border border-gray-300 rounded mb-2"
                                        onChange={(e) => {
                                            if (!e.target.value) return;
                                            setTransitions([...transitions, { fromStepId: activeNode.id, toStepId: e.target.value, condition: null }]);
                                            e.target.value = '';
                                        }}
                                        defaultValue=""
                                    >
                                        <option value="" disabled>+ Link to...</option>
                                        {steps.filter(s => s.id !== activeNode.id).map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <hr className="border-gray-200" />

                                <div>
                                    <h3 className="text-xs font-semibold text-gray-800 uppercase mb-3">Node Specifics</h3>

                                    {activeNode.type === 'QC_INSPECT' && (
                                        <div className="space-y-3">
                                            <div>
                                                <div className="flex items-center space-x-2 mb-2">
                                                    <input
                                                        type="checkbox"
                                                        id="requiresSupervisor"
                                                        checked={activeNode.config?.requiresSupervisor || false}
                                                        onChange={(e) => updateStepConfig('requiresSupervisor', e.target.checked)}
                                                    />
                                                    <label htmlFor="requiresSupervisor" className="text-sm text-gray-700">Requires Supervisor Approval</label>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeNode.type === 'STAGE' && (
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs text-gray-600 mb-1">Max consolidation wait time (mins)</label>
                                                <input
                                                    type="number"
                                                    className="w-full text-sm p-2 border border-gray-300 rounded"
                                                    value={activeNode.config?.maxHoldTime || 60}
                                                    onChange={(e) => updateStepConfig('maxHoldTime', parseInt(e.target.value))}
                                                />
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Target Location ID (Optional)</label>
                                        <input
                                            type="text"
                                            className="w-full text-sm p-2 border border-gray-300 rounded"
                                            placeholder="e.g. loc-1234..."
                                            value={activeNode.config?.locationId || activeNode.config?.sourceLocationId || ''}
                                            onChange={(e) => {
                                                if (activeNode.isStart) updateStepConfig('sourceLocationId', e.target.value);
                                                else updateStepConfig('locationId', e.target.value);
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function RouteBuilderPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading Router...</div>}>
            <RouteBuilderContent />
        </Suspense>
    );
}
