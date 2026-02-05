import { Package, AlertTriangle, TrendingUp, Clock, QrCode } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
   barcode?: string | null;
  image_url: string | null;
  min_stock_level: number;
  unit_of_measure: string;
  categories: {
    name: string;
    color: string;
  } | null;
  batches: Batch[];
}

interface ItemCardProps {
  item: Item;
  viewMode: 'grid' | 'list';
  onClick: () => void;
   onPrintQR?: () => void;
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

export function ItemCard({ item, viewMode, onClick, onPrintQR }: ItemCardProps) {
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

  if (viewMode === 'list') {
    return (
      <Card
        className={cn(
          "card-native cursor-pointer touch-feedback overflow-hidden",
          isOutOfStock && "opacity-60",
          isLowStock && !isOutOfStock && "border-l-4 border-l-warning"
        )}
        onClick={onClick}
      >
        <CardContent className="p-0">
          <div className="flex items-center gap-3 p-3">
            <div className={cn(
              "w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden",
              item.image_url ? "" : "bg-gradient-to-br from-muted to-muted/50"
            )}>
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Package className="w-6 h-6 text-muted-foreground/50" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm truncate">{item.name}</p>
                {isLowStock && !isOutOfStock && (
                  <div className="p-1 bg-warning/20 rounded-full">
                    <AlertTriangle className="w-3 h-3 text-warning" />
                  </div>
                )}
                {isExpiringSoon && (
                  <div className="p-1 bg-destructive/20 rounded-full">
                    <Clock className="w-3 h-3 text-destructive" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                {item.categories && (
                  <span
                    className="text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wide"
                    style={{
                      backgroundColor: `${item.categories.color}15`,
                      color: item.categories.color,
                    }}
                  >
                    {item.categories.name}
                  </span>
                )}
                {item.sku && (
                  <span className="text-[10px] text-muted-foreground font-mono bg-muted px-2 py-1 rounded-md">
                    {item.sku}
                  </span>
                )}
              </div>
            </div>

            <div className="text-right">
              <p
                className={cn(
                  'text-2xl font-bold',
                  isOutOfStock ? 'text-destructive' : isLowStock ? 'text-warning' : 'text-success'
                )}
              >
                {displayStock}
              </p>
              <p className="text-[10px] text-muted-foreground font-medium uppercase">{item.unit_of_measure}</p>
            </div>

           {onPrintQR && (
             <Button
               variant="ghost"
               size="icon"
               className="h-10 w-10 rounded-xl hover:bg-primary/10"
               onClick={(e) => {
                 e.stopPropagation();
                 onPrintQR();
               }}
             >
               <QrCode className="w-4 h-4 text-muted-foreground" />
             </Button>
           )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "card-native cursor-pointer touch-feedback overflow-hidden",
        isOutOfStock && "opacity-60",
        isLowStock && !isOutOfStock && "ring-2 ring-warning/30"
      )}
      onClick={onClick}
    >
      <div className="aspect-square bg-gradient-to-br from-muted to-muted/30 flex items-center justify-center relative">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Package className="w-12 h-12 text-muted-foreground/30" />
        )}
        
        {/* Status badges */}
        <div className="absolute top-2 right-2 flex flex-col gap-1.5">
          {isOutOfStock && (
            <div className="px-2.5 py-1 bg-destructive text-destructive-foreground rounded-full text-[10px] font-bold uppercase tracking-wide shadow-lg">
              Out
            </div>
          )}
          {isLowStock && !isOutOfStock && (
            <div className="p-1.5 bg-warning text-warning-foreground rounded-full shadow-lg">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          )}
          {isExpiringSoon && (
            <div className="p-1.5 bg-destructive text-destructive-foreground rounded-full shadow-lg">
              <Clock className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
        
        {/* Category badge */}
        {item.categories && (
          <span
            className="absolute bottom-2 left-2 text-[10px] px-3 py-1.5 rounded-full font-bold uppercase tracking-wide shadow-lg"
            style={{
              backgroundColor: item.categories.color,
              color: 'white',
            }}
          >
            {item.categories.name}
          </span>
        )}
      </div>
      
      <CardContent className="p-3">
        <p className="font-semibold text-sm truncate">{item.name}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-muted-foreground font-mono bg-muted px-2 py-1 rounded-md">
            {item.sku || '—'}
          </span>
          <div className="flex items-center gap-1.5">
            {!isOutOfStock && !isLowStock && totalStock > item.min_stock_level * 2 && (
              <TrendingUp className="w-3.5 h-3.5 text-success" />
            )}
            <span
              className={cn(
                'font-bold text-base',
                isOutOfStock ? 'text-destructive' : isLowStock ? 'text-warning' : 'text-success'
              )}
            >
              {displayStock}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium">{item.unit_of_measure}</span>
          </div>
        </div>

         {onPrintQR && (
           <Button
             variant="ghost"
             size="sm"
             className="w-full mt-2 h-8 rounded-xl text-xs hover:bg-primary/10"
             onClick={(e) => {
               e.stopPropagation();
               onPrintQR();
             }}
           >
             <QrCode className="w-3.5 h-3.5 mr-1.5" />
             Print QR
           </Button>
         )}
      </CardContent>
    </Card>
  );
}
