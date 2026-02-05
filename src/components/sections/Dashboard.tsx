import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Package, Activity, Sparkles, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ActivityFeed } from './dashboard/ActivityFeed';
import { StockChart } from './dashboard/StockChart';
import { AnalyticsCards } from './dashboard/AnalyticsCards';

export function Dashboard() {
  // Fetch items with low stock
  const { data: lowStockItems = [] } = useQuery({
    queryKey: ['low-stock-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select('*, batches(quantity)')
        .order('name');
      
      if (error) throw error;

      return (data || []).filter(item => {
        const totalStock = item.batches?.reduce((sum: number, b: { quantity: number }) => sum + b.quantity, 0) || 0;
        return totalStock <= item.min_stock_level;
      });
    },
  });

  // Fetch items with expiring batches
  const { data: expiringItems = [] } = useQuery({
    queryKey: ['expiring-items'],
    queryFn: async () => {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const { data, error } = await supabase
        .from('batches')
        .select('*, items(name, image_url)')
        .lt('expiry_date', thirtyDaysFromNow.toISOString())
        .gt('expiry_date', new Date().toISOString())
        .gt('quantity', 0)
        .order('expiry_date');

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch recent transactions
  const { data: recentTransactions = [] } = useQuery({
    queryKey: ['recent-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, items(name, image_url), batches(batch_number)')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch transaction stats for chart
  const { data: transactionStats } = useQuery({
    queryKey: ['transaction-stats'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('transactions')
        .select('transaction_type, quantity, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at');

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch total items count
  const { data: totalItems = 0 } = useQuery({
    queryKey: ['total-items'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      return count || 0;
    },
  });

  // Calculate today's stats
  const todayStats = {
    stockIn: recentTransactions.filter(t => t.transaction_type === 'stock_in').reduce((sum, t) => sum + t.quantity, 0),
    stockOut: recentTransactions.filter(t => t.transaction_type === 'stock_out').reduce((sum, t) => sum + Math.abs(t.quantity), 0),
  };

  return (
    <div className="p-4 space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Inventory overview</p>
        </div>
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-primary/15 to-primary/5 rounded-2xl border border-primary/10 shadow-lg shadow-primary/5">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-primary">{totalItems}</span>
          <span className="text-xs text-muted-foreground">items</span>
        </div>
      </div>

      {/* Animated Analytics Cards */}
      <AnalyticsCards 
        lowStockCount={lowStockItems.length} 
        expiringCount={expiringItems.length} 
      />

      {/* Stock Movement Chart */}
      <Card className="rounded-3xl border-border/50 shadow-xl overflow-hidden animate-fade-in" style={{ animationDelay: '250ms' }}>
        <CardHeader className="pb-2 pt-5 px-5">
          <CardTitle className="text-base font-bold flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-2xl">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            Stock Movement
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-5 pb-5">
          <StockChart 
            data={transactionStats || []} 
            lowStockCount={lowStockItems.length}
            expiringCount={expiringItems.length}
          />
        </CardContent>
      </Card>

      {/* Activity Feed */}
      <Card className="rounded-3xl border-border/50 shadow-xl overflow-hidden animate-fade-in" style={{ animationDelay: '350ms' }}>
        <CardHeader className="pb-3 pt-5 px-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-2xl">
                <Package className="w-5 h-5 text-primary" />
              </div>
              Recent Activity
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground rounded-xl touch-feedback">
              View All
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0 px-5 pb-5">
          <ActivityFeed transactions={recentTransactions} />
        </CardContent>
      </Card>
    </div>
  );
}