import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
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
import { Loader2, Camera, ImagePlus, X, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  color: string;
}

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onSuccess: () => void;
  initialBarcode?: string;
}

export function AddItemDialog({ open, onOpenChange, categories, onSuccess, initialBarcode = '' }: AddItemDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState(() => ({
    name: '',
    description: '',
    sku: '',
    barcode: initialBarcode,
    category_id: '',
    unit_of_measure: 'pcs',
    supplier_name: '',
    warehouse_location: '',
    min_stock_level: '10',
    max_stock_level: '1000',
    warehouse_id: '',
  }));

  // Fetch warehouses
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Update barcode when initialBarcode changes
  useEffect(() => {
    if (initialBarcode) {
      setFormData(prev => ({ ...prev, barcode: initialBarcode }));
    }
  }, [initialBarcode]);

  // Set default warehouse
  useEffect(() => {
    if (warehouses.length > 0 && !formData.warehouse_id) {
      const defaultWarehouse = warehouses.find((w: any) => w.is_default);
      if (defaultWarehouse) {
        setFormData(prev => ({ ...prev, warehouse_id: defaultWarehouse.id }));
      }
    }
  }, [warehouses]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image too large', { description: 'Max size is 5MB' });
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;
    setUploadingImage(true);
    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `items/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('item-images').upload(filePath, imageFile);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('item-images').getPublicUrl(filePath);
      return publicUrl;
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Item name is required');
      return;
    }

    setLoading(true);
    try {
      let imageUrl: string | null = null;
      if (imageFile) imageUrl = await uploadImage();

      const { error } = await supabase.from('items').insert({
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
        created_by: user?.id,
        image_url: imageUrl,
        warehouse_id: formData.warehouse_id || null,
      });

      if (error) throw error;

      toast.success('Item added successfully');
      setFormData({
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
              warehouse_id: '',
      });
      removeImage();
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border-0 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <ImagePlus className="w-5 h-5 text-primary" />
            </div>
            Add New Item
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Product Image</Label>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
            {imagePreview ? (
              <div className="relative">
                <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-2xl border-2 border-primary/20" />
                <button type="button" onClick={removeImage} className="absolute top-2 right-2 p-2 bg-destructive text-white rounded-xl shadow-lg touch-feedback">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "w-full h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2",
                  "bg-muted/30 border-muted-foreground/30 hover:bg-muted/50 hover:border-primary/50 transition-all duration-200 touch-feedback"
                )}
              >
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <Camera className="w-6 h-6 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground font-medium">Tap to add photo</span>
              </button>
            )}
          </div>

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
            <Label htmlFor="supplier" className="text-sm font-medium">Supplier</Label>
            <Input
              id="supplier"
              value={formData.supplier_name}
              onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
              placeholder="Supplier name"
              className="h-12 rounded-xl bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          {/* Warehouse Selection */}
          {warehouses.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Warehouse
              </Label>
              <Select
                value={formData.warehouse_id}
                onValueChange={(v) => setFormData({ ...formData, warehouse_id: v })}
              >
                <SelectTrigger className="h-12 rounded-xl bg-muted/50 border-0">
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {warehouses.map((warehouse: any) => (
                    <SelectItem key={warehouse.id} value={warehouse.id} className="rounded-lg">
                      <span className="flex items-center gap-2">
                        <Building2 className="w-3 h-3" />
                        {warehouse.name}
                        {warehouse.is_default && (
                          <span className="text-[10px] text-muted-foreground">(Default)</span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="location" className="text-sm font-medium">Location in Warehouse</Label>
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
              className="flex-1 h-12 rounded-2xl font-semibold"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1 h-12 rounded-2xl font-semibold shadow-lg shadow-primary/25"
              disabled={loading || uploadingImage}
            >
              {loading || uploadingImage ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {uploadingImage ? 'Uploading...' : 'Adding...'}
                </>
              ) : (
                'Add Item'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
