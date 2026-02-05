 import { useState } from 'react';
 import { useQuery } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { QRCodeSVG } from 'qrcode.react';
 import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Checkbox } from '@/components/ui/checkbox';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { Printer, Search, QrCode, CheckSquare, Square, Loader2 } from 'lucide-react';
 import { toast } from 'sonner';
 import { cn } from '@/lib/utils';
 
 interface PrintLabelsProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
 }
 
 interface Item {
   id: string;
   name: string;
   sku: string | null;
   barcode: string | null;
 }
 
 export function PrintLabels({ open, onOpenChange }: PrintLabelsProps) {
   const [search, setSearch] = useState('');
   const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
   const [isPrinting, setIsPrinting] = useState(false);
 
   const { data: items = [], isLoading } = useQuery({
     queryKey: ['items-for-labels'],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('items')
         .select('id, name, sku, barcode')
         .order('name');
       if (error) throw error;
       return data as Item[];
     },
     enabled: open,
   });
 
   const filteredItems = items.filter((item) => {
     const q = search.toLowerCase();
     return (
       item.name.toLowerCase().includes(q) ||
       item.sku?.toLowerCase().includes(q) ||
       item.barcode?.toLowerCase().includes(q)
     );
   });
 
   const toggleItem = (id: string) => {
     setSelectedIds((prev) => {
       const next = new Set(prev);
       if (next.has(id)) {
         next.delete(id);
       } else {
         next.add(id);
       }
       return next;
     });
   };
 
   const toggleAll = () => {
     if (selectedIds.size === filteredItems.length) {
       setSelectedIds(new Set());
     } else {
       setSelectedIds(new Set(filteredItems.map((i) => i.id)));
     }
   };
 
   const selectedItems = items.filter((i) => selectedIds.has(i.id));
 
   const handlePrint = async () => {
     if (selectedItems.length === 0) {
       toast.error('Select at least one item to print');
       return;
     }
 
     setIsPrinting(true);
 
     try {
       // Generate QR codes as data URLs before creating print window
       const qrDataUrls: Record<string, string> = {};
       const QRCode = await import('qrcode');
       
       for (const item of selectedItems) {
         const qrData = item.barcode || item.sku || item.id;
         const canvas = document.createElement('canvas');
         await QRCode.toCanvas(canvas, qrData, { width: 120, margin: 1 });
         qrDataUrls[item.id] = canvas.toDataURL('image/png');
       }
 
       const labelsHtml = selectedItems
         .map((item) => {
           const qrData = item.barcode || item.sku || item.id;
           const qrImageUrl = qrDataUrls[item.id];
           return `<div class="label">
             <div class="item-name">${item.name}</div>
             ${item.sku ? `<div class="item-sku">SKU: ${item.sku}</div>` : ''}
             <div class="qr-wrapper"><img src="${qrImageUrl}" alt="QR" /></div>
             <div class="barcode-text">${qrData}</div>
           </div>`;
         })
         .join('');
 
       const printHtml = `<!DOCTYPE html>
 <html>
 <head>
 <title>Print Labels</title>
 <style>
 * { margin: 0; padding: 0; box-sizing: border-box; }
 body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 12px; }
 .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
 .label { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; text-align: center; page-break-inside: avoid; }
 .item-name { font-size: 14px; font-weight: 700; margin-bottom: 4px; color: #111827; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
 .item-sku { font-size: 10px; color: #6b7280; margin-bottom: 8px; }
 .qr-wrapper { display: flex; justify-content: center; margin-bottom: 8px; }
 .qr-wrapper img { width: 120px; height: 120px; }
 .barcode-text { font-size: 11px; font-weight: 600; letter-spacing: 1px; color: #374151; word-break: break-all; }
 @media print { body { padding: 0; } .label { border-color: #d1d5db; } }
 </style>
 </head>
 <body>
 <div class="grid">${labelsHtml}</div>
 <script>window.onload = function() { setTimeout(function() { window.print(); }, 200); };<\/script>
 </body>
 </html>`;
 
       const printWindow = window.open('', '_blank');
       if (printWindow) {
         printWindow.document.open();
         printWindow.document.write(printHtml);
         printWindow.document.close();
       } else {
         toast.error('Please allow popups to print labels');
       }
     } catch (error) {
       console.error('Print error:', error);
       toast.error('Failed to generate labels');
     } finally {
       setIsPrinting(false);
     }
   };
 
   return (
     <Sheet open={open} onOpenChange={onOpenChange}>
       <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl border-0 p-0 flex flex-col">
         <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto mt-2 mb-2" />
         <SheetHeader className="px-4 pb-2">
           <SheetTitle className="flex items-center gap-3">
             <div className="p-2 bg-primary/10 rounded-xl">
               <QrCode className="w-5 h-5 text-primary" />
             </div>
             Print Labels
           </SheetTitle>
         </SheetHeader>
 
         <div className="px-4 pb-3 space-y-3">
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
             <Input
               placeholder="Search items..."
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="pl-9 h-11 rounded-xl bg-muted/50 border-0"
             />
           </div>
           <div className="flex items-center justify-between">
             <button
               onClick={toggleAll}
               className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
             >
               {selectedIds.size === filteredItems.length && filteredItems.length > 0 ? (
                 <CheckSquare className="w-4 h-4 text-primary" />
               ) : (
                 <Square className="w-4 h-4" />
               )}
               Select All ({filteredItems.length})
             </button>
             <span className="text-sm font-medium text-primary">
               {selectedIds.size} selected
             </span>
           </div>
         </div>
 
         <ScrollArea className="flex-1 px-4">
           {isLoading ? (
             <div className="py-8 text-center text-muted-foreground">Loading items...</div>
           ) : filteredItems.length === 0 ? (
             <div className="py-8 text-center text-muted-foreground">No items found</div>
           ) : (
             <div className="space-y-2 pb-4">
               {filteredItems.map((item) => {
                 const isSelected = selectedIds.has(item.id);
                 const qrData = item.barcode || item.sku || item.id;
                 return (
                   <button
                     key={item.id}
                     onClick={() => toggleItem(item.id)}
                     className={cn(
                       'w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left',
                       isSelected
                         ? 'bg-primary/10 ring-2 ring-primary/30'
                         : 'bg-muted/50 hover:bg-muted'
                     )}
                   >
                     <Checkbox checked={isSelected} className="pointer-events-none" />
                     <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border shrink-0">
                       <QRCodeSVG value={qrData} size={32} level="L" />
                     </div>
                     <div className="flex-1 min-w-0">
                       <p className="font-medium text-sm truncate">{item.name}</p>
                       <p className="text-xs text-muted-foreground truncate">
                         {item.barcode || item.sku || 'No code'}
                       </p>
                     </div>
                   </button>
                 );
               })}
             </div>
           )}
         </ScrollArea>
 
         <div className="p-4 border-t bg-background">
           <Button
             onClick={handlePrint}
             disabled={selectedIds.size === 0 || isPrinting}
             className="w-full h-12 rounded-xl shadow-lg shadow-primary/25"
           >
             {isPrinting ? (
               <>
                 <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                 Generating...
               </>
             ) : (
               <>
                 <Printer className="w-5 h-5 mr-2" />
                 Print {selectedIds.size > 0 ? `${selectedIds.size} Labels` : 'Labels'}
               </>
             )}
           </Button>
         </div>
       </SheetContent>
     </Sheet>
   );
 }