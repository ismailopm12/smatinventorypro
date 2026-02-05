import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  color: string;
}

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
  onSuccess: () => void;
}

const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#f43f5e', // rose
];

export function CategoryDialog({ open, onOpenChange, category, onSuccess }: CategoryDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    color: '#3b82f6',
  });

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        color: category.color || '#3b82f6',
      });
    } else {
      setFormData({
        name: '',
        color: '#3b82f6',
      });
    }
  }, [category, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    setLoading(true);
    try {
      if (category) {
        // Update existing category
        const { error } = await supabase
          .from('categories')
          .update({
            name: formData.name,
            color: formData.color,
          })
          .eq('id', category.id);

        if (error) throw error;
        toast.success('Category updated successfully');
      } else {
        // Create new category
        const { error } = await supabase
          .from('categories')
          .insert({
            name: formData.name,
            color: formData.color,
          });

        if (error) throw error;
        toast.success('Category created successfully');
      }

      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!category) return;
    
    if (!confirm('Delete this category? Items will be uncategorized.')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', category.id);

      if (error) throw error;
      toast.success('Category deleted');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {category ? 'Edit Category' : 'New Category'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Electronics, Food, Hardware"
              className="font-medium"
            />
          </div>

          <div className="space-y-3">
            <Label>Color</Label>
            <div className="grid grid-cols-8 gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={cn(
                    'w-8 h-8 rounded-lg transition-all hover:scale-110',
                    formData.color === color && 'ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110'
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            
            {/* Preview */}
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: formData.color }}
              />
              <span className="font-medium">{formData.name || 'Category Name'}</span>
              <span
                className="ml-auto text-xs px-2 py-1 rounded-full text-white"
                style={{ backgroundColor: formData.color }}
              >
                Preview
              </span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            {category && (
              <Button
                type="button"
                variant="outline"
                className="text-destructive border-destructive/50 hover:bg-destructive/10"
                onClick={handleDelete}
                disabled={loading}
              >
                Delete
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Saving...' : category ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
