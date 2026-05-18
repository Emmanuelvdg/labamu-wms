'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getWorkflowTemplate, updateWorkflowTemplate, validateWorkflowTemplate, activateWorkflowTemplate } from '@/lib/api';
import { ArrowLeft, Save, CheckCircle2, Play, Trash2, GitMerge } from 'lucide-react';

const ROUTE_STEP_TYPES = [
    { id: 'RECEIVE',     name: 'Receive/Inbound', color: 'bg-blue-100 border-blue-400',   hint: 'Log incoming goods from a supplier or transfer.' },
    { id: 'PUTAWAY',     name: 'Put-Away',        color: 'bg-indigo-100 border-indigo-400', hint: 'Move received goods to their storage location.' },
    { id: 'QC_INSPECT',  name: 'QC Inspect',      color: 'bg-yellow-100 border-yellow-400', hint: 'Quality check with configurable sampling rate and pass/fail outcome.' },
    { id: 'STAGE',       name: 'Staging',         color: 'bg-purple-100 border-purple-400', hint: 'Hold goods in a staging area before the next step.' },
    { id: 'CONSOLIDATE', name: 'Consolidation',   color: 'bg-pink-100 border-pink-400',   hint: 'Merge picks from multiple zones into a single outbound unit.' },
    { id: 'PICK',        name: 'Pick',            color: 'bg-orange-100 border-orange-400', hint: 'Single-order pick task generated for each order line.' },
    { id: 'WAVE_PICK',   name: 'Wave Pick',       color: 'bg-green-100 border-green-400', hint: 'Batch pick grouped by product or category across multiple orders.' },
    { id: 'PACK',        name: 'Pack',            color: 'bg-teal-100 border-teal-400',   hint: 'Package items into parcels, with optional weight verification.' },
    { id: 'SHIP',        name: 'Ship',            color: 'bg-red-100 border-red-400',     hint: 'Hand off to carrier. Triggers shipment confirmation.' },
    { id: 'CROSS_DOCK',  name: 'Cross-Dock',      color: 'bg-cyan-100 border-cyan-400',   hint: 'Route directly from inbound dock to outbound without storage.' },
];

// Node dimensions used for port positioning and arrow clipping
const NODE_W = 150;
const NODE_H = 60;

function StepConfigPanel({ node, steps, transitions, onConfigChange, onNameChange, onFlagChange, onSetTransitions }: {
    node: any;
    steps: any[];
    transitions: any[];
    onConfigChange: (key: string, value: any) => void;
    onNameChange: (name: string) => void;
    onFlagChange: (key: 'isStart' | 'isEnd', value: boolean) => void;
    onSetTransitions: (t: any[]) => void;
}) {
    return (
        <div className="space-y-5">
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Node Name</label>
                <input
                    type="text"
                    className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    value={node.name}
                    onChange={e => onNameChange(e.target.value)}
                />
            </div>

            <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" className="h-4 w-4 text-green-600 rounded border-gray-300"
                        checked={node.isStart}
                        onChange={e => onFlagChange('isStart', e.target.checked)} />
                    Start node
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" className="h-4 w-4 text-red-600 rounded border-gray-300"
                        checked={node.isEnd}
                        onChange={e => onFlagChange('isEnd', e.target.checked)} />
                    End node
                </label>
            </div>

            <hr className="border-gray-200" />

            {/* ── Step-specific fields ─────────────────────────────────── */}
            <div className="space-y-3">
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Step Configuration</h3>

                {node.type === 'RECEIVE' && (
                    <>
                        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                            <input type="checkbox" className="h-4 w-4 rounded border-gray-300"
                                checked={node.config?.crossDockEnabled || false}
                                onChange={e => onConfigChange('crossDockEnabled', e.target.checked)} />
                            Enable cross-dock routing
                        </label>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Receipt notes (optional)</label>
                            <input type="text" className="w-full text-sm p-2 border border-gray-300 rounded"
                                placeholder="e.g. Fragile — handle with care"
                                value={node.config?.notes || ''}
                                onChange={e => onConfigChange('notes', e.target.value)} />
                        </div>
                    </>
                )}

                {node.type === 'PUTAWAY' && (
                    <>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Rotation policy override</label>
                            <select className="w-full text-sm p-2 border border-gray-300 rounded"
                                value={node.config?.rotationPolicy || ''}
                                onChange={e => onConfigChange('rotationPolicy', e.target.value)}>
                                <option value="">Use warehouse default</option>
                                <option value="FIFO">FIFO</option>
                                <option value="FEFO">FEFO</option>
                                <option value="NEAREST">Nearest available</option>
                            </select>
                        </div>
                    </>
                )}

                {node.type === 'QC_INSPECT' && (
                    <>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Sampling rate (%)</label>
                            <input type="number" min="1" max="100" className="w-full text-sm p-2 border border-gray-300 rounded"
                                value={node.config?.samplingRate ?? 100}
                                onChange={e => onConfigChange('samplingRate', parseInt(e.target.value) || 100)} />
                        </div>
                        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                            <input type="checkbox" className="h-4 w-4 rounded border-gray-300"
                                checked={node.config?.requiresSupervisor || false}
                                onChange={e => onConfigChange('requiresSupervisor', e.target.checked)} />
                            Requires supervisor sign-off
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                            <input type="checkbox" className="h-4 w-4 rounded border-gray-300"
                                checked={node.config?.blockOnFail || false}
                                onChange={e => onConfigChange('blockOnFail', e.target.checked)} />
                            Block route on QC failure
                        </label>
                    </>
                )}

                {node.type === 'STAGE' && (
                    <>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Staging area name</label>
                            <input type="text" className="w-full text-sm p-2 border border-gray-300 rounded"
                                placeholder="e.g. Zone A staging bay"
                                value={node.config?.stagingAreaName || ''}
                                onChange={e => onConfigChange('stagingAreaName', e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Max hold time (minutes)</label>
                            <input type="number" min="1" className="w-full text-sm p-2 border border-gray-300 rounded"
                                value={node.config?.maxHoldTime || 60}
                                onChange={e => onConfigChange('maxHoldTime', parseInt(e.target.value))} />
                        </div>
                    </>
                )}

                {node.type === 'CONSOLIDATE' && (
                    <>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Consolidation zone</label>
                            <input type="text" className="w-full text-sm p-2 border border-gray-300 rounded"
                                placeholder="e.g. CONSOL-01"
                                value={node.config?.consolidationZone || ''}
                                onChange={e => onConfigChange('consolidationZone', e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Max wait (minutes)</label>
                            <input type="number" min="1" className="w-full text-sm p-2 border border-gray-300 rounded"
                                value={node.config?.maxWaitMinutes || 30}
                                onChange={e => onConfigChange('maxWaitMinutes', parseInt(e.target.value))} />
                        </div>
                    </>
                )}

                {(node.type === 'PICK' || node.type === 'WAVE_PICK') && (
                    <>
                        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                            <input type="checkbox" className="h-4 w-4 rounded border-gray-300"
                                checked={node.config?.allowPartialPick || false}
                                onChange={e => onConfigChange('allowPartialPick', e.target.checked)} />
                            Allow partial pick
                        </label>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Priority threshold</label>
                            <select className="w-full text-sm p-2 border border-gray-300 rounded"
                                value={node.config?.priorityThreshold || 'NORMAL'}
                                onChange={e => onConfigChange('priorityThreshold', e.target.value)}>
                                <option value="NORMAL">Normal</option>
                                <option value="HIGH">High</option>
                                <option value="URGENT">Urgent only</option>
                            </select>
                        </div>
                    </>
                )}

                {node.type === 'PACK' && (
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input type="checkbox" className="h-4 w-4 rounded border-gray-300"
                            checked={node.config?.requireWeightCheck || false}
                            onChange={e => onConfigChange('requireWeightCheck', e.target.checked)} />
                        Require weight verification
                    </label>
                )}

                {node.type === 'SHIP' && (
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Carrier cut-off label</label>
                        <input type="text" className="w-full text-sm p-2 border border-gray-300 rounded"
                            placeholder="e.g. FedEx 14:00"
                            value={node.config?.carrierCutoff || ''}
                            onChange={e => onConfigChange('carrierCutoff', e.target.value)} />
                    </div>
                )}

                {node.type === 'CROSS_DOCK' && (
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Destination dock</label>
                        <input type="text" className="w-full text-sm p-2 border border-gray-300 rounded"
                            placeholder="e.g. DOCK-3"
                            value={node.config?.destinationDock || ''}
                            onChange={e => onConfigChange('destinationDock', e.target.value)} />
                    </div>
                )}

                <div>
                    <label className="block text-xs text-gray-500 mb-1">Target location ID (optional)</label>
                    <input type="text" className="w-full text-sm p-2 border border-gray-300 rounded"
                        placeholder="e.g. loc-1234…"
                        value={node.config?.locationId || node.config?.sourceLocationId || ''}
                        onChange={e => {
                            if (node.isStart) onConfigChange('sourceLocationId', e.target.value);
                            else onConfigChange('locationId', e.target.value);
                        }} />
                </div>
            </div>

            <hr className="border-gray-200" />

            {/* ── Outgoing connections ─────────────────────────────────── */}
            <div>
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Outgoing connections</h3>
                <ul className="space-y-1 mb-3">
                    {transitions.filter(t => t.fromStepId === node.id).map(t => {
                        const toNode = steps.find(s => s.id === t.toStepId);
                        return (
                            <li key={t.id || t.toStepId} className="flex justify-between items-center text-xs bg-gray-50 p-1.5 border rounded">
                                <span className="text-gray-700">→ {toNode?.name || 'Unknown'}</span>
                                <button onClick={() => onSetTransitions(transitions.filter(x => x !== t))}
                                    className="text-red-500 hover:text-red-700 font-bold px-1">×</button>
                            </li>
                        );
                    })}
                </ul>
                <select
                    className="w-full text-xs p-2 border border-gray-300 rounded"
                    onChange={e => {
                        if (!e.target.value) return;
                        onSetTransitions([...transitions, { fromStepId: node.id, toStepId: e.target.value, condition: null }]);
                        e.target.value = '';
                    }}
                    defaultValue=""
                >
                    <option value="" disabled>+ Link to step…</option>
                    {steps.filter(s => s.id !== node.id).map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}

function RouteBuilderContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [template, setTemplate] = useState<any>(null);
    const [steps, setSteps] = useState<any[]>([]);
    const [transitions, setTransitions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Canvas interaction state
    const [selectedStep, setSelectedStep] = useState<string | null>(null);
    const [draggingStep, setDraggingStep] = useState<string | null>(null);

    // Connect-mode state
    const [connectMode, setConnectMode] = useState(false);
    const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
    const [ghostMouse, setGhostMouse] = useState<{ x: number; y: number } | null>(null);

    const canvasRef = useRef<HTMLDivElement>(null);
    const templateId = searchParams?.get('id');

    useEffect(() => {
        if (!templateId) { setLoading(false); return; }
        loadTemplate(templateId);
    }, [templateId]);

    // Cancel connect mode on Escape
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { setConnectMode(false); setConnectingFrom(null); setGhostMouse(null); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const loadTemplate = async (id: string) => {
        try {
            setLoading(true);
            const data = await getWorkflowTemplate(id);
            setTemplate(data);
            setSteps(data.steps || []);
            setTransitions(data.transitions || []);
        } catch {
            alert('Failed to load route template');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!template) return;
        setSaving(true);
        try {
            await updateWorkflowTemplate(template.id, { steps, transitions });
            loadTemplate(template.id);
        } catch {
            alert('Failed to save route graph');
        } finally {
            setSaving(false);
        }
    };

    const handleAddStepToCanvas = (typeId: string) => {
        const defaultX = 80 + (steps.length % 5) * 180;
        const defaultY = 80 + Math.floor(steps.length / 5) * 120;
        const newStep = {
            id: `new-${Date.now()}`,
            type: typeId,
            name: ROUTE_STEP_TYPES.find(t => t.id === typeId)?.name || 'Step',
            positionX: defaultX,
            positionY: defaultY,
            config: {},
            isStart: steps.length === 0,
            isEnd: false,
        };
        setSteps(prev => [...prev, newStep]);
        setSelectedStep(newStep.id);
    };

    const handleNodeClick = (e: React.MouseEvent, stepId: string) => {
        e.stopPropagation();
        if (connectMode) {
            if (!connectingFrom) {
                setConnectingFrom(stepId);
            } else if (connectingFrom !== stepId) {
                // Create the connection
                const alreadyExists = transitions.some(
                    t => t.fromStepId === connectingFrom && t.toStepId === stepId
                );
                if (!alreadyExists) {
                    setTransitions(prev => [...prev, { fromStepId: connectingFrom, toStepId: stepId, condition: null }]);
                }
                setConnectingFrom(null);
                setGhostMouse(null);
            }
        } else {
            setSelectedStep(stepId);
        }
    };

    const handleNodeMouseDown = (e: React.MouseEvent, stepId: string) => {
        if (connectMode) return; // don't drag in connect mode
        e.stopPropagation();
        setSelectedStep(stepId);
        setDraggingStep(stepId);
    };

    const handleCanvasMouseMove = (e: React.MouseEvent) => {
        if (connectMode && connectingFrom && canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            setGhostMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }
        if (!draggingStep || !canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left - NODE_W / 2;
        const y = e.clientY - rect.top - NODE_H / 2;
        setSteps(prev => prev.map(s =>
            s.id === draggingStep ? { ...s, positionX: Math.max(0, x), positionY: Math.max(0, y) } : s
        ));
    };

    const handleCanvasMouseUp = () => setDraggingStep(null);

    const handleCanvasClick = () => {
        if (!connectMode) setSelectedStep(null);
    };

    const deleteSelectedStep = () => {
        if (!selectedStep) return;
        setSteps(prev => prev.filter(s => s.id !== selectedStep));
        setTransitions(prev => prev.filter(t => t.fromStepId !== selectedStep && t.toStepId !== selectedStep));
        setSelectedStep(null);
    };

    const updateStepConfig = (key: string, value: any) => {
        setSteps(prev => prev.map(s =>
            s.id === selectedStep ? { ...s, config: { ...s.config, [key]: value } } : s
        ));
    };

    const activeNode = steps.find(s => s.id === selectedStep);

    // Compute arrow endpoint near node border
    const arrowEndpoint = (x1: number, y1: number, x2: number, y2: number) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const offsetX = (dx / len) * (NODE_W / 2 + 8);
        const offsetY = (dy / len) * (NODE_H / 2 + 8);
        return { x: x2 - offsetX, y: y2 - offsetY };
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Route Builder…</div>;
    if (!template) return <div className="p-8 text-center text-red-500">Route template not found.</div>;

    const connectingFromNode = steps.find(s => s.id === connectingFrom);

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-gray-50 font-sans">
            {/* ── Toolbar ──────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-6 py-3 bg-white border-b shadow-sm z-10">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="sm" onClick={() => router.push('/inventory/routes')} className="text-gray-500">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Routes
                    </Button>
                    <div className="h-6 border-r border-gray-300" />
                    <div>
                        <h1 className="text-lg font-semibold text-gray-900">{template.name}</h1>
                        <p className="text-xs text-gray-500">v{template.version} · {template.status}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Connect-mode toggle */}
                    <button
                        onClick={() => { setConnectMode(m => !m); setConnectingFrom(null); setGhostMouse(null); }}
                        title="Toggle connect mode — click a source node then a target node to draw an arrow"
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium border transition-colors
                            ${connectMode
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                    >
                        <GitMerge className="w-4 h-4" />
                        {connectMode
                            ? connectingFrom ? 'Click target node…' : 'Click source node…'
                            : 'Connect'}
                    </button>

                    <Button size="sm" onClick={handleSave} disabled={saving}
                        className="bg-blue-600 hover:bg-blue-700 text-white" id="save-route-btn">
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Saving…' : 'Save'}
                    </Button>

                    <Button variant="outline" size="sm" id="validate-route-btn"
                        onClick={async () => {
                            try {
                                const res = await validateWorkflowTemplate(template.id);
                                if (res.valid) alert('Route graph is valid!');
                                else alert('Invalid: ' + res.errors.join(', '));
                            } catch (e: any) { alert('Validation failed: ' + e.message); }
                        }}>
                        <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                        Validate
                    </Button>

                    {template.status === 'DRAFT' && (
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" id="activate-route-btn"
                            onClick={async () => {
                                try {
                                    await activateWorkflowTemplate(template.id);
                                    alert('Route activated!');
                                    loadTemplate(template.id);
                                } catch (e: any) { alert('Activation failed: ' + e.message); }
                            }}>
                            <Play className="w-4 h-4 mr-2" />
                            Activate
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* ── Step palette ─────────────────────────────────────── */}
                <div className="w-56 bg-white border-r flex flex-col shadow-sm">
                    <div className="p-3 border-b bg-gray-50">
                        <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Step Types</h2>
                        <p className="text-[10px] text-gray-400 mt-0.5">Click to add to canvas</p>
                    </div>
                    <div className="p-3 overflow-y-auto space-y-2">
                        {ROUTE_STEP_TYPES.map(type => (
                            <div key={type.id}
                                onClick={() => handleAddStepToCanvas(type.id)}
                                className={`p-2.5 rounded border cursor-pointer hover:shadow hover:ring-2 hover:ring-blue-100 transition-all select-none ${type.color}`}>
                                <span className="text-xs font-semibold text-gray-800 block">{type.name}</span>
                                <span className="text-[10px] text-gray-500 mt-0.5 block leading-tight">{type.hint}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Canvas ───────────────────────────────────────────── */}
                <div
                    className={`flex-1 relative overflow-auto bg-slate-50 ${connectMode ? (connectingFrom ? 'cursor-crosshair' : 'cursor-cell') : ''}`}
                    ref={canvasRef}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseUp}
                    onClick={handleCanvasClick}
                    style={{ minWidth: 600, minHeight: 500 }}
                >
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        <defs>
                            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
                            </marker>
                            <marker id="arrowhead-ghost" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
                            </marker>
                        </defs>

                        {/* Saved transitions */}
                        {transitions.map((t, i) => {
                            const from = steps.find(s => s.id === t.fromStepId);
                            const to = steps.find(s => s.id === t.toStepId);
                            if (!from || !to) return null;
                            const x1 = from.positionX + NODE_W / 2;
                            const y1 = from.positionY + NODE_H / 2;
                            const x2 = to.positionX + NODE_W / 2;
                            const y2 = to.positionY + NODE_H / 2;
                            const ep = arrowEndpoint(x1, y1, x2, y2);
                            const cx = (x1 + x2) / 2;
                            const cy = (y1 + y2) / 2 - 30;
                            return (
                                <path key={t.id || `tr-${i}`}
                                    d={`M ${x1} ${y1} Q ${cx} ${cy} ${ep.x} ${ep.y}`}
                                    fill="none" stroke="#9ca3af" strokeWidth="2"
                                    markerEnd="url(#arrowhead)" />
                            );
                        })}

                        {/* Ghost line while connecting */}
                        {connectMode && connectingFrom && connectingFromNode && ghostMouse && (
                            <line
                                x1={connectingFromNode.positionX + NODE_W / 2}
                                y1={connectingFromNode.positionY + NODE_H / 2}
                                x2={ghostMouse.x}
                                y2={ghostMouse.y}
                                stroke="#3b82f6" strokeWidth="2" strokeDasharray="6 3"
                                markerEnd="url(#arrowhead-ghost)" />
                        )}
                    </svg>

                    {/* Step nodes */}
                    {steps.map(step => {
                        const typeInfo = ROUTE_STEP_TYPES.find(t => t.id === step.type) || { color: 'bg-white border-gray-300' };
                        const isSelected = selectedStep === step.id;
                        const isConnectSource = connectingFrom === step.id;

                        return (
                            <div key={step.id}
                                onMouseDown={e => handleNodeMouseDown(e, step.id)}
                                onClick={e => { e.stopPropagation(); handleNodeClick(e, step.id); }}
                                className={`absolute rounded border-2 shadow-sm select-none transition-shadow
                                    ${typeInfo.color}
                                    ${isSelected && !connectMode ? 'ring-2 ring-blue-500 shadow-md' : ''}
                                    ${isConnectSource ? 'ring-2 ring-blue-400 ring-offset-1 shadow-md' : ''}
                                    ${connectMode ? 'cursor-pointer hover:shadow-md' : 'cursor-grab active:cursor-grabbing'}
                                    ${step.isStart ? 'border-l-4 border-l-green-500' : ''}
                                    ${step.isEnd ? 'border-r-4 border-r-red-500' : ''}
                                `}
                                style={{
                                    left: step.positionX,
                                    top: step.positionY,
                                    width: NODE_W,
                                    minHeight: NODE_H,
                                    transition: draggingStep === step.id ? 'none' : 'box-shadow 0.15s',
                                }}
                            >
                                <div className="px-3 py-2">
                                    <div className="text-xs font-bold text-gray-800 leading-tight line-clamp-2">{step.name}</div>
                                    <div className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wide">{step.type.replace(/_/g, ' ')}</div>
                                    {isConnectSource && (
                                        <div className="text-[9px] text-blue-600 font-semibold mt-0.5">SOURCE — click target</div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {steps.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <p className="text-gray-400 text-sm">Click a step type on the left to add it to the canvas.</p>
                        </div>
                    )}
                </div>

                {/* ── Properties panel ─────────────────────────────────── */}
                <div className="w-72 bg-white border-l flex flex-col shadow-sm">
                    <div className="p-3 border-b bg-gray-50 flex justify-between items-center">
                        <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Properties</h2>
                        {activeNode && !connectMode && (
                            <Button variant="ghost" size="sm" onClick={deleteSelectedStep}
                                className="text-red-600 hover:bg-red-50 h-7 w-7 p-0">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                    <div className="p-4 overflow-y-auto flex-1">
                        {connectMode ? (
                            <div className="text-center text-xs text-blue-600 mt-8 space-y-2">
                                <GitMerge className="w-8 h-8 mx-auto text-blue-400" />
                                <p className="font-semibold">Connect Mode active</p>
                                <p className="text-gray-500">{connectingFrom ? 'Now click the destination node to draw an arrow.' : 'Click the source node first.'}</p>
                                <p className="text-gray-400 mt-4">Press <kbd className="bg-gray-100 px-1 py-0.5 rounded text-[10px] font-mono">Esc</kbd> to exit.</p>
                            </div>
                        ) : !activeNode ? (
                            <div className="text-center text-xs text-gray-400 mt-10">
                                Select a node on the canvas to edit its properties.
                            </div>
                        ) : (
                            <StepConfigPanel
                                node={activeNode}
                                steps={steps}
                                transitions={transitions}
                                onConfigChange={updateStepConfig}
                                onNameChange={name => setSteps(prev => prev.map(s => s.id === activeNode.id ? { ...s, name } : s))}
                                onFlagChange={(key, value) => setSteps(prev => prev.map(s => s.id === activeNode.id ? { ...s, [key]: value } : s))}
                                onSetTransitions={setTransitions}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function RouteBuilderPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading…</div>}>
            <RouteBuilderContent />
        </Suspense>
    );
}
