 import { useRef } from 'react';
 import { QRCodeSVG } from 'qrcode.react';
 import { Button } from '@/components/ui/button';
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
 } from '@/components/ui/dialog';
 import { Printer, Download, QrCode } from 'lucide-react';
 import { toast } from 'sonner';
 
 interface ItemQRCodeProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   item: {
     id: string;
     name: string;
     sku?: string | null;
     barcode?: string | null;
   };
 }
 
 export function ItemQRCode({ open, onOpenChange, item }: ItemQRCodeProps) {
   const qrRef = useRef<HTMLDivElement>(null);
 
   // Generate QR data - use barcode if available, otherwise use item ID
   const qrData = item.barcode || item.sku || item.id;
 
   const handlePrint = () => {
     const printContent = qrRef.current;
     if (!printContent) return;
 
      const printHtml = `
       <!DOCTYPE html>
       <html>
         <head>
           <title>QR Code - ${item.name}</title>
           <style>
             * { margin: 0; padding: 0; box-sizing: border-box; }
             body { 
               font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
               display: flex;
               flex-direction: column;
               align-items: center;
               justify-content: center;
               min-height: 100vh;
               padding: 20px;
             }
             .qr-container {
               text-align: center;
               padding: 24px;
               border: 2px solid #e5e7eb;
               border-radius: 16px;
             }
             .item-name {
               font-size: 18px;
               font-weight: 700;
               margin-bottom: 8px;
               color: #111827;
             }
             .item-code {
               font-size: 12px;
               color: #6b7280;
               margin-bottom: 16px;
             }
             .qr-code {
               margin: 0 auto;
             }
              .qr-code svg {
                width: 280px;
                height: 280px;
                shape-rendering: crispEdges;
              }
             .barcode-text {
               margin-top: 12px;
               font-size: 14px;
               font-weight: 600;
               letter-spacing: 2px;
               color: #374151;
             }
             @media print {
               body { padding: 0; }
               .qr-container { border: none; }
             }
           </style>
         </head>
         <body>
           <div class="qr-container">
             <div class="item-name">${item.name}</div>
             ${item.sku ? `<div class="item-code">SKU: ${item.sku}</div>` : ''}
             <div class="qr-code">
               ${printContent.querySelector('svg')?.outerHTML || ''}
             </div>
             <div class="barcode-text">${qrData}</div>
           </div>
         </body>
       </html>
      `;

      // Try popup printing first
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(printHtml);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.focus();
          printWindow.print();
          printWindow.onafterprint = () => printWindow.close();
        };
        return;
      }

      // Fallback: print via hidden iframe (works when popups are blocked)
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const win = iframe.contentWindow;
      const doc = win?.document;

      if (!win || !doc) {
        iframe.remove();
        toast.error('Printing is not supported on this device/browser');
        return;
      }

      doc.open();
      doc.write(printHtml);
      doc.close();

      win.focus();
      win.print();
      win.onafterprint = () => iframe.remove();
   };
 
   const handleDownload = () => {
     const svg = qrRef.current?.querySelector('svg');
     if (!svg) return;
 
     const svgData = new XMLSerializer().serializeToString(svg);
     const canvas = document.createElement('canvas');
     const ctx = canvas.getContext('2d');
     const img = new Image();
     
     img.onload = () => {
       canvas.width = img.width * 2;
       canvas.height = img.height * 2;
       ctx?.scale(2, 2);
       ctx?.drawImage(img, 0, 0);
       
       const link = document.createElement('a');
       link.download = `qr-${item.name.replace(/\s+/g, '-').toLowerCase()}.png`;
       link.href = canvas.toDataURL('image/png');
       link.click();
       toast.success('QR code downloaded!');
     };
     
     img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
   };
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="sm:max-w-md rounded-3xl border-0 shadow-2xl">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <div className="p-2 bg-primary/10 rounded-xl">
               <QrCode className="w-5 h-5 text-primary" />
             </div>
             QR Code
           </DialogTitle>
         </DialogHeader>
         
         <div className="flex flex-col items-center py-6">
           <div 
             ref={qrRef}
             className="p-6 bg-white rounded-2xl shadow-lg border"
           >
             <QRCodeSVG
               value={qrData}
              size={240}
               level="H"
              includeMargin={true}
               className="mx-auto"
             />
           </div>
           
           <div className="mt-4 text-center">
             <p className="font-bold text-lg">{item.name}</p>
             {item.sku && (
               <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
             )}
             <p className="text-xs text-muted-foreground mt-1 font-mono tracking-wider">
               {qrData}
             </p>
           </div>
         </div>
 
         <div className="flex gap-3">
           <Button
             variant="outline"
             className="flex-1 h-12 rounded-xl"
             onClick={handleDownload}
           >
             <Download className="w-4 h-4 mr-2" />
             Download
           </Button>
           <Button
             className="flex-1 h-12 rounded-xl shadow-lg shadow-primary/25"
             onClick={handlePrint}
           >
             <Printer className="w-4 h-4 mr-2" />
             Print
           </Button>
         </div>
       </DialogContent>
     </Dialog>
   );
 }