import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Item {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  barcode: string | null;
  category_id: string | null;
  unit_of_measure: string | null;
  supplier_name: string | null;
  warehouse_location: string | null;
  min_stock_level: number | null;
  max_stock_level: number | null;
  image_url: string | null;
  price: number | null;
}

interface EditItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Item | null;
  categories: Category[];
  onSuccess: () => void;
}

export function EditItemDialog({ open, onOpenChange, item, categories, onSuccess }: EditItemDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    barcode: '',
    category_id: '',
    unit_of_measure: 'pcs',
    supplier_name: '',
    warehouse_location: '',
    min_stock_level: '10',
    max_stock_level: '1000',
    price: '0',
  });

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        description: item.description || '',
        sku: item.sku || '',
        barcode: item.barcode || '',
        category_id: item.category_id || '',
        unit_of_measure: item.unit_of_measure || 'pcs',
        supplier_name: item.supplier_name || '',
        warehouse_location: item.warehouse_location || '',
        min_stock_level: String(item.min_stock_level || 10),
        max_stock_level: String(item.max_stock_level || 1000),
        price: String(item.price || 0),
      });
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Item name is required');
      return;
    }

    if (!item) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('items')
        .update({
          name: formData.name,
          description: formData.description || null,
          sku: formData.sku || null,
          barcode: formData.barcode || null,
          category_id: formData.category_id || null,
          unit_of_measure: formData.unit_of_measure,
          supplier_name: formData.supplier_name || null,
          warehouse_location: formData.warehouse_location || null,
          min_stock_level: parseInt(formData.min_stock_level) || 0,
          max_stock_level: parseInt(formData.max_stock_level) || 1000,
          price: parseFloat(formData.price) || 0,
        })
        .eq('id', item.id);

      if (error) throw error;

      toast.success('Item updated successfully');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Edit Item</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Item name"
              className="h-12 rounded-xl bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Item description"
              rows={2}
              className="rounded-xl bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="sku" className="text-sm font-medium">SKU</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="SKU-001"
                className="h-12 rounded-xl bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="barcode" className="text-sm font-medium">Barcode</Label>
              <Input
                id="barcode"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                placeholder="123456789"
                className="h-12 rounded-xl bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-medium">Category</Label>
              <Select
                value={formData.category_id}
                onValueChange={(v) => setFormData({ ...formData, category_id: v })}
              >
                <SelectTrigger className="h-12 rounded-xl bg-muted/50 border-0">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id} className="rounded-lg">
                      <span className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit" className="text-sm font-medium">Unit</Label>
              <Select
                value={formData.unit_of_measure}
                onValueChange={(v) => setFormData({ ...formData, unit_of_measure: v })}
              >
                <SelectTrigger className="h-12 rounded-xl bg-muted/50 border-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="pcs" className="rounded-lg">Pieces</SelectItem>
                  <SelectItem value="kg" className="rounded-lg">Kilograms</SelectItem>
                  <SelectItem value="ltr" className="rounded-lg">Liters</SelectItem>
                  <SelectItem value="box" className="rounded-lg">Boxes</SelectItem>
                  <SelectItem value="pack" className="rounded-lg">Packs</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price" className="text-sm font-medium">Price</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="0.00"
              className="h-12 rounded-xl bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier" className="text-sm font-medium">Supplier</Label>
            <Input
              id="supplier"
              value={formData.supplier_name}
              onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
              placeholder="Supplier name"
              className="h-12 rounded-xl bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="text-sm font-medium">Warehouse Location</Label>
            <Input
              id="location"
              value={formData.warehouse_location}
              onChange={(e) => setFormData({ ...formData, warehouse_location: e.target.value })}
              placeholder="e.g., Aisle A, Shelf 3"
              className="h-12 rounded-xl bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="min_stock" className="text-sm font-medium">Min Stock Level</Label>
              <Input
                id="min_stock"
                type="number"
                value={formData.min_stock_level}
                onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
                className="h-12 rounded-xl bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_stock" className="text-sm font-medium">Max Stock Level</Label>
              <Input
                id="max_stock"
                type="number"
                value={formData.max_stock_level}
                onChange={(e) => setFormData({ ...formData, max_stock_level: e.target.value })}
                className="h-12 rounded-xl bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-12 rounded-xl font-semibold"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1 h-12 rounded-xl font-semibold shadow-lg shadow-primary/25"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
