import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Search, Plus, List, Package, SlidersHorizontal, TableProperties, ScanLine } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ItemCard } from './items/ItemCard';
import { ItemsTableView } from './items/ItemsTableView';
import { ItemDetails } from './items/ItemDetails';
import { AddItemDialog } from './items/AddItemDialog';
import { CategoryDialog } from './items/CategoryDialog';
import { ScannerMenu } from '@/components/scanner/ScannerMenu';
import { StockInDialog } from './items/StockInDialog';
import { StockOutDialog } from './items/StockOutDialog';
import { cn } from '@/lib/utils';
import { ItemQRCode } from '@/components/items/ItemQRCode';

interface Category {
  id: string;
  name: string;
  color: string;
}

type ViewMode = 'list' | 'table';

const viewModeIcons = {
  list: List,
  table: TableProperties,
};

const viewModeOrder: ViewMode[] = ['list', 'table'];

interface ItemsProps {
  scannerAction?: { type: string; data?: any } | null;
  onClearScannerAction?: () => void;
}

export function Items({ scannerAction, onClearScannerAction }: ItemsProps = {}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showScannerMenu, setShowScannerMenu] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState<string>('');
  const [stockInItem, setStockInItem] = useState<any>(null);
  const [stockOutItem, setStockOutItem] = useState<any>(null);
   const [qrCodeItem, setQrCodeItem] = useState<{ id: string; name: string; sku?: string | null; barcode?: string | null } | null>(null);

  // Handle scanner action from bottom nav
  useEffect(() => {
    if (scannerAction) {
      switch (scannerAction.type) {
        case 'find':
          setSelectedItem(scannerAction.data);
          break;
        case 'add':
          setScannedBarcode(scannerAction.data);
          setShowAddDialog(true);
          break;
        case 'stockIn':
          setStockInItem(scannerAction.data);
          break;
        case 'stockOut':
          setStockOutItem(scannerAction.data);
          break;
      }
      onClearScannerAction?.();
    }
  }, [scannerAction, onClearScannerAction]);

  const cycleViewMode = () => {
    const currentIndex = viewModeOrder.indexOf(viewMode);
    const nextIndex = (currentIndex + 1) % viewModeOrder.length;
    setViewMode(viewModeOrder[nextIndex]);
  };

  // Fetch categories
  const { data: categories = [], refetch: refetchCategories } = useQuery({
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

  // Fetch items with batches
  const { data: items = [], refetch: refetchItems } = useQuery({
    queryKey: ['items', selectedCategory, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('items')
        .select('*, categories(name, color), batches(id, quantity, expiry_date, batch_number)')
        .order('name');

      if (selectedCategory) {
        query = query.eq('category_id', selectedCategory);
      }

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%,barcode.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const handleCategoryEdit = (category: Category) => {
    setEditingCategory(category);
    setShowCategoryDialog(true);
  };

  const handleScanItemFound = useCallback((itemId: string) => {
    setSelectedItem(itemId);
  }, []);

  const handleScanAddWithBarcode = useCallback((barcode: string) => {
    setScannedBarcode(barcode);
    setShowAddDialog(true);
  }, []);

  const handleScanStockIn = useCallback((item: any) => {
    setStockInItem(item);
  }, []);

  const handleScanStockOut = useCallback((item: any) => {
    setStockOutItem(item);
  }, []);

  if (selectedItem) {
    return (
      <ItemDetails
        itemId={selectedItem}
        onBack={() => {
          setSelectedItem(null);
          refetchItems();
        }}
      />
    );
  }

  const CurrentViewIcon = viewModeIcons[viewMode];
  const nextViewMode = viewModeOrder[(viewModeOrder.indexOf(viewMode) + 1) % viewModeOrder.length];
  const NextViewIcon = viewModeIcons[nextViewMode];

  return (
    <div className="p-4 space-y-4">
      {/* Search and Actions */}
      <div className="flex items-center gap-2 animate-fade-in">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-12 rounded-2xl bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary shadow-inner text-sm"
          />
        </div>
        
        {/* View Mode Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={cycleViewMode}
          className="relative rounded-2xl h-12 w-12 bg-muted/50 hover:bg-muted overflow-hidden group shadow-inner touch-feedback"
        >
          <div className="transition-all duration-300 group-active:scale-90">
            <NextViewIcon className="w-5 h-5" />
          </div>
        </Button>
        
        <Button 
          size="icon"
          onClick={() => setShowAddDialog(true)}
          className="rounded-2xl h-12 w-12 shadow-xl shadow-primary/30 touch-feedback"
        >
          <Plus className="w-5 h-5" />
        </Button>
        
        {/* Scanner Button */}
        <Button
          size="icon"
          variant="secondary"
          onClick={() => setShowScannerMenu(true)}
          className="rounded-2xl h-12 w-12 bg-gradient-to-br from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 shadow-xl shadow-violet-500/30 touch-feedback"
        >
          <ScanLine className="w-5 h-5" />
        </Button>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 animate-fade-in" style={{ animationDelay: '50ms' }}>
        <div className="overflow-x-auto hide-scrollbar flex-1 -mx-4 px-4">
          <div className="flex gap-2 py-1">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm transition-all whitespace-nowrap touch-feedback",
                selectedCategory === null
                  ? "bg-primary text-primary-foreground shadow-xl shadow-primary/30"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted active:scale-95"
              )}
            >
              <Package className="w-4 h-4" />
              All
            </button>
            {categories.map((category, index) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                onDoubleClick={() => handleCategoryEdit(category)}
                className={cn(
                  "flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm transition-all whitespace-nowrap touch-feedback",
                  selectedCategory === category.id
                    ? "shadow-xl"
                    : "bg-muted/60 hover:bg-muted active:scale-95"
                )}
                style={selectedCategory === category.id ? {
                  backgroundColor: category.color,
                  color: 'white',
                  boxShadow: `0 10px 30px -5px ${category.color}50`,
                } : undefined}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full ring-2 ring-white/30"
                  style={{ 
                    backgroundColor: selectedCategory === category.id ? 'white' : category.color 
                  }}
                />
                {category.name}
              </button>
            ))}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setEditingCategory(null);
            setShowCategoryDialog(true);
          }}
          className="flex-shrink-0 rounded-2xl h-12 w-12 bg-muted/50 hover:bg-muted shadow-inner touch-feedback"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </Button>
      </div>

      {/* View Mode Label */}
      <div className="flex items-center gap-2 animate-fade-in" style={{ animationDelay: '100ms' }}>
        <CurrentViewIcon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {viewMode} View
        </span>
        <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
        <span className="text-xs text-muted-foreground font-medium">
          {items.length} items
        </span>
      </div>

      {/* Items List/Table */}
      {items.length === 0 ? (
        <div className="text-center py-20 animate-fade-in">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-muted to-muted/50 rounded-3xl flex items-center justify-center mb-5 shadow-lg">
            <Package className="w-10 h-10 text-muted-foreground/50" />
          </div>
          <p className="text-lg font-semibold text-foreground">No items found</p>
          <p className="text-sm text-muted-foreground mt-1.5">
            {searchQuery ? 'Try a different search term' : 'Add your first inventory item'}
          </p>
          <Button
            className="mt-6 rounded-2xl shadow-xl shadow-primary/30 h-12 px-6 touch-feedback"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
      ) : viewMode === 'table' ? (
        <ItemsTableView 
          items={items} 
          onItemClick={(id) => setSelectedItem(id)} 
        />
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div 
              key={item.id} 
              className="animate-fade-in"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <ItemCard
                item={item}
                viewMode="list"
                onClick={() => setSelectedItem(item.id)}
               onPrintQR={() => setQrCodeItem({
                 id: item.id,
                 name: item.name,
                 sku: item.sku,
                 barcode: item.barcode,
               })}
              />
            </div>
          ))}
        </div>
      )}

      {/* Add Item Dialog - only render when open */}
      {showAddDialog && (
        <AddItemDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          categories={categories}
          initialBarcode={scannedBarcode}
          onSuccess={() => {
            setShowAddDialog(false);
            setScannedBarcode('');
            refetchItems();
          }}
        />
      )}

      {/* Category Dialog */}
      <CategoryDialog
        open={showCategoryDialog}
        onOpenChange={setShowCategoryDialog}
        category={editingCategory}
        onSuccess={() => {
          setShowCategoryDialog(false);
          setEditingCategory(null);
          refetchCategories();
        }}
      />

      {/* Scanner Menu */}
      <ScannerMenu
        open={showScannerMenu}
        onOpenChange={setShowScannerMenu}
        onItemFound={handleScanItemFound}
        onAddWithBarcode={handleScanAddWithBarcode}
        onStockIn={handleScanStockIn}
        onStockOut={handleScanStockOut}
      />

      {/* Stock In Dialog from Scanner */}
      {stockInItem && (
        <StockInDialog
          open={!!stockInItem}
          onOpenChange={(open) => !open && setStockInItem(null)}
          item={stockInItem}
          onSuccess={() => {
            setStockInItem(null);
            refetchItems();
          }}
        />
      )}

      {/* Stock Out Dialog from Scanner */}
      {stockOutItem && (
        <StockOutDialog
          open={!!stockOutItem}
          onOpenChange={(open) => !open && setStockOutItem(null)}
          item={stockOutItem}
          onSuccess={() => {
            setStockOutItem(null);
            refetchItems();
          }}
        />
      )}

     {/* QR Code Dialog */}
     {qrCodeItem && (
       <ItemQRCode
         open={!!qrCodeItem}
         onOpenChange={(open) => !open && setQrCodeItem(null)}
         item={qrCodeItem}
       />
     )}
    </div>
  );
}
