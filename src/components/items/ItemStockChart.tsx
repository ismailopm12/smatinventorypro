import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { ArrowDownToLine, ArrowUpFromLine, TrendingUp, TrendingDown } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

interface ItemStockChartProps {
  itemId: string;
  compact?: boolean;
}

export function ItemStockChart({ itemId, compact = true }: ItemStockChartProps) {
  // Fetch last 7 days of transactions
  const { data: transactions = [] } = useQuery({
    queryKey: ['item-transactions', itemId],
    queryFn: async () => {
      const sevenDaysAgo = subDays(new Date(), 7);
      const { data, error } = await supabase
        .from('transactions')
        .select('id, quantity, transaction_type, created_at')
        .eq('item_id', itemId)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  const { chartData, totalIn, totalOut, trend } = useMemo(() => {
    // Generate last 7 days
    const days = [];
    for (let i = 6; i >= 0; i--) {
      days.push(startOfDay(subDays(new Date(), i)));
    }

    // Aggregate by day
    const dailyData = days.map((day) => {
      const dayEnd = endOfDay(day);
      const dayTransactions = transactions.filter((t) => {
        const tDate = new Date(t.created_at);
        return tDate >= day && tDate <= dayEnd;
      });

      const stockIn = dayTransactions
        .filter((t) => t.transaction_type === 'stock_in')
        .reduce((sum, t) => sum + Number(t.quantity), 0);
      const stockOut = dayTransactions
        .filter((t) => t.transaction_type === 'stock_out')
        .reduce((sum, t) => sum + Number(t.quantity), 0);

      return {
        date: format(day, 'EEE'),
        fullDate: format(day, 'MMM d'),
        stockIn,
        stockOut,
        net: stockIn - stockOut,
      };
    });

    const totalIn = dailyData.reduce((sum, d) => sum + d.stockIn, 0);
    const totalOut = dailyData.reduce((sum, d) => sum + d.stockOut, 0);
    const trend = totalIn - totalOut;

    return { chartData: dailyData, totalIn, totalOut, trend };
  }, [transactions]);

  if (compact) {
    return (
      <div className="mt-3 pt-3 border-t border-border/50">
        {/* Mini stats */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <ArrowDownToLine className="w-3 h-3 text-success" />
              <span className="text-xs font-semibold text-success">{totalIn}</span>
            </div>
            <div className="flex items-center gap-1">
              <ArrowUpFromLine className="w-3 h-3 text-destructive" />
              <span className="text-xs font-semibold text-destructive">{totalOut}</span>
            </div>
          </div>
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium",
            trend > 0 ? "text-success" : trend < 0 ? "text-destructive" : "text-muted-foreground"
          )}>
            {trend > 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : trend < 0 ? (
              <TrendingDown className="w-3 h-3" />
            ) : null}
            <span>{trend > 0 ? '+' : ''}{trend} (7d)</span>
          </div>
        </div>

        {/* Mini chart */}
        <div className="h-12 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`stockIn-${itemId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id={`stockOut-${itemId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="stockIn"
                stroke="hsl(var(--success))"
                strokeWidth={1.5}
                fill={`url(#stockIn-${itemId})`}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="stockOut"
                stroke="hsl(var(--destructive))"
                strokeWidth={1.5}
                fill={`url(#stockOut-${itemId})`}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // Full chart view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Stock Movement (7 days)</h4>
        <div className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
          trend > 0 ? "bg-success/10 text-success" : trend < 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
        )}>
          {trend > 0 ? <TrendingUp className="w-3 h-3" /> : trend < 0 ? <TrendingDown className="w-3 h-3" /> : null}
          <span>{trend > 0 ? '+' : ''}{trend} net</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-success/10 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <ArrowDownToLine className="w-4 h-4 text-success" />
            <span className="text-xs text-success font-medium">Stock In</span>
          </div>
          <p className="text-xl font-bold text-success">{totalIn}</p>
        </div>
        <div className="bg-destructive/10 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpFromLine className="w-4 h-4 text-destructive" />
            <span className="text-xs text-destructive font-medium">Stock Out</span>
          </div>
          <p className="text-xl font-bold text-destructive">{totalOut}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id={`stockInFull-${itemId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id={`stockOutFull-${itemId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '12px',
                fontSize: '12px',
              }}
              formatter={(value: number, name: string) => [
                value,
                name === 'stockIn' ? 'Stock In' : 'Stock Out',
              ]}
              labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
            />
            <Area
              type="monotone"
              dataKey="stockIn"
              stroke="hsl(var(--success))"
              strokeWidth={2}
              fill={`url(#stockInFull-${itemId})`}
              dot={{ r: 3, fill: 'hsl(var(--success))' }}
            />
            <Area
              type="monotone"
              dataKey="stockOut"
              stroke="hsl(var(--destructive))"
              strokeWidth={2}
              fill={`url(#stockOutFull-${itemId})`}
              dot={{ r: 3, fill: 'hsl(var(--destructive))' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}