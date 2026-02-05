import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Search, Filter, ArrowUpCircle, ArrowDownCircle, Settings2, Calendar, History, Package, TrendingUp, TrendingDown, Trash2, MoreVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type TransactionType = 'all' | 'stock_in' | 'stock_out' | 'adjustment';

export function HistorySection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [transactionType, setTransactionType] = useState<TransactionType>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading, refetch } = useQuery({
    queryKey: ['transactions-history', transactionType, searchQuery, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select('*, items(name, image_url, sku), batches(batch_number)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (transactionType !== 'all') {
        query = query.eq('transaction_type', transactionType);
      }

      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }

      if (dateTo) {
        query = query.lte('created_at', `${dateTo}T23:59:59`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Client-side search filtering
      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        return (data || []).filter(
          (t) =>
            t.items?.name?.toLowerCase().includes(lowerQuery) ||
            t.batches?.batch_number?.toLowerCase().includes(lowerQuery) ||
            t.notes?.toLowerCase().includes(lowerQuery)
        );
      }

      return data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Transaction deleted');
      queryClient.invalidateQueries({ queryKey: ['transactions-history'] });
      refetch();
    },
    onError: (error: any) => {
      toast.error('Failed to delete', { description: error.message });
    },
  });

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId);
      setDeleteId(null);
    }
  };

  const getIconAndStyle = (type: string) => {
    switch (type) {
      case 'stock_in':
        return {
          icon: <ArrowUpCircle className="w-5 h-5" />,
          bg: 'bg-emerald-100 dark:bg-emerald-900/50',
          text: 'text-emerald-600 dark:text-emerald-400',
          badge: 'bg-emerald-500 text-white',
        };
      case 'stock_out':
        return {
          icon: <ArrowDownCircle className="w-5 h-5" />,
          bg: 'bg-rose-100 dark:bg-rose-900/50',
          text: 'text-rose-600 dark:text-rose-400',
          badge: 'bg-rose-500 text-white',
        };
      default:
        return {
          icon: <Settings2 className="w-5 h-5" />,
          bg: 'bg-blue-100 dark:bg-blue-900/50',
          text: 'text-blue-600 dark:text-blue-400',
          badge: 'bg-blue-500 text-white',
        };
    }
  };

  const getLabel = (type: string) => {
    switch (type) {
      case 'stock_in':
        return 'IN';
      case 'stock_out':
        return 'OUT';
      default:
        return 'ADJ';
    }
  };

  const hasFilters = dateFrom || dateTo;

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-primary to-violet-500 rounded-2xl shadow-lg shadow-primary/25">
            <History className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">History</h1>
            <p className="text-xs text-muted-foreground">{transactions.length} movements</p>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-2 animate-fade-in" style={{ animationDelay: '50ms' }}>
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by item, batch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-12 rounded-2xl bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary shadow-inner text-sm"
          />
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button 
              variant="outline" 
              size="icon"
              className={cn(
                "h-12 w-12 rounded-2xl border-0 bg-muted/50 shadow-inner touch-feedback",
                hasFilters && "bg-primary/10 ring-2 ring-primary"
              )}
            >
              <Filter className={cn("w-4 h-4", hasFilters && "text-primary")} />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto rounded-t-3xl border-0">
            <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto mt-1 mb-4" />
            <SheetHeader>
              <SheetTitle className="text-xl font-bold">Filter History</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs font-semibold">From Date</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="h-12 rounded-xl bg-muted/50 border-0"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs font-semibold">To Date</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="h-12 rounded-xl bg-muted/50 border-0"
                  />
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full h-12 rounded-2xl font-semibold"
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                }}
              >
                Clear Filters
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Type Tabs */}
      <div className="flex gap-2 animate-fade-in" style={{ animationDelay: '100ms' }}>
        <button
          onClick={() => setTransactionType('all')}
          className={cn(
            "flex-1 py-3 px-3 rounded-2xl font-semibold text-sm transition-all touch-feedback",
            transactionType === 'all'
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
              : "bg-muted/60 text-muted-foreground hover:bg-muted"
          )}
        >
          All
        </button>
        <button
          onClick={() => setTransactionType('stock_in')}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-3 px-3 rounded-2xl font-semibold text-sm transition-all touch-feedback",
            transactionType === 'stock_in'
              ? "bg-gradient-to-br from-success to-emerald-500 text-white shadow-lg shadow-success/30"
              : "bg-muted/60 text-muted-foreground hover:bg-muted"
          )}
        >
          <TrendingUp className="w-4 h-4" />
          In
        </button>
        <button
          onClick={() => setTransactionType('stock_out')}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-3 px-3 rounded-2xl font-semibold text-sm transition-all touch-feedback",
            transactionType === 'stock_out'
              ? "bg-gradient-to-br from-destructive to-rose-500 text-white shadow-lg shadow-destructive/30"
              : "bg-muted/60 text-muted-foreground hover:bg-muted"
          )}
        >
          <TrendingDown className="w-4 h-4" />
          Out
        </button>
        <button
          onClick={() => setTransactionType('adjustment')}
          className={cn(
            "flex-1 py-3 px-3 rounded-2xl font-semibold text-sm transition-all touch-feedback",
            transactionType === 'adjustment'
              ? "bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30"
              : "bg-muted/60 text-muted-foreground hover:bg-muted"
          )}
        >
          Adj
        </button>
      </div>

      {/* Transaction List */}
      {isLoading ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground mt-4 font-medium">Loading history...</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-20 animate-fade-in">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-muted to-muted/50 rounded-3xl flex items-center justify-center mb-5 shadow-lg">
            <Package className="w-10 h-10 text-muted-foreground/50" />
          </div>
          <p className="text-lg font-semibold text-foreground">No transactions found</p>
          <p className="text-sm text-muted-foreground mt-1.5">
            {searchQuery || hasFilters ? 'Try different filters' : 'Stock movements will appear here'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((transaction, index) => {
            const { icon, bg, text, badge } = getIconAndStyle(transaction.transaction_type);
            return (
              <Card 
                key={transaction.id} 
                className="touch-feedback border-0 rounded-2xl shadow-lg overflow-hidden animate-fade-in bg-card"
                style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
              >
                <CardContent className="p-0">
                  <div className="flex items-stretch">
                    {/* Color bar */}
                    <div className={cn("w-1.5", transaction.transaction_type === 'stock_in' ? 'bg-gradient-to-b from-success to-emerald-400' : transaction.transaction_type === 'stock_out' ? 'bg-gradient-to-b from-destructive to-rose-400' : 'bg-gradient-to-b from-blue-500 to-cyan-400')} />
                    
                    <div className="flex-1 flex items-center gap-3 p-4">
                      <div className={cn("flex-shrink-0 p-2.5 rounded-2xl", bg, text)}>
                        {icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm truncate">
                            {transaction.items?.name || 'Unknown Item'}
                          </p>
                          <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold", badge)}>
                            {getLabel(transaction.transaction_type)}
                          </span>
                        </div>

                        {transaction.batches?.batch_number && (
                          <p className="text-xs text-muted-foreground font-mono mt-1">
                            {transaction.batches.batch_number}
                          </p>
                        )}

                        <div className="flex items-center gap-1.5 mt-1.5">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[11px] text-muted-foreground">
                            {format(new Date(transaction.created_at), 'MMM d, yyyy • h:mm a')}
                          </span>
                        </div>
                      </div>

                    <div className="text-right flex-shrink-0 flex items-center gap-2">
                      <div>
                        <span className={cn('text-2xl font-bold', text)}>
                          {transaction.transaction_type === 'stock_in' ? '+' : '−'}
                          {Math.abs(Number(transaction.quantity)).toFixed(3).replace(/\.?0+$/, '')}
                        </span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem 
                            onClick={() => handleDelete(transaction.id)}
                            className="text-destructive focus:text-destructive rounded-lg"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this transaction record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}