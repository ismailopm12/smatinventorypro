import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Warehouse, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WelcomePopupProps {
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WelcomePopup({ userName, open, onOpenChange }: WelcomePopupProps) {
  const [showContent, setShowContent] = useState(false);
  const [showName, setShowName] = useState(false);
  const [showSparkles, setShowSparkles] = useState(false);

  useEffect(() => {
    if (open) {
      // Stagger animations
      const t1 = setTimeout(() => setShowContent(true), 100);
      const t2 = setTimeout(() => setShowName(true), 400);
      const t3 = setTimeout(() => setShowSparkles(true), 700);
      const t4 = setTimeout(() => onOpenChange(false), 3500);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
      };
    } else {
      setShowContent(false);
      setShowName(false);
      setShowSparkles(false);
    }
  }, [open, onOpenChange]);

  const firstName = userName?.split(' ')[0] || 'User';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-md border-0 bg-transparent shadow-none p-0 gap-0"
        hideCloseButton
      >
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/80 to-primary/60 p-8 text-primary-foreground">
          {/* Animated background circles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary-foreground/10 rounded-full animate-pulse" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-primary-foreground/10 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
            <div className="absolute top-1/2 right-10 w-20 h-20 bg-primary-foreground/5 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
          </div>

          {/* Sparkles */}
          <div className={cn(
            "absolute inset-0 pointer-events-none transition-opacity duration-500",
            showSparkles ? "opacity-100" : "opacity-0"
          )}>
            {[...Array(6)].map((_, i) => (
              <Sparkles
                key={i}
                className={cn(
                  "absolute w-4 h-4 text-warning animate-pulse",
                )}
                style={{
                  top: `${15 + Math.random() * 70}%`,
                  left: `${10 + Math.random() * 80}%`,
                  animationDelay: `${i * 0.2}s`,
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              />
            ))}
          </div>

          <div className="relative z-10 text-center">
            {/* Logo */}
            <div className={cn(
              "mx-auto w-20 h-20 bg-primary-foreground/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 transition-all duration-700",
              showContent ? "scale-100 opacity-100" : "scale-50 opacity-0"
            )}>
              <Warehouse className="w-10 h-10 text-primary-foreground" />
            </div>

            {/* Welcome text */}
            <div className={cn(
              "transition-all duration-500",
              showContent ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            )}>
              <p className="text-primary-foreground/80 text-lg font-medium mb-2">Welcome back</p>
            </div>

            {/* Name */}
            <div className={cn(
              "transition-all duration-700",
              showName ? "translate-y-0 opacity-100 scale-100" : "translate-y-4 opacity-0 scale-95"
            )}>
              <h1 className="text-3xl font-bold mb-4 tracking-tight text-primary-foreground">
                {firstName}! 👋
              </h1>
            </div>

            {/* Subtitle */}
            <div className={cn(
              "transition-all duration-500 delay-300",
              showName ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            )}>
              <p className="text-primary-foreground/70 text-sm">
                to your Smart Inventory Pro
              </p>
            </div>

            {/* Progress bar */}
            <div className="mt-8 h-1 bg-primary-foreground/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary-foreground/60 rounded-full transition-all duration-[3000ms] ease-linear"
                style={{ width: open ? '100%' : '0%' }}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}