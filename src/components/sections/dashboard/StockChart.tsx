import { useMemo, useState } from 'react';
import { 
  AreaChart, Area, XAxis, ResponsiveContainer, Tooltip, BarChart, Bar,
  CartesianGrid, YAxis, Cell
} from 'recharts';
import { TrendingUp, TrendingDown, Calendar, Activity, AlertTriangle, Clock, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Transaction {
  transaction_type: string;
  quantity: number;
  created_at: string;
}

interface StockChartProps {
  data: Transaction[];
  lowStockCount?: number;
  expiringCount?: number;
}

type DateRange = '7d' | '14d' | '30d';
type ChartView = 'area' | 'bar';

const DATE_RANGES: { id: DateRange; label: string; days: number }[] = [
  { id: '7d', label: '7 Days', days: 7 },
  { id: '14d', label: '14 Days', days: 14 },
  { id: '30d', label: '30 Days', days: 30 },
];

export function StockChart({ data, lowStockCount = 0, expiringCount = 0 }: StockChartProps) {
  const [chartView, setChartView] = useState<ChartView>('area');
  const [dateRange, setDateRange] = useState<DateRange>('7d');
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  const selectedRange = DATE_RANGES.find(r => r.id === dateRange) || DATE_RANGES[0];

  const chartData = useMemo(() => {
    const today = new Date();
    const result = [];

    for (let i = selectedRange.days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = date.getDate();
      const dateStr = date.toISOString().split('T')[0];

      const dayTransactions = data.filter(t => 
        t.created_at.startsWith(dateStr)
      );

      const stockIn = dayTransactions
        .filter(t => t.transaction_type === 'stock_in')
        .reduce((sum, t) => sum + Number(t.quantity), 0);

      const stockOut = dayTransactions
        .filter(t => t.transaction_type === 'stock_out')
        .reduce((sum, t) => sum + Math.abs(Number(t.quantity)), 0);

      result.push({
        day: dayName,
        dayNum,
        date: dateStr,
        stockIn,
        stockOut,
        total: stockIn + stockOut,
        net: stockIn - stockOut,
      });
    }

    return result;
  }, [data, selectedRange.days]);

  const totals = useMemo(() => ({
    stockIn: chartData.reduce((sum, d) => sum + d.stockIn, 0),
    stockOut: chartData.reduce((sum, d) => sum + d.stockOut, 0),
  }), [chartData]);

  const summaryData = useMemo(() => [
    { name: 'Stock In', value: totals.stockIn, color: 'hsl(142, 76%, 36%)' },
    { name: 'Stock Out', value: totals.stockOut, color: 'hsl(0, 84%, 60%)' },
    { name: 'Low Stock', value: lowStockCount, color: 'hsl(38, 92%, 50%)' },
    { name: 'Expiring', value: expiringCount, color: 'hsl(262, 83%, 58%)' },
  ], [totals, lowStockCount, expiringCount]);

  const hasData = chartData.some(d => d.stockIn > 0 || d.stockOut > 0) || lowStockCount > 0 || expiringCount > 0;

  if (!hasData) {
    return (
      <div className="py-10 flex flex-col items-center justify-center animate-fade-in">
        <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl flex items-center justify-center mb-4 shadow-lg">
          <Activity className="w-8 h-8 text-primary/50" />
        </div>
        <p className="text-sm font-semibold text-foreground">No transactions yet</p>
        <p className="text-xs text-muted-foreground mt-1">Start adding stock to see trends</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl p-4 shadow-2xl animate-scale-in">
          <p className="text-xs font-bold text-foreground mb-3">{label} {d.dayNum}</p>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 shadow-sm" />
              <span className="text-xs text-muted-foreground flex-1">Stock In</span>
              <span className="text-sm font-bold text-emerald-500">+{d.stockIn}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 shadow-sm" />
              <span className="text-xs text-muted-foreground flex-1">Stock Out</span>
              <span className="text-sm font-bold text-rose-500">-{d.stockOut}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const BarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl p-4 shadow-2xl animate-scale-in">
          <p className="text-sm font-bold text-foreground">{d.name}</p>
          <p className="text-2xl font-bold mt-1" style={{ color: d.color }}>{d.value}</p>
        </div>
      );
    }
    return null;
  };

  const metrics = [
    { id: 'stockIn', label: 'Stock In', value: totals.stockIn, icon: TrendingUp, gradient: 'from-emerald-500 to-teal-500', bgGradient: 'from-emerald-500/15 to-teal-500/5', borderColor: 'border-emerald-500/30' },
    { id: 'stockOut', label: 'Stock Out', value: totals.stockOut, icon: TrendingDown, gradient: 'from-rose-500 to-pink-500', bgGradient: 'from-rose-500/15 to-pink-500/5', borderColor: 'border-rose-500/30' },
    { id: 'lowStock', label: 'Low Stock', value: lowStockCount, icon: AlertTriangle, gradient: 'from-amber-500 to-orange-500', bgGradient: 'from-amber-500/15 to-orange-500/5', borderColor: 'border-amber-500/30' },
    { id: 'expiring', label: 'Expiring', value: expiringCount, icon: Clock, gradient: 'from-violet-500 to-purple-500', bgGradient: 'from-violet-500/15 to-purple-500/5', borderColor: 'border-violet-500/30' },
  ];

  return (
    <div className="space-y-5">
      {/* Animated Metric Cards */}
      <div className="grid grid-cols-4 gap-2">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          const isSelected = selectedMetric === metric.id;
          
          return (
            <button
              key={metric.id}
              onClick={() => setSelectedMetric(isSelected ? null : metric.id)}
              className={cn(
                "relative flex flex-col items-center p-3 rounded-2xl border transition-all duration-300 touch-feedback animate-fade-in overflow-hidden",
                `bg-gradient-to-br ${metric.bgGradient} ${metric.borderColor}`,
                isSelected && "ring-2 ring-offset-2 ring-offset-background scale-105 shadow-xl ring-primary"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {isSelected && (
                <div className="absolute inset-0 opacity-30">
                  <div className={cn("absolute inset-0 bg-gradient-to-br blur-xl", metric.gradient)} />
                </div>
              )}
              
              <div className={cn(
                "relative p-2 rounded-xl bg-gradient-to-br mb-1.5 shadow-lg transition-transform duration-300",
                metric.gradient,
                isSelected && "scale-110"
              )}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <span className={cn(
                "relative text-xl font-bold bg-gradient-to-br bg-clip-text text-transparent",
                metric.gradient
              )}>
                {metric.value}
              </span>
              <span className="relative text-[9px] text-muted-foreground font-medium mt-0.5 text-center leading-tight">
                {metric.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Chart View Toggle */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1 p-1 bg-muted/50 rounded-2xl flex-1 shadow-inner">
          {[
            { id: 'area' as ChartView, label: 'Trend', icon: Activity },
            { id: 'bar' as ChartView, label: 'Compare', icon: Package },
          ].map((view) => {
            const ViewIcon = view.icon;
            return (
              <button
                key={view.id}
                onClick={() => setChartView(view.id)}
                className={cn(
                  "flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all duration-300 touch-feedback flex items-center justify-center gap-1.5",
                  chartView === view.id
                    ? "bg-card shadow-lg text-foreground"
                    : "text-muted-foreground hover:text-foreground active:scale-95"
                )}
              >
                <ViewIcon className="w-3.5 h-3.5" />
                {view.label}
              </button>
            );
          })}
        </div>

        <Popover open={dateRangeOpen} onOpenChange={setDateRangeOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-11 px-4 rounded-2xl border-0 bg-muted/50 hover:bg-muted gap-2 touch-feedback shadow-inner"
            >
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold">{selectedRange.label}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-44 p-2 rounded-2xl shadow-2xl border-border/50" align="end">
            <div className="space-y-1">
              {DATE_RANGES.map((range) => (
                <button
                  key={range.id}
                  onClick={() => {
                    setDateRange(range.id);
                    setDateRangeOpen(false);
                  }}
                  className={cn(
                    "w-full py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 text-left touch-feedback",
                    dateRange === range.id
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "hover:bg-muted active:scale-98"
                  )}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Charts */}
      <div className="h-52 animate-fade-in rounded-2xl bg-gradient-to-b from-muted/30 to-transparent p-3" style={{ animationDelay: '100ms' }}>
        {chartView === 'area' ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="stockInGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.5}/>
                  <stop offset="100%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="stockOutGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.5}/>
                  <stop offset="100%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} tickMargin={10} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={40} />
              <Tooltip content={<CustomTooltip />} />
              
              {(!selectedMetric || selectedMetric === 'stockIn') && (
                <Area 
                  type="monotone"
                  dataKey="stockIn" 
                  stroke="hsl(142, 76%, 36%)"
                  strokeWidth={3}
                  fill="url(#stockInGradient)"
                  animationDuration={1200}
                  animationEasing="ease-out"
                  dot={false}
                  activeDot={{ r: 6, fill: 'hsl(142, 76%, 36%)', stroke: 'hsl(var(--background))', strokeWidth: 3 }}
                />
              )}
              
              {(!selectedMetric || selectedMetric === 'stockOut') && (
                <Area 
                  type="monotone"
                  dataKey="stockOut" 
                  stroke="hsl(0, 84%, 60%)"
                  strokeWidth={3}
                  fill="url(#stockOutGradient)"
                  animationDuration={1200}
                  animationEasing="ease-out"
                  dot={false}
                  activeDot={{ r: 6, fill: 'hsl(0, 84%, 60%)', stroke: 'hsl(var(--background))', strokeWidth: 3 }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summaryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} tickMargin={10} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={40} />
              <Tooltip content={<BarTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} />
              <Bar dataKey="value" radius={[12, 12, 4, 4]} animationDuration={1200} animationEasing="ease-out">
                {summaryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {selectedMetric && (
        <div className="flex items-center justify-center gap-2 animate-fade-in">
          <div className="px-3 py-1.5 rounded-full bg-muted/50 text-xs font-medium text-muted-foreground">
            Showing: {metrics.find(m => m.id === selectedMetric)?.label}
          </div>
          <button onClick={() => setSelectedMetric(null)} className="px-3 py-1.5 rounded-full bg-primary/10 text-xs font-semibold text-primary touch-feedback">
            Show All
          </button>
        </div>
      )}
    </div>
  );
}