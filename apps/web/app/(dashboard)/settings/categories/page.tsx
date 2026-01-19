'use client';

import { useState, useEffect } from 'react';
import { fetchCategories, createCategory, deleteCategory } from '@/lib/api';
import { Trash2 } from 'lucide-react';

export default function CategoriesPage() {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        load();
    }, []);

    async function load() {
        try {
            const data = await fetchCategories();
            setCategories(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!newCategoryName) return;
        try {
            await createCategory({ name: newCategoryName, description });
            setNewCategoryName('');
            setDescription('');
            load();
        } catch (err) {
            alert('Failed to create category');
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure?')) return;
        try {
            await deleteCategory(id);
            load();
        } catch (err) {
            alert('Failed to delete category');
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <h1 className="text-2xl font-bold mb-6">Product Categories</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* List */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-lg font-medium mb-4">Existing Categories</h2>
                    {loading ? <p>Loading...</p> : (
                        <ul className="divide-y">
                            {categories.map(cat => (
                                <li key={cat.id} className="py-3 flex justify-between items-center">
                                    <div>
                                        <p className="font-medium">{cat.name}</p>
                                        <p className="text-sm text-gray-500">{cat.description}</p>
                                    </div>
                                    <button onClick={() => handleDelete(cat.id)} className="text-red-600 hover:text-red-800">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </li>
                            ))}
                            {categories.length === 0 && <p className="text-gray-500">No categories found.</p>}
                        </ul>
                    )}
                </div>

                {/* Create Form */}
                <div className="bg-white p-6 rounded-lg shadow h-fit">
                    <h2 className="text-lg font-medium mb-4">Add New Category</h2>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Name</label>
                            <input
                                type="text"
                                required
                                className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                                value={newCategoryName}
                                onChange={e => setNewCategoryName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Description</label>
                            <input
                                type="text"
                                className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                        >
                            Add Category
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
