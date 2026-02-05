import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileSpreadsheet, 
  Download, 
  Package, 
  ArrowUpCircle, 
  ArrowDownCircle,
  Filter,
  AlertTriangle,
  Clock,
  Search,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Boxes,
  Calendar,
  ChevronDown,
  ChevronUp,
  FileText,
  Printer
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, parseISO, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import * as XLSX from 'xlsx';

type ReportType = 'stock' | 'stock-in' | 'stock-out' | 'low-stock' | 'expiring';

interface FilterState {
  startDate: string;
  endDate: string;
  categoryId: string;
  search: string;
}

export function ReportsSection() {
  const [activeReport, setActiveReport] = useState<ReportType>('stock');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    categoryId: 'all',
    search: '',
  });

  // Fetch categories for filter
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch stock report data
  const { data: stockReport = [], isLoading: stockLoading, refetch: refetchStock } = useQuery({
    queryKey: ['stock-report', filters.categoryId],
    queryFn: async () => {
      let query = supabase
        .from('items')
        .select(`
          *,
          categories(name, color),
          batches(quantity, expiry_date)
        `)
        .order('name');

      if (filters.categoryId !== 'all') {
        query = query.eq('category_id', filters.categoryId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data.map((item: any) => ({
        ...item,
        totalStock: item.batches?.reduce((sum: number, b: any) => sum + b.quantity, 0) || 0,
        earliestExpiry: item.batches
          ?.filter((b: any) => b.expiry_date)
          .sort((a: any, b: any) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime())[0]?.expiry_date,
      }));
    },
  });

  // Fetch transactions for stock in/out reports
  const { data: transactions = [], isLoading: transactionsLoading, refetch: refetchTransactions } = useQuery({
    queryKey: ['transactions-report', filters.startDate, filters.endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          items(name, sku, category_id, categories(name, color)),
          batches(batch_number)
        `)
        .gte('created_at', `${filters.startDate}T00:00:00`)
        .lte('created_at', `${filters.endDate}T23:59:59`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch low stock items
  const { data: lowStockItems = [], refetch: refetchLowStock } = useQuery({
    queryKey: ['low-stock-report', filters.categoryId],
    queryFn: async () => {
      let query = supabase
        .from('items')
        .select(`
          *,
          categories(name, color),
          batches(quantity)
        `)
        .order('name');

      if (filters.categoryId !== 'all') {
        query = query.eq('category_id', filters.categoryId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data
        .map((item: any) => ({
          ...item,
          totalStock: item.batches?.reduce((sum: number, b: any) => sum + b.quantity, 0) || 0,
        }))
        .filter((item: any) => item.totalStock <= (item.min_stock_level || 0));
    },
  });

  // Fetch expiring items
  const { data: expiringItems = [], refetch: refetchExpiring } = useQuery({
    queryKey: ['expiring-report', filters.startDate, filters.endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select(`
          *,
          items(name, sku, category_id, categories(name, color))
        `)
        .not('expiry_date', 'is', null)
        .gte('expiry_date', filters.startDate)
        .lte('expiry_date', filters.endDate)
        .gt('quantity', 0)
        .order('expiry_date');

      if (error) throw error;
      return data;
    },
  });

  const stockInTransactions = transactions.filter((t: any) => t.transaction_type === 'in');
  const stockOutTransactions = transactions.filter((t: any) => t.transaction_type === 'out');

  // Search filtering
  const filteredData = useMemo(() => {
    const searchLower = filters.search.toLowerCase();
    
    const filterBySearch = (items: any[], nameKey = 'name') => {
      if (!searchLower) return items;
      return items.filter(item => {
        const name = nameKey === 'items.name' ? item.items?.name : item[nameKey];
        const sku = nameKey === 'items.name' ? item.items?.sku : item.sku;
        return (name?.toLowerCase().includes(searchLower) || 
                sku?.toLowerCase().includes(searchLower));
      });
    };

    return {
      stock: filterBySearch(stockReport),
      stockIn: filterBySearch(stockInTransactions, 'items.name'),
      stockOut: filterBySearch(stockOutTransactions, 'items.name'),
      lowStock: filterBySearch(lowStockItems),
      expiring: filterBySearch(expiringItems, 'items.name'),
    };
  }, [stockReport, stockInTransactions, stockOutTransactions, lowStockItems, expiringItems, filters.search]);

  // Export to Excel function
  const exportToExcel = (data: any[], filename: string, columns: { key: string; label: string }[]) => {
    const worksheetData = data.map(item => {
      const row: any = {};
      columns.forEach(c => {
        const value = c.key.split('.').reduce((obj, key) => obj?.[key], item);
        row[c.label] = value ?? '';
      });
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    
    // Auto-size columns
    const maxWidths = columns.map(c => Math.max(c.label.length, 15));
    worksheet['!cols'] = maxWidths.map(w => ({ wch: w }));
    
    XLSX.writeFile(workbook, `${filename}_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`);
    toast.success('Excel report downloaded!');
  };

  const handleExport = () => {
    const exports: Record<ReportType, () => void> = {
      'stock': () => exportToExcel(filteredData.stock, 'available_stock', [
        { key: 'name', label: 'Item Name' },
        { key: 'sku', label: 'SKU' },
        { key: 'categories.name', label: 'Category' },
        { key: 'totalStock', label: 'Available Qty' },
        { key: 'min_stock_level', label: 'Min Stock' },
        { key: 'max_stock_level', label: 'Max Stock' },
        { key: 'unit_of_measure', label: 'Unit' },
        { key: 'warehouse_location', label: 'Location' },
        { key: 'earliestExpiry', label: 'Earliest Expiry' },
      ]),
      'stock-in': () => exportToExcel(filteredData.stockIn, 'stock_in_report', [
        { key: 'created_at', label: 'Date' },
        { key: 'items.name', label: 'Item Name' },
        { key: 'items.sku', label: 'SKU' },
        { key: 'items.categories.name', label: 'Category' },
        { key: 'batches.batch_number', label: 'Batch Number' },
        { key: 'quantity', label: 'Quantity In' },
        { key: 'notes', label: 'Notes' },
      ]),
      'stock-out': () => exportToExcel(filteredData.stockOut, 'stock_out_report', [
        { key: 'created_at', label: 'Date' },
        { key: 'items.name', label: 'Item Name' },
        { key: 'items.sku', label: 'SKU' },
        { key: 'items.categories.name', label: 'Category' },
        { key: 'batches.batch_number', label: 'Batch Number' },
        { key: 'quantity', label: 'Quantity Out' },
        { key: 'notes', label: 'Notes' },
      ]),
      'low-stock': () => exportToExcel(filteredData.lowStock, 'low_stock_report', [
        { key: 'name', label: 'Item Name' },
        { key: 'sku', label: 'SKU' },
        { key: 'categories.name', label: 'Category' },
        { key: 'totalStock', label: 'Current Stock' },
        { key: 'min_stock_level', label: 'Min Stock Level' },
        { key: 'unit_of_measure', label: 'Unit' },
        { key: 'supplier_name', label: 'Supplier' },
      ]),
      'expiring': () => exportToExcel(filteredData.expiring, 'expiring_items_report', [
        { key: 'items.name', label: 'Item Name' },
        { key: 'items.sku', label: 'SKU' },
        { key: 'items.categories.name', label: 'Category' },
        { key: 'batch_number', label: 'Batch Number' },
        { key: 'quantity', label: 'Quantity' },
        { key: 'expiry_date', label: 'Expiry Date' },
      ]),
    };
    exports[activeReport]();
  };

  const handleRefresh = () => {
    refetchStock();
    refetchTransactions();
    refetchLowStock();
    refetchExpiring();
    toast.success('Data refreshed');
  };

  const handlePrint = () => {
    window.print();
  };

  const reportCards = [
    { id: 'stock' as ReportType, label: 'Stock', fullLabel: 'Available Stock', icon: Package, color: 'bg-primary', count: filteredData.stock.length },
    { id: 'stock-in' as ReportType, label: 'In', fullLabel: 'Stock In', icon: ArrowUpCircle, color: 'bg-success', count: filteredData.stockIn.length },
    { id: 'stock-out' as ReportType, label: 'Out', fullLabel: 'Stock Out', icon: ArrowDownCircle, color: 'bg-destructive', count: filteredData.stockOut.length },
    { id: 'low-stock' as ReportType, label: 'Low', fullLabel: 'Low Stock', icon: AlertTriangle, color: 'bg-warning', count: filteredData.lowStock.length },
    { id: 'expiring' as ReportType, label: 'Expiry', fullLabel: 'Expiring', icon: Clock, color: 'bg-info', count: filteredData.expiring.length },
  ];

  const currentReportData = {
    'stock': filteredData.stock,
    'stock-in': filteredData.stockIn,
    'stock-out': filteredData.stockOut,
    'low-stock': filteredData.lowStock,
    'expiring': filteredData.expiring,
  }[activeReport];

  const isLoading = stockLoading || transactionsLoading;

  // Summary stats
  const totalStockValue = stockReport.reduce((sum: number, item: any) => sum + (item.totalStock * (item.price || 0)), 0);
  const totalStockIn = stockInTransactions.reduce((sum: number, tx: any) => sum + tx.quantity, 0);
  const totalStockOut = stockOutTransactions.reduce((sum: number, tx: any) => sum + tx.quantity, 0);

  return (
    <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
      {/* Summary Cards - Scrollable on mobile */}
      <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
        <div className="flex gap-2 sm:grid sm:grid-cols-4 min-w-max sm:min-w-0">
          <Card className="flex-shrink-0 w-[140px] sm:w-auto border-l-4 border-l-primary">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Boxes className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Items</p>
                  <p className="text-lg font-bold">{stockReport.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="flex-shrink-0 w-[140px] sm:w-auto border-l-4 border-l-success">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-success/10">
                  <TrendingUp className="w-4 h-4 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Stock In</p>
                  <p className="text-lg font-bold text-success">+{totalStockIn.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="flex-shrink-0 w-[140px] sm:w-auto border-l-4 border-l-destructive">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-destructive/10">
                  <TrendingDown className="w-4 h-4 text-destructive" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Stock Out</p>
                  <p className="text-lg font-bold text-destructive">-{totalStockOut.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="flex-shrink-0 w-[140px] sm:w-auto border-l-4 border-l-warning">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-warning/10">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Low Stock</p>
                  <p className="text-lg font-bold text-warning">{lowStockItems.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Report Type Selection - Mobile optimized */}
      <div className="flex gap-1.5 p-1 bg-muted rounded-lg overflow-x-auto">
        {reportCards.map((report) => {
          const Icon = report.icon;
          const isActive = activeReport === report.id;
          return (
            <button
              key={report.id}
              onClick={() => setActiveReport(report.id)}
              className={`flex-1 min-w-[60px] flex flex-col items-center gap-0.5 py-2 px-2 rounded-md transition-all ${
                isActive 
                  ? 'bg-background shadow-sm' 
                  : 'hover:bg-background/50'
              }`}
            >
              <div className={`p-1.5 rounded-md ${report.color} ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                <Icon className="w-3.5 h-3.5 text-white" />
              </div>
              <span className={`text-[10px] font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                {report.label}
              </span>
              <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                {report.count}
              </Badge>
            </button>
          );
        })}
      </div>

      {/* Search and Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or SKU..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="gap-1.5 h-9"
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filters</span>
            {filtersOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={handleRefresh}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9 hidden sm:flex" onClick={handlePrint}>
            <Printer className="w-3.5 h-3.5" />
          </Button>
      <Button size="sm" className="gap-1.5 h-9 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25" onClick={handleExport}>
            <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Excel</span>
          </Button>
        </div>
      </div>

      {/* Collapsible Filters */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleContent>
          <Card className="border-dashed">
            <CardContent className="p-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Start
                  </Label>
                  <Input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> End
                  </Label>
                  <Input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Category</Label>
                  <Select
                    value={filters.categoryId}
                    onValueChange={(value) => setFilters({ ...filters, categoryId: value })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((cat: any) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-2 h-2 rounded-full" 
                              style={{ backgroundColor: cat.color || '#6366f1' }} 
                            />
                            {cat.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-8 text-xs"
                    onClick={() => setFilters({
                      startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
                      endDate: format(new Date(), 'yyyy-MM-dd'),
                      categoryId: 'all',
                      search: '',
                    })}
                  >
                    Reset All
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Report Content Card */}
      <Card>
        <CardHeader className="p-3 pb-2 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-md ${reportCards.find(r => r.id === activeReport)?.color}`}>
                <FileText className="w-4 h-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">
                  {reportCards.find(r => r.id === activeReport)?.fullLabel} Report
                </CardTitle>
                <CardDescription className="text-xs">
                  {currentReportData.length} record{currentReportData.length !== 1 ? 's' : ''} found
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : currentReportData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No records found</p>
              <p className="text-xs text-muted-foreground/70">Try adjusting your filters</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] sm:h-[450px]">
              <div className="divide-y">
                {/* Available Stock Items */}
                {activeReport === 'stock' && filteredData.stock.map((item: any) => (
                  <div key={item.id} className="p-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm truncate">{item.name}</p>
                          {item.categories && (
                            <Badge 
                              variant="secondary" 
                              className="text-[10px] h-4"
                              style={{ backgroundColor: `${item.categories.color}20`, color: item.categories.color }}
                            >
                              {item.categories.name}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {item.sku && <span>SKU: {item.sku}</span>}
                          {item.warehouse_location && <span>📍 {item.warehouse_location}</span>}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-lg font-bold ${item.totalStock <= (item.min_stock_level || 0) ? 'text-destructive' : 'text-success'}`}>
                          {item.totalStock}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {item.unit_of_measure || 'pcs'} • Min: {item.min_stock_level || 0}
                        </p>
                      </div>
                    </div>
                    {item.earliestExpiry && (
                      <div className="mt-2">
                        <Badge variant={new Date(item.earliestExpiry) <= new Date() ? 'destructive' : 'secondary'} className="text-[10px]">
                          Expires: {format(new Date(item.earliestExpiry), 'MMM d, yyyy')}
                        </Badge>
                      </div>
                    )}
                  </div>
                ))}

                {/* Stock In Transactions */}
                {activeReport === 'stock-in' && filteredData.stockIn.map((tx: any) => (
                  <div key={tx.id} className="p-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{tx.items?.name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {tx.items?.categories && (
                            <Badge 
                              variant="secondary" 
                              className="text-[10px] h-4"
                              style={{ backgroundColor: `${tx.items.categories.color}20`, color: tx.items.categories.color }}
                            >
                              {tx.items.categories.name}
                            </Badge>
                          )}
                          {tx.batches?.batch_number && (
                            <span className="text-[10px] font-mono text-muted-foreground">
                              #{tx.batches.batch_number}
                            </span>
                          )}
                        </div>
                        {tx.notes && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">{tx.notes}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-bold text-success">+{tx.quantity}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(tx.created_at), 'MMM d, HH:mm')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Stock Out Transactions */}
                {activeReport === 'stock-out' && filteredData.stockOut.map((tx: any) => (
                  <div key={tx.id} className="p-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{tx.items?.name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {tx.items?.categories && (
                            <Badge 
                              variant="secondary" 
                              className="text-[10px] h-4"
                              style={{ backgroundColor: `${tx.items.categories.color}20`, color: tx.items.categories.color }}
                            >
                              {tx.items.categories.name}
                            </Badge>
                          )}
                          {tx.batches?.batch_number && (
                            <span className="text-[10px] font-mono text-muted-foreground">
                              #{tx.batches.batch_number}
                            </span>
                          )}
                        </div>
                        {tx.notes && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">{tx.notes}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-bold text-destructive">-{tx.quantity}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(tx.created_at), 'MMM d, HH:mm')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Low Stock Items */}
                {activeReport === 'low-stock' && filteredData.lowStock.map((item: any) => {
                  const shortage = (item.min_stock_level || 0) - item.totalStock;
                  return (
                    <div key={item.id} className="p-3 hover:bg-muted/30 transition-colors border-l-4 border-l-warning">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm truncate">{item.name}</p>
                            {item.categories && (
                              <Badge 
                                variant="secondary" 
                                className="text-[10px] h-4"
                                style={{ backgroundColor: `${item.categories.color}20`, color: item.categories.color }}
                              >
                                {item.categories.name}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            {item.sku && <span>SKU: {item.sku}</span>}
                            {item.supplier_name && <span>🏭 {item.supplier_name}</span>}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-lg font-bold text-destructive">{item.totalStock}</p>
                          <div className="flex items-center gap-1 justify-end">
                            <span className="text-[10px] text-muted-foreground">Min: {item.min_stock_level || 0}</span>
                            <Badge variant="destructive" className="text-[10px] h-4">-{shortage}</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Expiring Items */}
                {activeReport === 'expiring' && filteredData.expiring.map((batch: any) => {
                  const expiryDate = new Date(batch.expiry_date);
                  const daysUntilExpiry = differenceInDays(expiryDate, new Date());
                  const isExpired = daysUntilExpiry < 0;
                  const isExpiringSoon = daysUntilExpiry <= 7 && daysUntilExpiry >= 0;

                  return (
                    <div 
                      key={batch.id} 
                      className={`p-3 hover:bg-muted/30 transition-colors border-l-4 ${
                        isExpired ? 'border-l-destructive' : isExpiringSoon ? 'border-l-warning' : 'border-l-info'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm truncate">{batch.items?.name}</p>
                            {batch.items?.categories && (
                              <Badge 
                                variant="secondary" 
                                className="text-[10px] h-4"
                                style={{ backgroundColor: `${batch.items.categories.color}20`, color: batch.items.categories.color }}
                              >
                                {batch.items.categories.name}
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] font-mono text-muted-foreground mt-1">
                            Batch: {batch.batch_number}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-lg font-bold">{batch.quantity}</p>
                          <Badge 
                            variant={isExpired ? 'destructive' : isExpiringSoon ? 'default' : 'secondary'}
                            className={`text-[10px] ${isExpiringSoon && !isExpired ? 'bg-warning text-warning-foreground' : ''}`}
                          >
                            {isExpired 
                              ? 'Expired' 
                              : isExpiringSoon 
                                ? `${daysUntilExpiry}d left` 
                                : format(expiryDate, 'MMM d')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
