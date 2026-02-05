import { useRef, useState } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from 'sonner';
import { z } from 'zod';
 import { 
   ScanLine, 
   Plus, 
   ArrowDownToLine, 
   ArrowUpFromLine, 
   Search,
  Repeat
 } from 'lucide-react';
 import {
   Sheet,
   SheetContent,
   SheetHeader,
   SheetTitle,
 } from '@/components/ui/sheet';
 import { BarcodeScanner } from './BarcodeScanner';
 import { cn } from '@/lib/utils';
import { playErrorSound } from '@/lib/scan-sound';
 
type ScanAction = 'find' | 'add' | 'stock_in' | 'stock_out' | 'continuous';

const scanCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(128);

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 
 interface ScannerMenuProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onItemFound: (itemId: string) => void;
   onAddWithBarcode: (barcode: string) => void;
   onStockIn: (item: any) => void;
   onStockOut: (item: any) => void;
 }
 
 const scanActions = [
   {
     id: 'find' as ScanAction,
     title: 'Find Item',
     description: 'Search for an existing item by barcode',
     icon: Search,
     color: 'from-blue-500 to-cyan-500',
     shadowColor: 'shadow-blue-500/30',
   },
  {
    id: 'continuous' as ScanAction,
    title: 'Continuous Scan',
    description: 'Scan multiple items without closing',
    icon: Repeat,
    color: 'from-amber-500 to-orange-500',
    shadowColor: 'shadow-amber-500/30',
  },
   {
     id: 'add' as ScanAction,
     title: 'Add New Item',
     description: 'Create new item with scanned barcode',
     icon: Plus,
     color: 'from-primary to-violet-500',
     shadowColor: 'shadow-primary/30',
   },
   {
     id: 'stock_in' as ScanAction,
     title: 'Stock In',
     description: 'Add stock to existing item',
     icon: ArrowDownToLine,
     color: 'from-success to-emerald-500',
     shadowColor: 'shadow-success/30',
   },
   {
     id: 'stock_out' as ScanAction,
     title: 'Stock Out',
     description: 'Remove stock from existing item',
     icon: ArrowUpFromLine,
     color: 'from-destructive to-rose-500',
     shadowColor: 'shadow-destructive/30',
   },
 ];
 
 export function ScannerMenu({ 
   open, 
   onOpenChange, 
   onItemFound, 
   onAddWithBarcode,
   onStockIn,
   onStockOut 
 }: ScannerMenuProps) {
   const [selectedAction, setSelectedAction] = useState<ScanAction | null>(null);
   const [showScanner, setShowScanner] = useState(false);

  // Safety net: prevent repeated scan callbacks (e.g., if the camera callback fires twice)
  const scanGuardRef = useRef<{ code: string; at: number } | null>(null);
  const shouldIgnoreScan = (code: string) => {
    const now = Date.now();
    const last = scanGuardRef.current;
    if (last && last.code === code && now - last.at < 1200) return true;
    scanGuardRef.current = { code, at: now };
    return false;
  };
 
   const handleActionSelect = (action: ScanAction) => {
     setSelectedAction(action);
     setShowScanner(true);
   };
 
   const handleScan = async (barcode: string) => {
    const parsed = scanCodeSchema.safeParse(barcode);
    if (!parsed.success) {
      playErrorSound();
      toast.error('Invalid code', { description: 'Please scan a valid barcode/QR.' });
      return;
    }
    const code = parsed.data;

    if (shouldIgnoreScan(code)) return;

     setShowScanner(false);
     
     if (selectedAction === 'add') {
       // For add, just pass the barcode to the add dialog
      onAddWithBarcode(code);
       onOpenChange(false);
       setSelectedAction(null);
       return;
     }
 
      // For other actions, find the item first
     try {
        const isUuid = uuidRegex.test(code);
        const orFilter = isUuid
          ? `barcode.eq.${code},sku.eq.${code},id.eq.${code}`
          : `barcode.eq.${code},sku.eq.${code}`;

        const { data: items, error } = await supabase
          .from('items')
          .select('*, categories(name, color), batches(id, quantity, expiry_date, batch_number)')
          .or(orFilter)
          .limit(25);
 
        if (error) throw error;

        const item =
          items?.find((i) => i?.barcode === code) ??
          items?.find((i) => i?.sku === code) ??
          (isUuid ? items?.find((i) => i?.id === code) : undefined) ??
          items?.[0];

       if (!item) {
          playErrorSound();
         toast.error('Item not found', {
            description: `No item found with code: ${code}`,
           action: {
             label: 'Add New',
              onClick: () => onAddWithBarcode(code),
           },
         });
         onOpenChange(false);
         setSelectedAction(null);
         return;
       }
 
       // Execute the action
       switch (selectedAction) {
         case 'find':
           onItemFound(item.id);
           toast.success(`Found: ${item.name}`);
           break;
         case 'stock_in':
           onStockIn(item);
           toast.success(`Ready to stock in: ${item.name}`);
           break;
         case 'stock_out':
           onStockOut(item);
           toast.success(`Ready to stock out: ${item.name}`);
           break;
       }
 
       onOpenChange(false);
       setSelectedAction(null);
     } catch (error: any) {
        playErrorSound();
       toast.error('Scan failed', { description: error.message });
     }
   };
 
  const handleContinuousScan = async (barcode: string) => {
    const parsed = scanCodeSchema.safeParse(barcode);
    if (!parsed.success) {
      playErrorSound();
      toast.error('Invalid code', { description: 'Please scan a valid barcode/QR.' });
      return;
    }
    const code = parsed.data;

     if (shouldIgnoreScan(code)) return;

    try {
       const isUuid = uuidRegex.test(code);
       const orFilter = isUuid
         ? `barcode.eq.${code},sku.eq.${code},id.eq.${code}`
         : `barcode.eq.${code},sku.eq.${code}`;

       const { data: items, error } = await supabase
         .from('items')
         .select('*, categories(name, color)')
         .or(orFilter)
         .limit(25);

       if (error) throw error;

       const item =
         items?.find((i) => i?.barcode === code) ??
         items?.find((i) => i?.sku === code) ??
         (isUuid ? items?.find((i) => i?.id === code) : undefined) ??
         items?.[0];

      if (item) {
        toast.success(`Found: ${item.name}`, {
          description: `SKU: ${item.sku || 'N/A'}`,
          duration: 2000,
        });
      } else {
        playErrorSound();
        toast.error('Item not found', {
           description: code,
          duration: 2000,
        });
      }
    } catch (error: any) {
      playErrorSound();
      toast.error('Scan error', { description: error.message });
    }
  };

  const handleContinuousClose = () => {
    setShowScanner(false);
    setSelectedAction(null);
    onOpenChange(false);
  };

   const handleClose = () => {
     setShowScanner(false);
     setSelectedAction(null);
   };
 
   return (
     <>
       <Sheet open={open && !showScanner} onOpenChange={onOpenChange}>
         <SheetContent side="bottom" className="rounded-t-3xl border-0 px-4 pb-8 pt-2">
           {/* Handle */}
           <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto mb-4" />
           
           <SheetHeader className="text-left mb-6">
             <SheetTitle className="flex items-center gap-3 text-xl">
               <div className="p-2.5 bg-gradient-to-br from-primary to-violet-500 rounded-2xl text-white">
                 <ScanLine className="w-5 h-5" />
               </div>
               Barcode Scanner
             </SheetTitle>
           </SheetHeader>
 
           <div className="space-y-3">
             {scanActions.map((action, index) => {
               const Icon = action.icon;
               return (
                 <button
                   key={action.id}
                   onClick={() => handleActionSelect(action.id)}
                   className={cn(
                     "w-full flex items-center gap-4 p-4 rounded-2xl bg-muted/50 hover:bg-muted",
                     "transition-all duration-200 touch-feedback animate-fade-in text-left"
                   )}
                   style={{ animationDelay: `${index * 50}ms` }}
                 >
                   <div className={cn(
                     "p-3 rounded-2xl bg-gradient-to-br text-white shadow-xl",
                     action.color,
                     action.shadowColor
                   )}>
                     <Icon className="w-5 h-5" />
                   </div>
                   <div className="flex-1">
                     <p className="font-semibold text-foreground">{action.title}</p>
                     <p className="text-sm text-muted-foreground">{action.description}</p>
                   </div>
                 </button>
               );
             })}
           </div>
         </SheetContent>
       </Sheet>
 
       {/* Full screen scanner */}
      {selectedAction === 'continuous' ? (
        <BarcodeScanner
          open={showScanner}
          onClose={handleContinuousClose}
          onScan={() => {}}
          continuous={true}
          onContinuousScan={handleContinuousScan}
          title="Continuous Scan"
        />
      ) : (
        <BarcodeScanner
          open={showScanner}
          onClose={handleClose}
          onScan={handleScan}
          title={selectedAction ? scanActions.find(a => a.id === selectedAction)?.title : 'Scan Barcode'}
        />
      )}
     </>
   );
 }