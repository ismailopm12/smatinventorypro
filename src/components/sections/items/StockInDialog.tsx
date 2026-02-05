import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Wand2, Calendar, Package, Loader2, Plus, Sparkles, CheckCircle2, Building2 } from 'lucide-react';
import { generateSequentialBatchNumber } from '@/lib/batch-utils';
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
import { QuantityInput } from '@/components/ui/quantity-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface Item {
  id: string;
  name: string;
  unit_of_measure: string;
}

interface StockInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Item;
  onSuccess: () => void;
}

// Helper to check if unit supports decimals
const supportsDecimals = (unit: string) => {
  return ['kg', 'ltr', 'g', 'ml', 'l', 'lb', 'oz'].includes(unit?.toLowerCase());
};

export function StockInDialog({ open, onOpenChange, item, onSuccess }: StockInDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [generatingBatch, setGeneratingBatch] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    batch_number: '',
    quantity: '',
    expiry_date: '',
    notes: '',
    warehouse_id: '',
  });

  const allowDecimals = supportsDecimals(item.unit_of_measure);

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

  // Auto-generate batch number when dialog opens
  useEffect(() => {
    if (open && !formData.batch_number) {
      handleGenerateBatch();
      // Set default warehouse
      const defaultWarehouse = warehouses.find(w => w.is_default);
      if (defaultWarehouse && !formData.warehouse_id) {
        setFormData(prev => ({ ...prev, warehouse_id: defaultWarehouse.id }));
      }
    }
    if (!open) {
      setShowSuccess(false);
    }
  }, [open, warehouses]);

  const handleGenerateBatch = async () => {
    setGeneratingBatch(true);
    try {
      const batchNumber = await generateSequentialBatchNumber(supabase, item.id);
      setFormData(prev => ({ ...prev, batch_number: batchNumber }));
    } catch (error) {
      console.error('Failed to generate batch number:', error);
    } finally {
      setGeneratingBatch(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.batch_number.trim()) {
      toast.error('Batch number is required');
      return;
    }
    
    const quantity = parseFloat(formData.quantity);
    
    if (!formData.quantity || isNaN(quantity) || quantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    setLoading(true);
    try {
      // Check if batch exists
      const { data: existingBatch } = await supabase
        .from('batches')
        .select('id, quantity')
        .eq('item_id', item.id)
        .eq('batch_number', formData.batch_number)
        .maybeSingle();

      let batchId: string;
      let previousQuantity = 0;
      let newQuantity = quantity;

      if (existingBatch) {
        // Update existing batch
        previousQuantity = Number(existingBatch.quantity);
        newQuantity = previousQuantity + quantity;
        
        const { error: updateError } = await supabase
          .from('batches')
          .update({ 
            quantity: newQuantity,
            expiry_date: formData.expiry_date || null,
          })
          .eq('id', existingBatch.id);

        if (updateError) throw updateError;
        batchId = existingBatch.id;
      } else {
        // Create new batch
        const { data: newBatch, error: batchError } = await supabase
          .from('batches')
          .insert({
            item_id: item.id,
            batch_number: formData.batch_number,
            quantity: quantity,
            expiry_date: formData.expiry_date || null,
            notes: formData.notes || null,
            created_by: user?.id,
            warehouse_id: formData.warehouse_id || null,
          })
          .select()
          .single();

        if (batchError) throw batchError;
        batchId = newBatch.id;
      }

      // Record transaction
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          item_id: item.id,
          batch_id: batchId,
          transaction_type: 'stock_in',
          quantity: quantity,
          previous_quantity: previousQuantity,
          new_quantity: newQuantity,
          notes: formData.notes || null,
          performed_by: user?.id,
        });

      if (txError) throw txError;

      // Show success animation
      setShowSuccess(true);
      
      // Format quantity for display
      const displayQty = allowDecimals ? quantity.toFixed(3).replace(/\.?0+$/, '') : quantity;
      toast.success(`Added ${displayQty} ${item.unit_of_measure} to stock`);
      
      setTimeout(() => {
        setFormData({ batch_number: '', quantity: '', expiry_date: '', notes: '', warehouse_id: '' });
        onSuccess();
      }, 800);
    } catch (error: any) {
      toast.error(error.message || 'Failed to add stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl border-0 shadow-2xl p-0 overflow-hidden animate-scale-in">
        {/* Success Overlay */}
        {showSuccess && (
          <div className="absolute inset-0 bg-success/95 z-50 flex flex-col items-center justify-center animate-fade-in">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-4 animate-scale-in">
              <CheckCircle2 className="w-12 h-12 text-white" />
            </div>
            <p className="text-white text-xl font-bold">Stock Added!</p>
          </div>
        )}

        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-success via-success to-emerald-600 p-6 pb-8">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-4 text-white">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm animate-fade-in">
                <Plus className="w-6 h-6" />
              </div>
              <div className="animate-fade-in" style={{ animationDelay: '50ms' }}>
                <span className="text-xl font-bold block">Stock In</span>
                <p className="text-sm font-normal text-white/80 mt-0.5">{item.name}</p>
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Form with overlap effect */}
        <div className="bg-background rounded-t-3xl -mt-4 p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2 animate-fade-in" style={{ animationDelay: '100ms' }}>
              <Label htmlFor="batch_number" className="text-sm font-semibold flex items-center gap-2">
                <Package className="w-4 h-4 text-muted-foreground" />
                Batch Number
              </Label>
              <div className="flex gap-2">
                <Input
                  id="batch_number"
                  value={formData.batch_number}
                  onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                  placeholder="e.g., BATCH-2026-02-04-001"
                  className="flex-1 h-12 rounded-xl bg-muted/50 border-0 font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleGenerateBatch}
                  disabled={generatingBatch}
                  title="Auto-generate batch number"
                  className="h-12 w-12 rounded-xl border-0 bg-muted/50 hover:bg-success/10 hover:text-success transition-colors touch-feedback"
                >
                  <Wand2 className={cn("w-4 h-4", generatingBatch && "animate-spin")} />
                </Button>
              </div>
            </div>

            <div className="space-y-2 animate-fade-in" style={{ animationDelay: '150ms' }}>
              <Label htmlFor="quantity" className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-muted-foreground" />
                Quantity ({item.unit_of_measure})
              </Label>
              <QuantityInput
                value={formData.quantity}
                onChange={(value) => setFormData({ ...formData, quantity: value })}
                allowDecimals={allowDecimals}
                placeholder={allowDecimals ? "e.g., 1.500" : "Enter quantity"}
                variant="success"
              />
              {allowDecimals && (
                <p className="text-xs text-muted-foreground text-center">
                  Supports decimal values (e.g., 1.5, 2.750)
                </p>
              )}
            </div>

            {/* Warehouse Selection */}
            {warehouses.length > 0 && (
              <div className="space-y-2 animate-fade-in" style={{ animationDelay: '175ms' }}>
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
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

            <div className="space-y-2 animate-fade-in" style={{ animationDelay: '200ms' }}>
              <Label htmlFor="expiry_date" className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                Expiry Date
              </Label>
              <Input
                id="expiry_date"
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                className="h-12 rounded-xl bg-muted/50 border-0"
              />
            </div>

            <div className="space-y-2 animate-fade-in" style={{ animationDelay: '250ms' }}>
              <Label htmlFor="notes" className="text-sm font-semibold">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes (supplier, purchase order, etc.)"
                rows={2}
                className="rounded-xl bg-muted/50 border-0 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-4 animate-fade-in" style={{ animationDelay: '300ms' }}>
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-14 rounded-2xl font-semibold border-2 touch-feedback"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1 h-14 rounded-2xl font-bold bg-gradient-to-r from-success to-emerald-600 hover:from-success/90 hover:to-emerald-600/90 text-white shadow-xl shadow-success/30 touch-feedback" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5 mr-2" />
                    Add Stock
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
