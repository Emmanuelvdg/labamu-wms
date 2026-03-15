'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, Edit2, Play, Copy, Archive, ArrowRight, GitBranch } from 'lucide-react';
import { fetchWorkflowTemplates, createWorkflowTemplate, activateWorkflowTemplate, cloneWorkflowTemplate, deleteWorkflowTemplate } from '@/lib/api';

interface WorkflowTemplate {
    id: string;
    name: string;
    description: string;
    version: number;
    status: string;
    triggerType: string;
    updatedAt: string;
}

export default function WorkflowsPage() {
    const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await fetchWorkflowTemplates();
            setTemplates(data || []);
        } catch (err: any) {
            setError(err.message || 'Failed to load workflow templates');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleCreateNew = () => setShowCreateModal(true);

    const submitCreateNew = async () => {
        if (!newTemplateName) return;
        try {
            await createWorkflowTemplate({ name: newTemplateName, description: 'New workflow', triggerType: 'MANUAL' });
            setShowCreateModal(false);
            setNewTemplateName('');
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to create template');
        }
    };

    const handleActivate = async (id: string) => {
        // if (!confirm('Are you sure you want to activate this workflow?')) return;
        try {
            await activateWorkflowTemplate(id);
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to activate template');
        }
    };

    const handleClone = async (id: string) => {
        try {
            await cloneWorkflowTemplate(id);
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to clone template');
        }
    };

    const handleArchive = async (id: string) => {
        // if (!confirm('Are you sure you want to archive this workflow?')) return;
        try {
            await deleteWorkflowTemplate(id);
            loadData();
        } catch (err: any) {
            alert(err.message || 'Failed to archive template');
        }
    };

    const getStatusVariant = (status: string) => {
        if (status === 'ACTIVE') return 'bg-green-100 text-green-800 border-green-200';
        if (status === 'DRAFT') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        return 'bg-gray-100 text-gray-800 border-gray-200';
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center">
                        <GitBranch className="w-6 h-6 mr-2 text-blue-600" />
                        Workflow Templates
                    </h1>
                    <p className="text-gray-500">Manage and design your warehouse operational workflows.</p>
                </div>
                <Button onClick={handleCreateNew} className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    New Workflow
                </Button>
            </div>

            {error && <div className="p-4 mb-4 bg-red-50 text-red-600 rounded-md">{error}</div>}

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : templates.filter(t => t.status !== 'ARCHIVED').length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                        <GitBranch className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No templates yet</h3>
                    <p className="text-gray-500 mb-4">Create your first workflow template to start automating tasks.</p>
                    <Button onClick={handleCreateNew}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Template
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.filter(t => t.status !== 'ARCHIVED').map((template) => (
                        <Card key={template.id} className="flex flex-col border shadow-sm hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3 border-b">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            {template.name}
                                            <span className="text-xs font-normal bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200">
                                                v{template.version}
                                            </span>
                                        </CardTitle>
                                        <CardDescription className="line-clamp-2 mt-1 h-10">
                                            {template.description || 'No description provided'}
                                        </CardDescription>
                                    </div>
                                    <span className={`text-xs font-medium px-2.5 py-1 rounded border ${getStatusVariant(template.status)}`}>
                                        {template.status}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4 flex-1 flex flex-col justify-between">
                                <div className="space-y-2 mb-6">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Trigger:</span>
                                        <span className="font-medium">{template.triggerType}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Updated:</span>
                                        <span>{new Date(template.updatedAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-auto">
                                    <Link href={`/workflows/${template.id}/builder`} className="w-full">
                                        <Button variant="outline" className="w-full justify-center">
                                            <Edit2 className="w-4 h-4 mr-2" />
                                            Builder
                                        </Button>
                                    </Link>
                                    {template.status === 'DRAFT' && (
                                        <Button
                                            variant="outline"
                                            className="w-full justify-center text-green-600 hover:text-green-700 hover:bg-green-50"
                                            onClick={() => handleActivate(template.id)}
                                        >
                                            <Play className="w-4 h-4 mr-2" />
                                            Activate
                                        </Button>
                                    )}
                                    {template.status !== 'ARCHIVED' && (
                                        <Button
                                            variant="ghost"
                                            className="w-full justify-center"
                                            onClick={() => handleClone(template.id)}
                                        >
                                            <Copy className="w-4 h-4 mr-2" />
                                            Clone
                                        </Button>
                                    )}
                                    {template.status !== 'ARCHIVED' && (
                                        <Button
                                            variant="ghost"
                                            className="w-full justify-center text-red-600 hover:text-red-700 hover:bg-red-50 relative bottom-0"
                                            onClick={() => handleArchive(template.id)}
                                        >
                                            <Archive className="w-4 h-4 mr-2" />
                                            Archive
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-96 max-w-full">
                        <h2 className="text-xl font-bold mb-4">Create New Workflow</h2>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Workflow Name</label>
                            <input
                                type="text"
                                className="w-full border border-gray-300 rounded px-3 py-2 text-black"
                                value={newTemplateName}
                                onChange={e => setNewTemplateName(e.target.value)}
                                placeholder="Enter workflow name"
                                id="new-workflow-name-input"
                                autoFocus
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={submitCreateNew} id="submit-new-workflow-btn">Create</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
