import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Trash2, AlertTriangle } from 'lucide-react';

interface DeleteItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string | null;
  itemName: string;
  onSuccess: () => void;
}

export function DeleteItemDialog({ open, onOpenChange, itemId, itemName, onSuccess }: DeleteItemDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!itemId) return;

    setLoading(true);
    try {
      // First delete related batches
      const { error: batchError } = await supabase
        .from('batches')
        .delete()
        .eq('item_id', itemId);

      if (batchError) throw batchError;

      // Then delete related transactions
      const { error: transactionError } = await supabase
        .from('transactions')
        .delete()
        .eq('item_id', itemId);

      if (transactionError) throw transactionError;

      // Finally delete the item
      const { error: itemError } = await supabase
        .from('items')
        .delete()
        .eq('id', itemId);

      if (itemError) throw itemError;

      toast.success('Item deleted successfully');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-2xl max-w-sm">
        <AlertDialogHeader className="text-center sm:text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>
          <AlertDialogTitle className="text-xl font-bold">Delete Item?</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            This will permanently delete <span className="font-semibold text-foreground">"{itemName}"</span> and all its batches and transaction history. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col mt-4">
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="w-full h-12 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold shadow-lg shadow-destructive/25"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Item
              </>
            )}
          </AlertDialogAction>
          <AlertDialogCancel className="w-full h-12 rounded-xl mt-0 font-semibold">
            Cancel
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
