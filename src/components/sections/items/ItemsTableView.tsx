import { Package, AlertTriangle, Clock, TrendingUp, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Batch {
  id: string;
  quantity: number;
  expiry_date: string | null;
  batch_number: string;
}

interface Item {
  id: string;
  name: string;
  sku: string | null;
  image_url: string | null;
  min_stock_level: number;
  unit_of_measure: string;
  price: number | null;
  warehouse_location: string | null;
  categories: {
    name: string;
    color: string;
  } | null;
  batches: Batch[];
}

interface ItemsTableViewProps {
  items: Item[];
  onItemClick: (itemId: string) => void;
}

// Helper to check if unit supports decimals
const supportsDecimals = (unit: string) => {
  return ['kg', 'ltr', 'g', 'ml', 'l', 'lb', 'oz'].includes(unit?.toLowerCase());
};

// Helper to format quantity for display
const formatQuantity = (qty: number, unit: string) => {
  if (supportsDecimals(unit)) {
    return qty.toFixed(3).replace(/\.?0+$/, '');
  }
  return Math.floor(qty).toString();
};

export function ItemsTableView({ items, onItemClick }: ItemsTableViewProps) {
  return (
    <div className="rounded-2xl border border-border/50 overflow-hidden bg-card shadow-lg animate-fade-in">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border/50">
            <TableHead className="w-[50px] font-semibold text-xs uppercase tracking-wider text-muted-foreground py-4">
              #
            </TableHead>
            <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground py-4">
              Item
            </TableHead>
            <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground py-4 hidden sm:table-cell">
              Category
            </TableHead>
            <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground py-4 hidden sm:table-cell">
              SKU
            </TableHead>
            <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground py-4 text-right">
              Stock
            </TableHead>
            <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground py-4 hidden sm:table-cell text-right">
              Status
            </TableHead>
            <TableHead className="w-[40px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => {
            const totalStock = item.batches?.reduce((sum, b) => sum + Number(b.quantity), 0) || 0;
            const displayStock = formatQuantity(totalStock, item.unit_of_measure);
            const isLowStock = totalStock <= item.min_stock_level;
            const isOutOfStock = totalStock === 0;
            
            // Find nearest expiry date
            const nearestExpiry = item.batches
              ?.filter(b => b.expiry_date && b.quantity > 0)
              .sort((a, b) => new Date(a.expiry_date!).getTime() - new Date(b.expiry_date!).getTime())[0];
            
            const isExpiringSoon = nearestExpiry?.expiry_date && 
              new Date(nearestExpiry.expiry_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            const getStatusConfig = () => {
              if (isOutOfStock) {
                return { label: 'Out of Stock', className: 'bg-destructive/10 text-destructive border-destructive/20' };
              }
              if (isLowStock) {
                return { label: 'Low Stock', className: 'bg-warning/10 text-warning border-warning/20' };
              }
              if (isExpiringSoon) {
                return { label: 'Expiring', className: 'bg-destructive/10 text-destructive border-destructive/20' };
              }
              return { label: 'In Stock', className: 'bg-success/10 text-success border-success/20' };
            };

            const status = getStatusConfig();

            return (
              <TableRow 
                key={item.id}
                onClick={() => onItemClick(item.id)}
                className={cn(
                  "cursor-pointer transition-all duration-200 group",
                  "hover:bg-primary/5 active:bg-primary/10",
                  isOutOfStock && "opacity-60",
                  "animate-fade-in"
                )}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <TableCell className="font-medium text-muted-foreground py-3">
                  <span className="text-xs font-mono bg-muted/80 px-2 py-1 rounded-md">
                    {index + 1}
                  </span>
                </TableCell>
                <TableCell className="py-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden transition-transform duration-200 group-hover:scale-105",
                      item.image_url ? "" : "bg-gradient-to-br from-muted to-muted/50"
                    )}>
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-5 h-5 text-muted-foreground/50" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                        {item.name}
                      </p>
                      {/* Mobile: Show category inline */}
                      <div className="sm:hidden flex items-center gap-2 mt-1">
                        {item.categories && (
                          <span
                            className="text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide"
                            style={{
                              backgroundColor: `${item.categories.color}15`,
                              color: item.categories.color,
                            }}
                          >
                            {item.categories.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-3 hidden sm:table-cell">
                  {item.categories ? (
                    <span
                      className="text-[10px] px-3 py-1.5 rounded-full font-semibold uppercase tracking-wide inline-flex items-center gap-1.5"
                      style={{
                        backgroundColor: `${item.categories.color}15`,
                        color: item.categories.color,
                      }}
                    >
                      <span 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: item.categories.color }}
                      />
                      {item.categories.name}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
                <TableCell className="py-3 hidden sm:table-cell">
                  <span className="text-[11px] text-muted-foreground font-mono bg-muted/80 px-2.5 py-1 rounded-lg">
                    {item.sku || '—'}
                  </span>
                </TableCell>
                <TableCell className="py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {!isOutOfStock && !isLowStock && totalStock > item.min_stock_level * 2 && (
                      <TrendingUp className="w-3.5 h-3.5 text-success" />
                    )}
                    {isLowStock && !isOutOfStock && (
                      <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                    )}
                    {isExpiringSoon && (
                      <Clock className="w-3.5 h-3.5 text-destructive" />
                    )}
                    <span
                      className={cn(
                        'font-bold text-base tabular-nums',
                        isOutOfStock ? 'text-destructive' : isLowStock ? 'text-warning' : 'text-success'
                      )}
                    >
                      {displayStock}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium uppercase">
                      {item.unit_of_measure}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-3 hidden sm:table-cell text-right">
                  <span className={cn(
                    "text-[10px] px-3 py-1.5 rounded-full font-semibold uppercase tracking-wide border inline-block",
                    status.className
                  )}>
                    {status.label}
                  </span>
                </TableCell>
                <TableCell className="py-3">
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5" />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}