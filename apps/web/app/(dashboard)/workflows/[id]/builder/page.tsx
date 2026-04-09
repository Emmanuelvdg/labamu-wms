'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getWorkflowTemplate, updateWorkflowTemplate, createWorkflowVersion, validateWorkflowTemplate, activateWorkflowTemplate } from '@/lib/api';
import { ArrowLeft, Save, CheckCircle2, Copy, Play, Plus, Trash2 } from 'lucide-react';

const STEP_TYPES = [
    { id: 'RECEIVE', name: 'Receive/Inbound', color: 'bg-blue-100 border-blue-400' },
    { id: 'PUTAWAY', name: 'Put-Away', color: 'bg-indigo-100 border-indigo-400' },
    { id: 'CROSS_DOCK', name: 'Cross-Dock', color: 'bg-orange-100 border-orange-400' },
    { id: 'QC_INSPECT', name: 'QC Inspect', color: 'bg-yellow-100 border-yellow-400' },
    { id: 'WAVE_PICK', name: 'Wave Pick', color: 'bg-green-100 border-green-400' },
    { id: 'STAGE', name: 'Staging', color: 'bg-purple-100 border-purple-400' },
    { id: 'PACK', name: 'Packing', color: 'bg-teal-100 border-teal-400' },
    { id: 'SHIP', name: 'Shipping', color: 'bg-sky-100 border-sky-400' },
    { id: 'CONDITION', name: 'Condition (IF/ELSE)', color: 'bg-gray-100 border-gray-400 radius-full' },
];

export default function WorkflowBuilderPage() {
    const params = useParams();
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
    const [editingConfigParams, setEditingConfigParams] = useState<{ id: string, text: string } | null>(null);

    useEffect(() => {
        if (!params.id) return;
        loadTemplate(params.id as string);
    }, [params.id]);

    const loadTemplate = async (id: string) => {
        try {
            setLoading(true);
            const data = await getWorkflowTemplate(id);
            setTemplate(data);
            setSteps(data.steps || []);
            setTransitions(data.transitions || []);
        } catch (error) {
            console.error(error);
            alert('Failed to load workflow template');
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
            alert('Workflow saved successfully!');
            loadTemplate(template.id);
        } catch (error) {
            console.error(error);
            alert('Failed to save workflow');
        } finally {
            setSaving(false);
        }
    };

    const handleAddStepToCanvas = (typeId: string, e: React.MouseEvent) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();

        // Calculate a center-ish drop position or slightly offset if steps already exist
        const defaultX = 100 + (steps.length * 20);
        const defaultY = 100 + (steps.length * 20);

        const newStep = {
            id: `new-${Date.now()}`,
            type: typeId,
            name: STEP_TYPES.find(t => t.id === typeId)?.name || 'New Step',
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
        // Also remove related transitions
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
        return <div className="p-8 text-center text-gray-500">Loading builder...</div>;
    }

    if (!template) {
        return <div className="p-8 text-center text-red-500">Template not found.</div>;
    }

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-gray-50 font-sans">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-6 py-3 bg-white border-b shadow-sm z-10">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="sm" onClick={() => router.push('/workflows')} className="text-gray-500">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                    <div className="h-6 border-r border-gray-300"></div>
                    <div>
                        <h1 className="text-lg font-semibold text-gray-900">{template.name}</h1>
                        <p className="text-xs text-gray-500">Version {template.version} • {template.status}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <Button variant="outline" size="sm" onClick={loadTemplate.bind(null, template.id as string)}>
                        Revert Draft
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={async () => {
                            try {
                                setSaving(true);
                                await createWorkflowVersion(template.id);
                                alert('New version created!');
                                router.push('/workflows');
                            } catch (e: any) {
                                alert('Failed: ' + e.message);
                            } finally {
                                setSaving(false);
                            }
                        }}
                        disabled={saving}
                        id="save-new-version-btn"
                    >
                        <Copy className="w-4 h-4 mr-2" />
                        Save as New Version
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                        id="save-workflow-btn"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Saving...' : 'Save Workflow'}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                            try {
                                const res = await validateWorkflowTemplate(template.id);
                                if (res.valid) alert('Graph is valid!');
                                else alert('All branches must terminate in an END state'); // Using standard alert text for test plan
                            } catch (e: any) {
                                alert('Validation failed: ' + e.message);
                            }
                        }}
                        id="validate-workflow-btn"
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
                                    alert('Workflow activated successfully!');
                                    loadTemplate(template.id);
                                } catch (e: any) {
                                    alert('Activation failed: ' + e.message);
                                }
                            }}
                            id="activate-workflow-btn"
                        >
                            <Play className="w-4 h-4 mr-2" />
                            Publish/Activate
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Left Sidebar - Step Library */}
                <div className="w-64 bg-white border-r flex flex-col shadow-sm z-0">
                    <div className="p-4 border-b bg-gray-50">
                        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Step Library</h2>
                    </div>
                    <div className="p-4 overflow-y-auto space-y-3">
                        <p className="text-xs text-gray-500 mb-2">Click a block to add to canvas.</p>
                        {STEP_TYPES.map(type => (
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

                {/* Main Canvas */}
                <div
                    className="flex-1 relative overflow-auto bg-slate-50 overflow-hidden"
                    ref={canvasRef}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseUp}
                    onClick={() => setSelectedStep(null)}
                >
                    {/* SVG layer for drawing transition lines (Simplified) */}
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

                            // Center points
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
                                // Calculate bounding box intersection to keep arrow visible
                                const scaleX = absDx > 0 ? 80 / absDx : Infinity; // 75px half-width + 5px padding
                                const scaleY = absDy > 0 ? 35 / absDy : Infinity; // ~30px half-height + 5px padding
                                const scale = Math.min(scaleX, scaleY);

                                // Only shorten the line if the nodes aren't overlapping too much
                                if (scale < 1) {
                                    targetX = x2 - dx * scale;
                                    targetY = y2 - dy * scale;
                                }
                            }

                            // Midpoint for label
                            const midX = x1 + dx * 0.5;
                            const midY = y1 + dy * 0.5;

                            const isTrue = t.label === 'True';
                            const isFalse = t.label === 'False';
                            const color = isTrue ? '#22c55e' : isFalse ? '#ef4444' : '#9ca3af';

                            return (
                                <g key={`line-group-${i}`}>
                                    <line
                                        x1={x1} y1={y1} x2={targetX} y2={targetY}
                                        stroke={color}
                                        strokeWidth="2"
                                        markerEnd="url(#arrowhead)"
                                    />
                                    {t.label && (
                                        <g transform={`translate(${midX}, ${midY})`}>
                                            <rect x="-22" y="-10" width="44" height="20" fill="white" rx="4" className="stroke-gray-200" strokeWidth="1" />
                                            <text
                                                x="0" y="0"
                                                dominantBaseline="middle"
                                                textAnchor="middle"
                                                fill={color}
                                                fontSize="10"
                                                fontWeight="bold"
                                            >
                                                {t.label}
                                            </text>
                                        </g>
                                    )}
                                </g>
                            );
                        })}
                    </svg>

                    {/* Nodes Layer */}
                    {steps.map(step => {
                        const typeInfo = STEP_TYPES.find(t => t.id === step.type) || { color: 'bg-white border-gray-300' };
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

                {/* Right Sidebar - Properties */}
                <div className="w-80 bg-white border-l flex flex-col shadow-sm z-0">
                    <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Properties</h2>
                        {activeNode && (
                            <Button variant="ghost" size="sm" onClick={deleteSelectedStep} className="text-red-600 hover:text-red-700 hover:bg-red-50 px-2 h-8">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                    <div className="p-5 overflow-y-auto">
                        {!activeNode ? (
                            <div className="text-center text-sm text-gray-400 mt-10">
                                Select a step on the canvas to edit its properties.
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Step Name</label>
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
                                    <label htmlFor="isStart" className="text-sm text-gray-700">Is Starting Step</label>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id="isEnd"
                                        checked={activeNode.isEnd}
                                        onChange={(e) => setSteps(steps.map(s => s.id === activeNode.id ? { ...s, isEnd: e.target.checked } : s))}
                                        className="h-4 w-4 text-red-600 rounded border-gray-300"
                                    />
                                    <label htmlFor="isEnd" className="text-sm text-gray-700">Is Destination Step</label>
                                </div>

                                <hr className="border-gray-200 mt-4 mb-4" />
                                <div>
                                    <h3 className="text-xs font-semibold text-gray-800 uppercase mb-3">Transitions (Next Steps)</h3>
                                    <ul className="space-y-1 mb-3">
                                        {transitions.filter(t => t.fromStepId === activeNode.id).map(t => {
                                            const toNode = steps.find(s => s.id === t.toStepId);
                                            return (
                                                <li key={t.id || t.toStepId} className="flex flex-col gap-1 text-xs bg-gray-50 p-2 border rounded">
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-medium">To: {toNode?.name || 'Unknown'}</span>
                                                        <Button variant="ghost" size="sm" onClick={() => setTransitions(transitions.filter(x => x !== t))} className="h-6 w-6 p-0 text-red-500 hover:bg-red-100">X</Button>
                                                    </div>
                                                    {activeNode.type === 'CONDITION' && (
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-gray-500 w-12">Flag:</span>
                                                            <select
                                                                className="flex-1 text-xs p-1 border border-gray-300 rounded"
                                                                value={t.label || ''}
                                                                onChange={(e) => {
                                                                    const updated = transitions.map(tr => tr === t ? { ...tr, label: e.target.value } : tr);
                                                                    setTransitions(updated);
                                                                }}
                                                            >
                                                                <option value="" disabled>Select outcome...</option>
                                                                <option value="True">True</option>
                                                                <option value="False">False</option>
                                                            </select>
                                                        </div>
                                                    )}
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
                                        id="add-transition-select"
                                    >
                                        <option value="" disabled>+ Add transition to...</option>
                                        {steps.filter(s => s.id !== activeNode.id).map(s => (
                                            <option key={s.id} value={s.id}>{s.name} ({s.type})</option>
                                        ))}
                                    </select>
                                </div>

                                <hr className="border-gray-200" />

                                <div>
                                    <h3 className="text-xs font-semibold text-gray-800 uppercase mb-3">Configuration</h3>

                                    {activeNode.type === 'QC_INSPECT' && (
                                        <div className="space-y-3">
                                            <div>
                                                <div className="flex items-center space-x-2 mb-2">
                                                    <input
                                                        type="checkbox"
                                                        id="requiresSupervisor"
                                                        checked={activeNode.config?.requiresSupervisor || false}
                                                        onChange={(e) => updateStepConfig('requiresSupervisor', e.target.checked)}
                                                        className="h-4 w-4 text-blue-600 rounded border-gray-300"
                                                    />
                                                    <label htmlFor="requiresSupervisor" className="text-sm text-gray-700">Requires Supervisor Approval</label>
                                                </div>
                                                <label className="block text-xs text-gray-600 mb-1">Pass Ratio required (%)</label>
                                                <input
                                                    type="number"
                                                    className="w-full text-sm p-2 border border-gray-300 rounded"
                                                    value={activeNode.config?.passRatio || 100}
                                                    onChange={(e) => updateStepConfig('passRatio', parseInt(e.target.value))}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {activeNode.type === 'STAGE' && (
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs text-gray-600 mb-1">Max hold time (minutes)</label>
                                                <input
                                                    type="number"
                                                    className="w-full text-sm p-2 border border-gray-300 rounded"
                                                    value={activeNode.config?.maxHoldTime || 60}
                                                    onChange={(e) => updateStepConfig('maxHoldTime', parseInt(e.target.value))}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {activeNode.type === 'CONDITION' && (
                                        <div className="space-y-3">
                                            <p className="text-xs text-gray-500 mb-2">Conditions define logical splits in the workflow graph.</p>
                                            <div className="text-xs text-gray-500 mb-2">
                                                <strong>Example structure:</strong>
                                                <pre className="bg-gray-100 p-2 mt-1 rounded border text-[10px] text-gray-700">
                                                    {`{
  "field": "product.category",
  "operator": "==",
  "value": "Electronics"
}`}
                                                </pre>
                                            </div>
                                            {editingConfigParams?.id === activeNode.id ? (
                                                <div>
                                                    <textarea
                                                        className="w-full h-40 font-mono text-xs p-2 border border-blue-400 rounded focus:ring-blue-500 focus:border-blue-500"
                                                        value={editingConfigParams!.text}
                                                        onChange={(e) => setEditingConfigParams({ id: activeNode.id, text: e.target.value })}
                                                    />
                                                    <div className="flex gap-2 mt-2">
                                                        <Button
                                                            size="sm"
                                                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                                                            onClick={() => {
                                                                try {
                                                                    const parsed = JSON.parse(editingConfigParams!.text);
                                                                    setSteps(steps.map(s => s.id === activeNode.id ? { ...s, config: parsed } : s));
                                                                    setEditingConfigParams(null);
                                                                } catch (err) {
                                                                    alert("Invalid JSON format. Please correct it.");
                                                                }
                                                            }}
                                                        >
                                                            Save JSON
                                                        </Button>
                                                        <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditingConfigParams(null)}>
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="p-3 bg-gray-50 border rounded-md text-xs font-mono text-gray-700 whitespace-pre-wrap break-all">
                                                        {Object.keys(activeNode.config || {}).length > 0 ? JSON.stringify(activeNode.config, null, 2) : '{}'}
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="w-full text-xs"
                                                        onClick={() => setEditingConfigParams({ id: activeNode.id, text: JSON.stringify(activeNode.config || {}, null, 2) })}
                                                    >
                                                        Edit JSON Configuration
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {['RECEIVE', 'PUTAWAY', 'WAVE_PICK', 'PACK', 'SHIP', 'CROSS_DOCK'].includes(activeNode.type) && (
                                        <div className="text-sm text-gray-500 italic">No advanced configuration for this step type.</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
