 import { useState, useEffect, useRef, useCallback } from 'react';
 import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, SwitchCamera, Flashlight, FlashlightOff, Scan, AlertCircle, CheckCircle2 } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { cn } from '@/lib/utils';
 import { playSuccessSound } from '@/lib/scan-sound';
import { Badge } from '@/components/ui/badge';
 
 interface BarcodeScannerProps {
   open: boolean;
   onClose: () => void;
   onScan: (barcode: string) => void;
   title?: string;
  continuous?: boolean;
  onContinuousScan?: (barcode: string) => void;
 }
 
export function BarcodeScanner({ 
  open, 
  onClose, 
  onScan, 
  title = "Scan Barcode",
  continuous = false,
  onContinuousScan
}: BarcodeScannerProps) {
   const [isScanning, setIsScanning] = useState(false);
   const [hasFlash, setHasFlash] = useState(false);
   const [flashOn, setFlashOn] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [scannedCount, setScannedCount] = useState(0);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
   const scannerRef = useRef<Html5Qrcode | null>(null);
   const containerRef = useRef<HTMLDivElement>(null);
  const lastScannedRef = useRef<string | null>(null);
  const scanCooldownRef = useRef<boolean>(false);
   const opIdRef = useRef(0);
   const startInProgressRef = useRef(false);
   const cooldownTimerRef = useRef<number | null>(null);
 
   const startScanner = useCallback(async () => {
     if (!containerRef.current) return;

     // Prevent overlapping start calls (can create multiple scanner instances and lost references)
     if (startInProgressRef.current) return;
     startInProgressRef.current = true;

     const opId = ++opIdRef.current;
     
     try {
       setError(null);
       
       // Stop existing scanner if any
       if (scannerRef.current) {
         try {
           await scannerRef.current.stop();
         } catch (e) {
           // Ignore stop errors
         }
         scannerRef.current = null;
       }
 
        const scanner = new Html5Qrcode("barcode-reader", {
         formatsToSupport: [
           Html5QrcodeSupportedFormats.QR_CODE,
           Html5QrcodeSupportedFormats.EAN_13,
           Html5QrcodeSupportedFormats.EAN_8,
           Html5QrcodeSupportedFormats.UPC_A,
           Html5QrcodeSupportedFormats.UPC_E,
           Html5QrcodeSupportedFormats.CODE_128,
           Html5QrcodeSupportedFormats.CODE_39,
           Html5QrcodeSupportedFormats.CODE_93,
           Html5QrcodeSupportedFormats.ITF,
           Html5QrcodeSupportedFormats.CODABAR,
           Html5QrcodeSupportedFormats.DATA_MATRIX,
           Html5QrcodeSupportedFormats.AZTEC,
         ],
          // Uses the browser's native BarcodeDetector API when available (usually much faster & more reliable)
          useBarCodeDetectorIfSupported: true,
         verbose: false,
       });
       
       scannerRef.current = scanner;
 
        await scanner.start(
         { facingMode },
         {
            fps: 30,
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              const width = Math.floor(Math.min(minEdge * 0.9, 400));
              const height = Math.floor(width * 0.65);
              return { width, height };
            },
           disableFlip: false,
           aspectRatio: 1.5,
         },
         (decodedText) => {
           // Success callback
          const trimmedCode = (decodedText || '').trim();

           // One-shot guard: while we're handling a scan (or stopping), ignore any extra decode events
           if (!trimmedCode || scanCooldownRef.current) return;
          
          if (continuous) {
            // Prevent duplicate scans within cooldown period
             if (trimmedCode === lastScannedRef.current) {
              return;
            }
            
            scanCooldownRef.current = true;
            lastScannedRef.current = trimmedCode;
            
            playSuccessSound();
            setScannedCount(prev => prev + 1);
            setLastScanned(trimmedCode);
            setShowSuccess(true);
            
            // Notify parent
            onContinuousScan?.(trimmedCode);
            
            // Reset cooldown after delay
            if (cooldownTimerRef.current) {
              window.clearTimeout(cooldownTimerRef.current);
            }
            cooldownTimerRef.current = window.setTimeout(() => {
              scanCooldownRef.current = false;
              setShowSuccess(false);
              lastScannedRef.current = null;
              cooldownTimerRef.current = null;
            }, 800);
          } else {
             // One-shot for single scan mode
             scanCooldownRef.current = true;
            playSuccessSound();
            onScan(trimmedCode);
            stopScanner();
            onClose();
          }
         },
         () => {
           // Error callback (continuous scanning, ignore)
         }
       );

        // If a stop/restart happened while we were starting, abort and cleanup.
        if (opId !== opIdRef.current) {
          try {
            await scanner.stop();
          } catch (e) {
            // Ignore stop errors
          }
          if (scannerRef.current === scanner) {
            scannerRef.current = null;
          }
          return;
        }
 
       setIsScanning(true);
 
       // Check flash availability
       try {
         const capabilities = scanner.getRunningTrackCameraCapabilities();
         if (capabilities.torchFeature().isSupported()) {
           setHasFlash(true);
         }
       } catch (e) {
         setHasFlash(false);
       }
     } catch (err: any) {
       console.error('Scanner error:', err);
       if (err.message?.includes('Permission')) {
         setError('Camera permission denied. Please allow camera access.');
       } else if (err.message?.includes('NotFoundError') || err.message?.includes('not found')) {
         setError('No camera found on this device.');
       } else {
         setError(err.message || 'Failed to start camera');
       }
      } finally {
        startInProgressRef.current = false;
     }
    }, [facingMode, onScan, onClose, continuous, onContinuousScan]);
 
   const stopScanner = useCallback(async () => {
      // Invalidate any in-flight start
      opIdRef.current += 1;

      if (cooldownTimerRef.current) {
        window.clearTimeout(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
      scanCooldownRef.current = false;
      setShowSuccess(false);

     if (scannerRef.current) {
       try {
         await scannerRef.current.stop();
       } catch (e) {
         // Ignore stop errors
       }
       scannerRef.current = null;
     }
     setIsScanning(false);
     setFlashOn(false);
     setHasFlash(false);
   }, []);

  const handleClose = () => {
    stopScanner();
    setScannedCount(0);
    setLastScanned(null);
    lastScannedRef.current = null;
    onClose();
  };
 
   const toggleFlash = async () => {
     if (!scannerRef.current || !hasFlash) return;
     
     try {
       const capabilities = scannerRef.current.getRunningTrackCameraCapabilities();
       const torchFeature = capabilities.torchFeature();
       if (flashOn) {
         await torchFeature.apply(false);
         setFlashOn(false);
       } else {
         await torchFeature.apply(true);
         setFlashOn(true);
       }
     } catch (e) {
       console.error('Flash toggle error:', e);
     }
   };
 
   const switchCamera = async () => {
     await stopScanner();
     setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
   };
 
    useEffect(() => {
      if (!open) {
        stopScanner();
        return;
      }

      // Start/restart scanner (also runs when facingMode changes)
      const timer = window.setTimeout(() => {
        startScanner();
      }, 50);

      return () => {
        window.clearTimeout(timer);
        stopScanner();
      };
    }, [open, facingMode, startScanner, stopScanner]);
 
   useEffect(() => {
     return () => {
       stopScanner();
     };
   }, [stopScanner]);
 
   if (!open) return null;
 
   return (
     <div className="fixed inset-0 z-50 bg-black animate-fade-in">
       {/* Header */}
       <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
         <Button
           variant="ghost"
           size="icon"
          onClick={handleClose}
           className="h-12 w-12 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 touch-feedback"
         >
           <X className="w-6 h-6" />
         </Button>
         
        <div className="text-center">
          <h2 className="text-white font-bold text-lg">{title}</h2>
          {continuous && scannedCount > 0 && (
            <Badge variant="secondary" className="mt-1 bg-primary/80 text-primary-foreground">
              {scannedCount} scanned
            </Badge>
          )}
        </div>
         
         <div className="w-12" /> {/* Spacer */}
       </div>
 
       {/* Scanner Container */}
       <div ref={containerRef} className="h-full flex flex-col items-center justify-center">
         {error ? (
           <div className="text-center p-8 animate-fade-in">
             <div className="w-20 h-20 mx-auto bg-destructive/20 rounded-full flex items-center justify-center mb-4">
               <AlertCircle className="w-10 h-10 text-destructive" />
             </div>
             <p className="text-white text-lg font-semibold mb-2">Camera Error</p>
             <p className="text-white/70 text-sm mb-6 max-w-xs mx-auto">{error}</p>
             <Button
               onClick={startScanner}
               className="rounded-2xl h-12 px-6 bg-white text-black hover:bg-white/90 touch-feedback"
             >
               Try Again
             </Button>
           </div>
         ) : (
           <>
             {/* Camera View - Full screen */}
             <div className="relative w-full h-full">
               <div id="barcode-reader" className="w-full h-full" />
               
               {/* Scanning overlay with corner guides */}
               <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className={cn(
                  "relative transition-all duration-300",
                  showSuccess && "scale-95"
                )} style={{ width: '85%', maxWidth: 350, height: 220 }}>
                   {/* Corner brackets */}
                  <div className={cn(
                    "absolute -top-1 -left-1 w-10 h-10 border-t-4 border-l-4 rounded-tl-xl transition-colors duration-300",
                    showSuccess ? "border-success" : "border-primary"
                  )} />
                  <div className={cn(
                    "absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 rounded-tr-xl transition-colors duration-300",
                    showSuccess ? "border-success" : "border-primary"
                  )} />
                  <div className={cn(
                    "absolute -bottom-1 -left-1 w-10 h-10 border-b-4 border-l-4 rounded-bl-xl transition-colors duration-300",
                    showSuccess ? "border-success" : "border-primary"
                  )} />
                  <div className={cn(
                    "absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 rounded-br-xl transition-colors duration-300",
                    showSuccess ? "border-success" : "border-primary"
                  )} />
                   
                  {/* Success indicator or scanning line */}
                  {showSuccess ? (
                    <div className="absolute inset-0 flex items-center justify-center animate-fade-in">
                      <div className="bg-success/20 backdrop-blur-sm rounded-2xl p-4">
                        <CheckCircle2 className="w-12 h-12 text-success" />
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="absolute left-4 right-4 h-1 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full"
                      style={{ 
                        animation: 'scanLine 2s ease-in-out infinite'
                      }} 
                    />
                  )}
                 </div>
               </div>
             </div>
 
             {/* Instructions - positioned at bottom */}
            <div className="absolute bottom-32 left-0 right-0 text-center animate-fade-in px-4">
              {showSuccess && lastScanned ? (
                <div className="animate-fade-in">
                  <p className="text-success font-semibold mb-1">Scanned!</p>
                  <p className="text-white/80 text-sm font-mono truncate max-w-xs mx-auto">{lastScanned}</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-2 text-white/90 mb-2">
                    <Scan className="w-5 h-5" />
                    <span className="font-semibold">
                      {continuous ? "Scan items continuously" : "Position barcode in frame"}
                    </span>
                  </div>
                  <p className="text-white/60 text-sm">
                    {continuous 
                      ? "Keep scanning - tap Done when finished"
                      : "Auto-detects QR, EAN, UPC, Code 128 & more"
                    }
                  </p>
                </>
              )}
             </div>
           </>
         )}
       </div>
 
       {/* Bottom Controls */}
       {isScanning && !error && (
         <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent animate-fade-in">
          <div className="flex items-center justify-center gap-4">
             {hasFlash && (
               <Button
                 variant="ghost"
                 size="icon"
                 onClick={toggleFlash}
                 className={cn(
                  "h-12 w-12 rounded-full backdrop-blur-sm touch-feedback transition-all",
                   flashOn 
                     ? "bg-primary text-primary-foreground" 
                     : "bg-white/10 text-white hover:bg-white/20"
                 )}
               >
                {flashOn ? <Flashlight className="w-5 h-5" /> : <FlashlightOff className="w-5 h-5" />}
               </Button>
             )}
             
            {continuous && (
              <Button
                onClick={handleClose}
                className="h-12 px-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 touch-feedback font-semibold"
              >
                Done {scannedCount > 0 && `(${scannedCount})`}
              </Button>
            )}
            
             <Button
               variant="ghost"
               size="icon"
               onClick={switchCamera}
              className="h-12 w-12 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 touch-feedback"
             >
              <SwitchCamera className="w-5 h-5" />
             </Button>
           </div>
         </div>
       )}
 
       {/* Scanning line animation styles */}
       <style>{`
         @keyframes scanLine {
           0% { top: 10%; opacity: 0.3; }
           50% { top: 85%; opacity: 1; }
           100% { top: 10%; opacity: 0.3; }
         }
         #barcode-reader {
           width: 100% !important;
           height: 100% !important;
           border: none !important;
         }
         #barcode-reader video {
           object-fit: cover !important;
           width: 100% !important;
           height: 100% !important;
         }
         #barcode-reader__scan_region {
           background: transparent !important;
           position: absolute !important;
           top: 0 !important;
           left: 0 !important;
           width: 100% !important;
           height: 100% !important;
         }
         #barcode-reader__scan_region img {
           display: none !important;
         }
         #barcode-reader__dashboard {
           display: none !important;
         }
         #barcode-reader__header_message {
           display: none !important;
         }
         #qr-shaded-region {
           border-width: 0 !important;
         }
       `}</style>
     </div>
   );
 }