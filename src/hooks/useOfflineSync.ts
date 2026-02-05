import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  cacheItems,
  cacheCategories,
  cacheTransactions,
  getCachedItems,
  getCachedCategories,
  getCachedTransactions,
  getPendingOperations,
  clearPendingOperation,
  hasCachedData,
  getMetadata,
} from '@/lib/offline-db';
import { useToast } from '@/hooks/use-toast';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Back online",
        description: "Syncing your data...",
      });
      syncPendingOperations();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "You're offline",
        description: "Changes will be saved locally and synced when you're back online.",
        variant: "destructive",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  // Check pending operations count
  useEffect(() => {
    const checkPending = async () => {
      const operations = await getPendingOperations();
      setPendingCount(operations.length);
    };
    
    checkPending();
    const interval = setInterval(checkPending, 5000);
    return () => clearInterval(interval);
  }, []);

  // Load last sync time
  useEffect(() => {
    const loadLastSync = async () => {
      const timestamp = await getMetadata('items_last_sync');
      if (timestamp) {
        setLastSyncTime(new Date(timestamp));
      }
    };
    loadLastSync();
  }, []);

  // Sync pending operations when back online
  const syncPendingOperations = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;

    setIsSyncing(true);
    try {
      const operations = await getPendingOperations();
      
      for (const op of operations) {
        try {
          if (op.type === 'create') {
            await supabase.from(op.table as any).insert(op.data);
          } else if (op.type === 'update') {
            await supabase.from(op.table as any).update(op.data).eq('id', op.data.id);
          } else if (op.type === 'delete') {
            await supabase.from(op.table as any).delete().eq('id', op.data.id);
          }
          
          if (op.id) {
            await clearPendingOperation(op.id);
          }
        } catch (error) {
          console.error('Failed to sync operation:', error);
        }
      }

      // Refresh data after sync
      await refreshFromServer();
      
      const remaining = await getPendingOperations();
      setPendingCount(remaining.length);

      if (operations.length > 0) {
        toast({
          title: "Sync complete",
          description: `${operations.length} changes synced successfully.`,
        });
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, toast]);

  // Refresh data from server and cache locally
  const refreshFromServer = useCallback(async () => {
    if (!navigator.onLine) return;

    try {
      // Fetch and cache items
      const { data: items } = await supabase
        .from('items')
        .select('*, categories(name, color), batches(id, quantity, expiry_date, batch_number)')
        .order('name');
      
      if (items) {
        await cacheItems(items);
      }

      // Fetch and cache categories
      const { data: categories } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (categories) {
        await cacheCategories(categories);
      }

      // Fetch and cache recent transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*, items(name, unit_of_measure)')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (transactions) {
        await cacheTransactions(transactions);
      }

      setLastSyncTime(new Date());
      
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    } catch (error) {
      console.error('Failed to refresh from server:', error);
    }
  }, [queryClient]);

  // Get cached data for offline use
  const getOfflineData = useCallback(async () => {
    const hasData = await hasCachedData();
    
    if (!hasData) {
      return { items: [], categories: [], transactions: [] };
    }

    const [items, categories, transactions] = await Promise.all([
      getCachedItems(),
      getCachedCategories(),
      getCachedTransactions(),
    ]);

    return { items, categories, transactions };
  }, []);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncTime,
    syncPendingOperations,
    refreshFromServer,
    getOfflineData,
  };
}