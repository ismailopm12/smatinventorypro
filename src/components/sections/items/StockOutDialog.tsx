import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Package, Loader2, Minus, AlertTriangle, CheckCircle2, BoxSelect } from 'lucide-react';
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

interface Batch {
  id: string;
  batch_number: string;
  quantity: number;
  expiry_date: string | null;
}

interface Item {
  id: string;
  name: string;
  unit_of_measure: string;
  batches: Batch[];
}

interface StockOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Item;
  onSuccess: () => void;
}

// Helper to check if unit supports decimals
const supportsDecimals = (unit: string) => {
  return ['kg', 'ltr', 'g', 'ml', 'l', 'lb', 'oz'].includes(unit?.toLowerCase());
};

// Helper to format quantity for display
const formatQuantity = (qty: number, allowDecimals: boolean) => {
  if (allowDecimals) {
    return qty.toFixed(3).replace(/\.?0+$/, '');
  }
  return Math.floor(qty).toString();
};

export function StockOutDialog({ open, onOpenChange, item, onSuccess }: StockOutDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    batch_id: '',
    quantity: '',
    notes: '',
  });

  const allowDecimals = supportsDecimals(item.unit_of_measure);

  // Sort batches by expiry date (FIFO)
  const sortedBatches = [...(item.batches || [])]
    .filter(b => Number(b.quantity) > 0)
    .sort((a, b) => {
      if (!a.expiry_date) return 1;
      if (!b.expiry_date) return -1;
      return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
    });

  const selectedBatch = sortedBatches.find(b => b.id === formData.batch_id);
  const selectedBatchQty = selectedBatch ? Number(selectedBatch.quantity) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.batch_id) {
      toast.error('Please select a batch');
      return;
    }
    
    const quantity = parseFloat(formData.quantity);
    
    if (!formData.quantity || isNaN(quantity) || quantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    if (quantity > selectedBatchQty) {
      toast.error(`Cannot remove more than available (${formatQuantity(selectedBatchQty, allowDecimals)})`);
      return;
    }

    setLoading(true);
    try {
      const newQuantity = selectedBatchQty - quantity;

      // Update batch quantity
      const { error: updateError } = await supabase
        .from('batches')
        .update({ quantity: newQuantity })
        .eq('id', formData.batch_id);

      if (updateError) throw updateError;

      // Record transaction
      const { error: txError } = await supabase
        .from('transactions')
        .insert({
          item_id: item.id,
          batch_id: formData.batch_id,
          transaction_type: 'stock_out',
          quantity: -quantity,
          previous_quantity: selectedBatchQty,
          new_quantity: newQuantity,
          notes: formData.notes || null,
          performed_by: user?.id,
        });

      if (txError) throw txError;

      // Show success animation
      setShowSuccess(true);

      const displayQty = formatQuantity(quantity, allowDecimals);
      toast.success(`Removed ${displayQty} ${item.unit_of_measure} from stock`);
      
      setTimeout(() => {
        setFormData({ batch_id: '', quantity: '', notes: '' });
        setShowSuccess(false);
        onSuccess();
      }, 800);
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl border-0 shadow-2xl p-0 overflow-hidden animate-scale-in">
        {/* Success Overlay */}
        {showSuccess && (
          <div className="absolute inset-0 bg-destructive/95 z-50 flex flex-col items-center justify-center animate-fade-in">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-4 animate-scale-in">
              <CheckCircle2 className="w-12 h-12 text-white" />
            </div>
            <p className="text-white text-xl font-bold">Stock Removed!</p>
          </div>
        )}

        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-destructive via-destructive to-rose-600 p-6 pb-8">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-4 text-white">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm animate-fade-in">
                <Minus className="w-6 h-6" />
              </div>
              <div className="animate-fade-in" style={{ animationDelay: '50ms' }}>
                <span className="text-xl font-bold block">Stock Out</span>
                <p className="text-sm font-normal text-white/80 mt-0.5">{item.name}</p>
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Form with overlap effect */}
        <div className="bg-background rounded-t-3xl -mt-4 p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2 animate-fade-in" style={{ animationDelay: '100ms' }}>
              <Label className="text-sm font-semibold flex items-center gap-2">
                <BoxSelect className="w-4 h-4 text-muted-foreground" />
                Select Batch (FIFO recommended)
              </Label>
              <Select
                value={formData.batch_id}
                onValueChange={(v) => setFormData({ ...formData, batch_id: v })}
              >
                <SelectTrigger className="h-14 rounded-xl bg-muted/50 border-0">
                  <SelectValue placeholder="Choose a batch..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {sortedBatches.map((batch, index) => (
                    <SelectItem key={batch.id} value={batch.id} className="rounded-lg py-3">
                      <div className="flex items-center gap-2">
                        {index === 0 && (
                          <span className="text-[10px] bg-success/20 text-success px-2 py-0.5 rounded-full font-bold uppercase">
                            FIFO
                          </span>
                        )}
                        <span className="font-medium">{batch.batch_number}</span>
                        <span className="text-muted-foreground font-semibold">
                          ({formatQuantity(Number(batch.quantity), allowDecimals)} {item.unit_of_measure})
                        </span>
                        {batch.expiry_date && (
                          <span className="text-xs text-muted-foreground">
                            Exp: {format(new Date(batch.expiry_date), 'MMM d')}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedBatch && (
              <div className="p-4 bg-gradient-to-r from-muted/50 to-muted/30 rounded-2xl animate-fade-in border border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Available</p>
                    <p className="text-2xl font-bold text-success mt-0.5">
                      {formatQuantity(selectedBatchQty, allowDecimals)}
                      <span className="text-sm text-muted-foreground font-normal ml-1">{item.unit_of_measure}</span>
                    </p>
                  </div>
                  {selectedBatch.expiry_date && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Expires</p>
                      <p className="text-sm font-semibold mt-0.5">
                        {format(new Date(selectedBatch.expiry_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2 animate-fade-in" style={{ animationDelay: '150ms' }}>
              <Label htmlFor="quantity" className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                Quantity to Remove ({item.unit_of_measure})
              </Label>
              <QuantityInput
                value={formData.quantity}
                onChange={(value) => setFormData({ ...formData, quantity: value })}
                max={selectedBatchQty}
                allowDecimals={allowDecimals}
                placeholder={allowDecimals ? "e.g., 1.500" : "Enter quantity"}
                variant="destructive"
              />
              {allowDecimals && (
                <p className="text-xs text-muted-foreground text-center">
                  Supports decimal values (e.g., 1.5, 2.750)
                </p>
              )}
            </div>

            <div className="space-y-2 animate-fade-in" style={{ animationDelay: '200ms' }}>
              <Label htmlFor="notes" className="text-sm font-semibold">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes (e.g., order #, reason)"
                rows={2}
                className="rounded-xl bg-muted/50 border-0 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-4 animate-fade-in" style={{ animationDelay: '250ms' }}>
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
                className="flex-1 h-14 rounded-2xl font-bold bg-gradient-to-r from-destructive to-rose-600 hover:from-destructive/90 hover:to-rose-600/90 text-white shadow-xl shadow-destructive/30 touch-feedback" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Removing...
                  </>
                ) : (
                  <>
                    <Minus className="w-5 h-5 mr-2" />
                    Remove Stock
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
