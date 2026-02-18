'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/auth-provider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { api } from '@/lib/api';
import { Plus, Edit, Trash2, FolderOpen, Power, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await api.categories.list();
      setCategories(response.data);
    } catch (error) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    // Check for duplicate category name (case-insensitive)
    const duplicateCategory = categories.find(cat => 
      cat.name.toLowerCase() === formData.name.trim().toLowerCase() && 
      cat.id !== editingCategory?.id
    );

    if (duplicateCategory) {
      toast.error(`Category "${formData.name}" already exists`);
      return;
    }

    try {
      if (editingCategory) {
        await api.categories.update(editingCategory.id, formData);
        toast.success('Category updated successfully!');
      } else {
        await api.categories.create(formData);
        toast.success('Category created successfully!');
      }
      
      resetForm();
      await loadCategories();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Failed to save category';
      toast.error(errorMessage);
    }
  };

  const handleEdit = (category: any) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      return;
    }

    try {
      await api.categories.delete(id);
      toast.success('Category deleted successfully!');
      await loadCategories();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Failed to delete category';
      toast.error(errorMessage);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await api.categories.toggleStatus(id);
      toast.success('Category status updated!');
      await loadCategories();
    } catch (error) {
      toast.error('Failed to update category status');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
    });
    setEditingCategory(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center h-96">
            <div className="text-lg text-gray-900">Loading...</div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
              <p className="text-gray-600 mt-1">Organize your items into categories</p>
            </div>
            {!showForm && (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            )}
          </div>

          {/* Add/Edit Form */}
          {showForm && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {editingCategory ? 'Edit Category' : 'Add New Category'}
                  </CardTitle>
                  <button
                    onClick={resetForm}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Category Name *
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g., Beverages, Main Course, Desserts"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Description
                      </label>
                      <Input
                        type="text"
                        placeholder="Optional description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit">
                      {editingCategory ? 'Update Category' : 'Create Category'}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Categories List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FolderOpen className="h-5 w-5 mr-2" />
                All Categories ({categories.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {categories.length === 0 ? (
                <div className="text-center py-12">
                  <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No categories yet</p>
                  <Button onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Category
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map((category) => (
                        <TableRow key={category.id}>
                          <TableCell className="font-medium text-gray-900">
                            <div className="flex items-center">
                              <FolderOpen className="h-4 w-4 mr-2 text-blue-600" />
                              {category.name}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {category.description || '-'}
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {category._count?.items || 0} items
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => handleToggleStatus(category.id)}
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                category.isActive
                                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                              }`}
                            >
                              <Power className="h-3 w-3 mr-1" />
                              {category.isActive ? 'Active' : 'Inactive'}
                            </button>
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {new Date(category.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleEdit(category)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                title="Edit category"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(category.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                title="Delete category"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Box */}
          <Card>
            <CardContent className="pt-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">💡 Category Tips</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Categories help organize your items for easier management</li>
                  <li>• Common categories: Beverages, Appetizers, Main Course, Desserts, etc.</li>
                  <li>• Inactive categories won't appear in item creation forms</li>
                  <li>• You cannot delete categories that have items assigned to them</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
