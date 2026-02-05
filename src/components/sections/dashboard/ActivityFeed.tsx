import { formatDistanceToNow } from 'date-fns';
import { ArrowUpCircle, ArrowDownCircle, Settings2, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Transaction {
  id: string;
  transaction_type: string;
  quantity: number;
  created_at: string;
  notes: string | null;
  items: {
    name: string;
    image_url: string | null;
  } | null;
  batches: {
    batch_number: string;
  } | null;
}

interface ActivityFeedProps {
  transactions: Transaction[];
}

export function ActivityFeed({ transactions }: ActivityFeedProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="w-14 h-14 mx-auto bg-muted rounded-2xl flex items-center justify-center mb-3">
          <Package className="w-7 h-7 text-muted-foreground" />
        </div>
        <p className="font-medium text-muted-foreground">No recent activity</p>
        <p className="text-sm text-muted-foreground/70 mt-1">Stock movements will appear here</p>
      </div>
    );
  }

  const getIconAndColor = (type: string) => {
    switch (type) {
      case 'stock_in':
        return {
          icon: <ArrowUpCircle className="w-5 h-5" />,
          bg: 'bg-emerald-100 dark:bg-emerald-900/50',
          text: 'text-emerald-600 dark:text-emerald-400',
        };
      case 'stock_out':
        return {
          icon: <ArrowDownCircle className="w-5 h-5" />,
          bg: 'bg-rose-100 dark:bg-rose-900/50',
          text: 'text-rose-600 dark:text-rose-400',
        };
      default:
        return {
          icon: <Settings2 className="w-5 h-5" />,
          bg: 'bg-blue-100 dark:bg-blue-900/50',
          text: 'text-blue-600 dark:text-blue-400',
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

  return (
    <div className="space-y-2">
      {transactions.map((transaction, index) => {
        const { icon, bg, text } = getIconAndColor(transaction.transaction_type);
        return (
          <div
            key={transaction.id}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl transition-colors",
              "bg-gradient-to-r from-muted/50 to-transparent hover:from-muted"
            )}
          >
            <div className={cn("flex-shrink-0 p-2 rounded-xl", bg, text)}>
              {icon}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm truncate">
                  {transaction.items?.name || 'Unknown Item'}
                </p>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
                  transaction.transaction_type === 'stock_in' 
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                    : "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300"
                )}>
                  {getLabel(transaction.transaction_type)}
                </span>
              </div>
              {transaction.batches?.batch_number && (
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  {transaction.batches.batch_number}
                </p>
              )}
            </div>

            <div className="text-right flex-shrink-0">
              <span
                className={cn(
                  'text-lg font-bold',
                  transaction.transaction_type === 'stock_in' 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : 'text-rose-600 dark:text-rose-400'
                )}
              >
                {transaction.transaction_type === 'stock_in' ? '+' : '−'}
                {Math.abs(Number(transaction.quantity)).toFixed(3).replace(/\.?0+$/, '')}
              </span>
              <p className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(transaction.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}