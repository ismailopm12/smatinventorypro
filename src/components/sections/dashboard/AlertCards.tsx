import { AlertTriangle, Clock, Package } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface LowStockItem {
  id: string;
  name: string;
  min_stock_level: number;
  image_url?: string | null;
  batches: { quantity: number }[];
}

interface ExpiringItem {
  id: string;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  items: {
    name: string;
    image_url: string | null;
  } | null;
}

interface AlertCardsProps {
  lowStockItems: LowStockItem[];
  expiringItems: ExpiringItem[];
}

export function AlertCards({ lowStockItems, expiringItems }: AlertCardsProps) {
  if (lowStockItems.length === 0 && expiringItems.length === 0) {
    return (
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 dark:border-emerald-900/50">
        <CardContent className="p-6 text-center">
          <div className="w-12 h-12 mx-auto bg-emerald-100 dark:bg-emerald-900/50 rounded-xl flex items-center justify-center mb-3">
            <Package className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="font-medium text-emerald-700 dark:text-emerald-300">All Good!</p>
          <p className="text-sm text-emerald-600/70 dark:text-emerald-400/70 mt-1">
            No alerts at the moment
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-900/50 overflow-hidden">
          <CardHeader className="pb-2 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="p-1.5 bg-amber-500 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-white" />
              </div>
              <span className="text-amber-700 dark:text-amber-300">Low Stock Alert</span>
              <span className="ml-auto text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full font-semibold">
                {lowStockItems.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="w-full">
              <div className="flex gap-3 p-4">
                {lowStockItems.slice(0, 5).map((item) => {
                  const totalStock = item.batches?.reduce((sum: number, b: { quantity: number }) => sum + b.quantity, 0) || 0;
                  return (
                    <div
                      key={item.id}
                      className="flex-shrink-0 w-28 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-100 dark:border-amber-900/50"
                    >
                      <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-lg flex items-center justify-center mb-2 overflow-hidden">
                        {item.image_url ? (
                          <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        )}
                      </div>
                      <p className="text-xs font-medium truncate text-foreground">{item.name}</p>
                      <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{totalStock}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Min: {item.min_stock_level}
                      </p>
                    </div>
                  );
                })}
                {lowStockItems.length > 5 && (
                  <div className="flex-shrink-0 w-20 p-3 bg-amber-100 dark:bg-amber-900/50 rounded-xl flex items-center justify-center">
                    <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                      +{lowStockItems.length - 5}
                    </p>
                  </div>
                )}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Expiring Soon Alerts */}
      {expiringItems.length > 0 && (
        <Card className="border-rose-200 dark:border-rose-900/50 overflow-hidden">
          <CardHeader className="pb-2 bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="p-1.5 bg-rose-500 rounded-lg">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <span className="text-rose-700 dark:text-rose-300">Expiring Soon</span>
              <span className="ml-auto text-xs bg-rose-500 text-white px-2 py-0.5 rounded-full font-semibold">
                {expiringItems.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="w-full">
              <div className="flex gap-3 p-4">
                {expiringItems.slice(0, 5).map((batch) => {
                  const daysLeft = Math.ceil(
                    (new Date(batch.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                  );
                  return (
                    <div
                      key={batch.id}
                      className="flex-shrink-0 w-28 p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-100 dark:border-rose-900/50"
                    >
                      <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/50 rounded-lg flex items-center justify-center mb-2 overflow-hidden">
                        {batch.items?.image_url ? (
                          <img src={batch.items.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                        )}
                      </div>
                      <p className="text-xs font-medium truncate text-foreground">
                        {batch.items?.name || 'Unknown'}
                      </p>
                      <p className={cn(
                        "text-lg font-bold",
                        daysLeft <= 7 ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400"
                      )}>
                        {daysLeft}d
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {format(new Date(batch.expiry_date), 'MMM d')}
                      </p>
                    </div>
                  );
                })}
                {expiringItems.length > 5 && (
                  <div className="flex-shrink-0 w-20 p-3 bg-rose-100 dark:bg-rose-900/50 rounded-xl flex items-center justify-center">
                    <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
                      +{expiringItems.length - 5}
                    </p>
                  </div>
                )}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}