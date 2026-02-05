import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Package, Edit, Plus, Minus, MapPin, Barcode, Building2, Calendar, Trash2, MoreVertical, DollarSign, QrCode, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StockInDialog } from './StockInDialog';
import { StockOutDialog } from './StockOutDialog';
import { EditItemDialog } from './EditItemDialog';
import { DeleteItemDialog } from './DeleteItemDialog';
import { ItemQRCode } from '@/components/items/ItemQRCode';
import { ItemStockChart } from '@/components/items/ItemStockChart';
import { cn } from '@/lib/utils';

interface ItemDetailsProps {
  itemId: string;
  onBack: () => void;
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

export function ItemDetails({ itemId, onBack }: ItemDetailsProps) {
  const [showStockIn, setShowStockIn] = useState(false);
  const [showStockOut, setShowStockOut] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);

  const { data: item, refetch } = useQuery({
    queryKey: ['item', itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select('*, categories(name, color), batches(*)')
        .eq('id', itemId)
        .single();

      if (error) throw error;
      return data;
    },
  });

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

  if (!item) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalStock = item.batches?.reduce((sum: number, b: { quantity: number }) => sum + Number(b.quantity), 0) || 0;
  const displayStock = formatQuantity(totalStock, item.unit_of_measure || 'pcs');
  const isLowStock = totalStock <= (item.min_stock_level || 0);
  const stockPercentage = Math.min((totalStock / (item.max_stock_level || 1000)) * 100, 100);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="sticky top-14 z-30 bg-background/95 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center gap-3 p-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBack}
            className="rounded-xl hover:bg-muted"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="font-bold text-lg truncate flex-1">{item.name}</h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-muted">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl">
              <DropdownMenuItem 
                onClick={() => setShowEdit(true)}
                className="rounded-lg cursor-pointer"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Item
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setShowQRCode(true)}
                className="rounded-lg cursor-pointer"
              >
                <QrCode className="w-4 h-4 mr-2" />
                QR Code
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setShowDelete(true)}
                className="rounded-lg cursor-pointer text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Item
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Image and Basic Info */}
        <Card className="overflow-hidden border-0 shadow-lg shadow-primary/5">
          <CardContent className="p-0">
            <div className="relative h-40 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Package className="w-16 h-16 text-muted-foreground/30" />
              )}
              {item.categories && (
                <Badge
                  className="absolute bottom-3 left-3 shadow-lg border-0"
                  style={{
                    backgroundColor: item.categories.color,
                    color: 'white',
                  }}
                >
                  {item.categories.name}
                </Badge>
              )}
            </div>
            <div className="p-4">
              <h3 className="font-bold text-xl">{item.name}</h3>
              {item.description && (
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {item.description}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stock Level */}
        <Card className={cn(
          "border-0 shadow-lg transition-all",
          isLowStock 
            ? 'bg-gradient-to-br from-warning/10 to-warning/5 shadow-warning/10' 
            : 'bg-gradient-to-br from-success/10 to-success/5 shadow-success/10'
        )}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Current Stock</p>
                <p
                  className={cn(
                    'text-4xl font-bold mt-1',
                    isLowStock ? 'text-warning' : 'text-success'
                  )}
                >
                  {displayStock}
                  <span className="text-lg font-normal text-muted-foreground ml-2">
                    {item.unit_of_measure}
                  </span>
                </p>
              </div>
              <div className={cn(
                "p-4 rounded-2xl",
                isLowStock ? 'bg-warning/20' : 'bg-success/20'
              )}>
                <Package className={cn(
                  "w-8 h-8",
                  isLowStock ? 'text-warning' : 'text-success'
                )} />
              </div>
            </div>

            {/* Stock Progress Bar */}
            <div className="space-y-2">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    isLowStock ? 'bg-warning' : 'bg-success'
                  )}
                  style={{ width: `${stockPercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Min: {item.min_stock_level}</span>
                <span>Max: {item.max_stock_level}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-5">
              <Button
                variant="outline"
                className="flex-1 h-12 rounded-xl border-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive font-semibold"
                onClick={() => setShowStockOut(true)}
                disabled={totalStock === 0}
              >
                <Minus className="w-5 h-5 mr-2" />
                Stock Out
              </Button>
              <Button 
                className="flex-1 h-12 rounded-xl font-semibold shadow-lg shadow-primary/25"
                onClick={() => setShowStockIn(true)}
              >
                <Plus className="w-5 h-5 mr-2" />
                Stock In
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Extended Details */}
        <Card className="border-0 shadow-lg shadow-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 pt-0">
            {item.sku && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                <div className="p-2.5 bg-primary/10 rounded-xl">
                  <Barcode className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">SKU</p>
                  <p className="text-sm font-semibold">{item.sku}</p>
                </div>
              </div>
            )}
            {item.barcode && (
              <div 
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                onClick={() => setShowQRCode(true)}
              >
                <div className="p-2.5 bg-violet-100 dark:bg-violet-900/50 rounded-xl">
                  <QrCode className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Barcode / QR</p>
                  <p className="text-sm font-semibold">{item.barcode}</p>
                </div>
                <Printer className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
            {item.price !== null && item.price > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl">
                  <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Price</p>
                  <p className="text-sm font-semibold">${item.price.toFixed(2)}</p>
                </div>
              </div>
            )}
            {item.supplier_name && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                <div className="p-2.5 bg-amber-100 dark:bg-amber-900/50 rounded-xl">
                  <Building2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Supplier</p>
                  <p className="text-sm font-semibold">{item.supplier_name}</p>
                </div>
              </div>
            )}
            {item.warehouse_location && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 col-span-2">
                <div className="p-2.5 bg-rose-100 dark:bg-rose-900/50 rounded-xl">
                  <MapPin className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Location</p>
                  <p className="text-sm font-semibold">{item.warehouse_location}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Batches */}
        <Card className="border-0 shadow-lg shadow-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              Batches
              <Badge variant="secondary" className="text-xs font-semibold">
                {item.batches?.length || 0}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {item.batches && item.batches.length > 0 ? (
              <div className="space-y-2">
                {item.batches
                  .sort((a: { expiry_date: string | null }, b: { expiry_date: string | null }) => {
                    if (!a.expiry_date) return 1;
                    if (!b.expiry_date) return -1;
                    return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
                  })
                  .map((batch: { id: string; batch_number: string; quantity: number; expiry_date: string | null }) => {
                    const isExpiringSoon = batch.expiry_date && 
                      new Date(batch.expiry_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                    const isExpired = batch.expiry_date && new Date(batch.expiry_date) < new Date();

                    return (
                      <div
                        key={batch.id}
                        className={cn(
                          'flex items-center justify-between p-4 rounded-xl transition-all',
                          isExpired 
                            ? 'bg-destructive/10 border border-destructive/20' 
                            : isExpiringSoon 
                              ? 'bg-warning/10 border border-warning/20' 
                              : 'bg-muted/50 border border-transparent hover:border-border'
                        )}
                      >
                        <div>
                          <p className="font-semibold">{batch.batch_number}</p>
                          {batch.expiry_date && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                              <span
                                className={cn(
                                  'text-xs font-medium',
                                  isExpired 
                                    ? 'text-destructive' 
                                    : isExpiringSoon 
                                      ? 'text-warning' 
                                      : 'text-muted-foreground'
                                )}
                              >
                                {isExpired ? 'Expired: ' : 'Exp: '}
                                {format(new Date(batch.expiry_date), 'MMM d, yyyy')}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className={cn(
                          "px-4 py-2 rounded-xl font-bold text-lg",
                          isExpired 
                            ? 'bg-destructive/20 text-destructive' 
                            : isExpiringSoon 
                              ? 'bg-warning/20 text-warning' 
                              : 'bg-success/10 text-success'
                        )}>
                          {formatQuantity(Number(batch.quantity), item.unit_of_measure || 'pcs')}
                          <span className="text-xs font-normal ml-1">{item.unit_of_measure}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-14 h-14 mx-auto bg-muted rounded-2xl flex items-center justify-center mb-3">
                  <Package className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">No batches yet</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Add stock to create batches</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stock Movement Trends */}
        <Card className="border-0 shadow-lg shadow-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Stock Trends</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ItemStockChart itemId={itemId} compact={false} />
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <StockInDialog
        open={showStockIn}
        onOpenChange={setShowStockIn}
        item={item}
        onSuccess={() => {
          setShowStockIn(false);
          refetch();
        }}
      />

      <StockOutDialog
        open={showStockOut}
        onOpenChange={setShowStockOut}
        item={item}
        onSuccess={() => {
          setShowStockOut(false);
          refetch();
        }}
      />

      <EditItemDialog
        open={showEdit}
        onOpenChange={setShowEdit}
        item={item}
        categories={categories}
        onSuccess={() => {
          setShowEdit(false);
          refetch();
        }}
      />

      <DeleteItemDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        itemId={item.id}
        itemName={item.name}
        onSuccess={() => {
          setShowDelete(false);
          onBack();
        }}
      />

      <ItemQRCode
        open={showQRCode}
        onOpenChange={setShowQRCode}
        item={{
          id: item.id,
          name: item.name,
          sku: item.sku,
          barcode: item.barcode,
        }}
      />
    </div>
  );
}
