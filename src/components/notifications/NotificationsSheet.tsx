import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle,
  Clock,
  PackagePlus,
  Check,
  CheckCheck,
  Package,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface NotificationsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LowStockItem {
  id: string;
  name: string;
  min_stock_level: number;
  image_url?: string | null;
  batches: { quantity: number }[];
}

interface ExpiringBatch {
  id: string;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  items: {
    id: string;
    name: string;
    image_url: string | null;
  } | null;
}

interface RecentTransaction {
  id: string;
  transaction_type: string;
  quantity: number;
  created_at: string;
  notes: string | null;
  items: {
    id: string;
    name: string;
    image_url: string | null;
  } | null;
  batches: {
    batch_number: string;
  } | null;
}

export function NotificationsSheet({ open, onOpenChange }: NotificationsSheetProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());

  // Fetch alert settings
  const { data: alertSettings } = useQuery({
    queryKey: ['alert-settings', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('alert_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data || {
        low_stock_enabled: true,
        low_stock_threshold: 10,
        expiry_enabled: true,
        expiry_warning_days: 30,
        stock_received_enabled: true,
      };
    },
    enabled: !!user?.id,
  });

  // Fetch low stock items
  const { data: lowStockItems = [] } = useQuery({
    queryKey: ['low-stock-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select('id, name, min_stock_level, image_url, batches(quantity)')
        .not('min_stock_level', 'is', null);
      
      if (error) throw error;
      
      return (data as LowStockItem[]).filter(item => {
        const totalStock = item.batches?.reduce((sum, b) => sum + b.quantity, 0) || 0;
        return totalStock < (item.min_stock_level || 0);
      });
    },
    enabled: alertSettings?.low_stock_enabled !== false,
  });

  // Fetch expiring items
  const { data: expiringItems = [] } = useQuery({
    queryKey: ['expiring-notifications', alertSettings?.expiry_warning_days],
    queryFn: async () => {
      const warningDays = alertSettings?.expiry_warning_days || 30;
      const warningDate = new Date();
      warningDate.setDate(warningDate.getDate() + warningDays);
      
      const { data, error } = await supabase
        .from('batches')
        .select('id, batch_number, expiry_date, quantity, items(id, name, image_url)')
        .not('expiry_date', 'is', null)
        .gt('quantity', 0)
        .lte('expiry_date', warningDate.toISOString().split('T')[0])
        .order('expiry_date', { ascending: true });
      
      if (error) throw error;
      return data as ExpiringBatch[];
    },
    enabled: alertSettings?.expiry_enabled !== false,
  });

  // Fetch recent stock received (last 7 days)
  const { data: recentTransactions = [] } = useQuery({
    queryKey: ['recent-stock-notifications'],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data, error } = await supabase
        .from('transactions')
        .select('id, transaction_type, quantity, created_at, notes, items(id, name, image_url), batches(batch_number)')
        .eq('transaction_type', 'in')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as RecentTransaction[];
    },
    enabled: alertSettings?.stock_received_enabled !== false,
  });

  const totalNotifications = lowStockItems.length + expiringItems.length + recentTransactions.length;
  const unreadCount = totalNotifications - readNotifications.size;

  const markAsRead = (id: string) => {
    setReadNotifications(prev => new Set([...prev, id]));
  };

  const markAllAsRead = () => {
    const allIds = [
      ...lowStockItems.map(i => `low-${i.id}`),
      ...expiringItems.map(i => `exp-${i.id}`),
      ...recentTransactions.map(i => `txn-${i.id}`),
    ];
    setReadNotifications(new Set(allIds));
    toast.success('All notifications marked as read');
  };

  const clearAll = () => {
    setReadNotifications(new Set());
    toast.success('Notifications cleared');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 border-b bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="rounded-full px-2 py-0.5 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </SheetTitle>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                <CheckCheck className="w-4 h-4 mr-1" />
                Mark all read
              </Button>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="all" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-4 mx-4 mt-2" style={{ width: 'calc(100% - 2rem)' }}>
            <TabsTrigger value="all" className="text-xs">
              All
              {totalNotifications > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
                  {totalNotifications}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="low-stock" className="text-xs">
              Low Stock
              {lowStockItems.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] bg-amber-100 text-amber-700">
                  {lowStockItems.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="expiring" className="text-xs">
              Expiring
              {expiringItems.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] bg-rose-100 text-rose-700">
                  {expiringItems.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="received" className="text-xs">
              Received
              {recentTransactions.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] bg-emerald-100 text-emerald-700">
                  {recentTransactions.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 p-4">
            <TabsContent value="all" className="mt-0 space-y-3">
              {totalNotifications === 0 ? (
                <EmptyState />
              ) : (
                <>
                  {lowStockItems.map((item) => (
                    <LowStockNotification
                      key={`low-${item.id}`}
                      item={item}
                      isRead={readNotifications.has(`low-${item.id}`)}
                      onMarkRead={() => markAsRead(`low-${item.id}`)}
                    />
                  ))}
                  {expiringItems.map((batch) => (
                    <ExpiringNotification
                      key={`exp-${batch.id}`}
                      batch={batch}
                      isRead={readNotifications.has(`exp-${batch.id}`)}
                      onMarkRead={() => markAsRead(`exp-${batch.id}`)}
                    />
                  ))}
                  {recentTransactions.map((txn) => (
                    <ReceivedNotification
                      key={`txn-${txn.id}`}
                      transaction={txn}
                      isRead={readNotifications.has(`txn-${txn.id}`)}
                      onMarkRead={() => markAsRead(`txn-${txn.id}`)}
                    />
                  ))}
                </>
              )}
            </TabsContent>

            <TabsContent value="low-stock" className="mt-0 space-y-3">
              {lowStockItems.length === 0 ? (
                <EmptyState message="No low stock alerts" />
              ) : (
                lowStockItems.map((item) => (
                  <LowStockNotification
                    key={`low-${item.id}`}
                    item={item}
                    isRead={readNotifications.has(`low-${item.id}`)}
                    onMarkRead={() => markAsRead(`low-${item.id}`)}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="expiring" className="mt-0 space-y-3">
              {expiringItems.length === 0 ? (
                <EmptyState message="No expiring items" />
              ) : (
                expiringItems.map((batch) => (
                  <ExpiringNotification
                    key={`exp-${batch.id}`}
                    batch={batch}
                    isRead={readNotifications.has(`exp-${batch.id}`)}
                    onMarkRead={() => markAsRead(`exp-${batch.id}`)}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="received" className="mt-0 space-y-3">
              {recentTransactions.length === 0 ? (
                <EmptyState message="No recent stock received" />
              ) : (
                recentTransactions.map((txn) => (
                  <ReceivedNotification
                    key={`txn-${txn.id}`}
                    transaction={txn}
                    isRead={readNotifications.has(`txn-${txn.id}`)}
                    onMarkRead={() => markAsRead(`txn-${txn.id}`)}
                  />
                ))
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function EmptyState({ message = "You're all caught up!" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
        <Check className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
      </div>
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}

function LowStockNotification({
  item,
  isRead,
  onMarkRead,
}: {
  item: LowStockItem;
  isRead: boolean;
  onMarkRead: () => void;
}) {
  const totalStock = item.batches?.reduce((sum, b) => sum + b.quantity, 0) || 0;
  
  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-xl border transition-all",
        isRead
          ? "bg-muted/30 border-border/50 opacity-60"
          : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50"
      )}
    >
      <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
        {item.image_url ? (
          <img src={item.image_url} alt="" className="w-full h-full object-cover rounded-lg" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-sm">{item.name}</p>
            <p className="text-xs text-muted-foreground">
              Stock: <span className="font-bold text-amber-600">{totalStock}</span> / Min: {item.min_stock_level}
            </p>
          </div>
          {!isRead && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onMarkRead}>
              <Check className="w-3 h-3" />
            </Button>
          )}
        </div>
        <Badge variant="outline" className="mt-1 text-[10px] bg-amber-100 text-amber-700 border-amber-200">
          Low Stock Alert
        </Badge>
      </div>
    </div>
  );
}

function ExpiringNotification({
  batch,
  isRead,
  onMarkRead,
}: {
  batch: ExpiringBatch;
  isRead: boolean;
  onMarkRead: () => void;
}) {
  const daysLeft = Math.ceil(
    (new Date(batch.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const isExpired = daysLeft <= 0;
  const isCritical = daysLeft <= 7;
  
  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-xl border transition-all",
        isRead
          ? "bg-muted/30 border-border/50 opacity-60"
          : isExpired
          ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50"
          : isCritical
          ? "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50"
          : "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/50"
      )}
    >
      <div className={cn(
        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
        isExpired ? "bg-red-100 dark:bg-red-900/50" : isCritical ? "bg-rose-100 dark:bg-rose-900/50" : "bg-orange-100 dark:bg-orange-900/50"
      )}>
        {batch.items?.image_url ? (
          <img src={batch.items.image_url} alt="" className="w-full h-full object-cover rounded-lg" />
        ) : (
          <Clock className={cn(
            "w-5 h-5",
            isExpired ? "text-red-600 dark:text-red-400" : isCritical ? "text-rose-600 dark:text-rose-400" : "text-orange-600 dark:text-orange-400"
          )} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-sm">{batch.items?.name || 'Unknown Item'}</p>
            <p className="text-xs text-muted-foreground">
              Batch: {batch.batch_number} • Qty: {batch.quantity}
            </p>
          </div>
          {!isRead && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onMarkRead}>
              <Check className="w-3 h-3" />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Badge 
            variant="outline" 
            className={cn(
              "text-[10px]",
              isExpired 
                ? "bg-red-100 text-red-700 border-red-200" 
                : isCritical 
                ? "bg-rose-100 text-rose-700 border-rose-200"
                : "bg-orange-100 text-orange-700 border-orange-200"
            )}
          >
            {isExpired ? 'Expired!' : `${daysLeft} days left`}
          </Badge>
          <span className="text-[10px] text-muted-foreground">
            {format(new Date(batch.expiry_date), 'MMM d, yyyy')}
          </span>
        </div>
      </div>
    </div>
  );
}

function ReceivedNotification({
  transaction,
  isRead,
  onMarkRead,
}: {
  transaction: RecentTransaction;
  isRead: boolean;
  onMarkRead: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-xl border transition-all",
        isRead
          ? "bg-muted/30 border-border/50 opacity-60"
          : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50"
      )}
    >
      <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
        {transaction.items?.image_url ? (
          <img src={transaction.items.image_url} alt="" className="w-full h-full object-cover rounded-lg" />
        ) : (
          <PackagePlus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-sm">{transaction.items?.name || 'Unknown Item'}</p>
            <p className="text-xs text-muted-foreground">
              +{transaction.quantity} units • {transaction.batches?.batch_number || 'N/A'}
            </p>
          </div>
          {!isRead && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onMarkRead}>
              <Check className="w-3 h-3" />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">
            Stock Received
          </Badge>
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(transaction.created_at), { addSuffix: true })}
          </span>
        </div>
      </div>
    </div>
  );
}
