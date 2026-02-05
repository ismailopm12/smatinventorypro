import { LayoutDashboard, Package, History, MoreHorizontal, ScanBarcode } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';

type TabType = 'dashboard' | 'items' | 'history' | 'more';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onScannerOpen?: () => void;
}

type TabItem = {
  id: TabType | 'scanner';
  label: string;
  icon: typeof LayoutDashboard;
  isCenter?: boolean;
};

const tabs: TabItem[] = [
  { id: 'dashboard' as const, label: 'Home', icon: LayoutDashboard },
  { id: 'items' as const, label: 'Items', icon: Package },
  { id: 'scanner', label: 'Scan', icon: ScanBarcode, isCenter: true },
  { id: 'history' as const, label: 'History', icon: History },
  { id: 'more' as const, label: 'More', icon: MoreHorizontal },
];

export function BottomNav({ activeTab, onTabChange, onScannerOpen }: BottomNavProps) {
  const [pressedTab, setPressedTab] = useState<TabType | null>(null);
  const [mounted, setMounted] = useState(false);
  const [scannerPulse, setScannerPulse] = useState(false);
  const prevActiveTab = useRef<TabType>(activeTab);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    prevActiveTab.current = activeTab;
  }, [activeTab]);

  const handleTabClick = (tabId: TabType | 'scanner') => {
    if (tabId === 'scanner') {
      setScannerPulse(true);
      setTimeout(() => setScannerPulse(false), 300);
      onScannerOpen?.();
      return;
    }
    setPressedTab(tabId);
    onTabChange(tabId);
    setTimeout(() => setPressedTab(null), 150);
  };

  return (
    <>
      {/* Animated gradient glow behind nav */}
      <div 
        className={cn(
          "fixed bottom-0 left-0 right-0 h-24 pointer-events-none z-40",
          "bg-gradient-to-t from-background via-background/80 to-transparent",
          "transition-opacity duration-500",
          mounted ? "opacity-100" : "opacity-0"
        )}
      />
      
      <nav 
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 border-t border-border/10 pb-safe",
          "bg-background/90 backdrop-blur-2xl",
          "shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.12)]",
          "transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
          mounted ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
        )}
      >
      <div className="flex items-center justify-around h-[72px] max-w-lg mx-auto px-2">
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id;
          const isPressed = pressedTab === tab.id;
          const Icon = tab.icon;
          const isCenter = 'isCenter' in tab && tab.isCenter;

          if (isCenter) {
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={cn(
                  'relative flex flex-col items-center justify-center flex-1 h-full',
                  'transition-all duration-300 ease-out group'
                )}
                style={{
                  animationDelay: mounted ? `${index * 60}ms` : '0ms',
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                  transition: `all 0.5s cubic-bezier(0.16,1,0.3,1) ${index * 60}ms`
                }}
              >
                <div className="absolute -top-7 flex flex-col items-center">
                  {/* Outer glow ring */}
                  <div
                    className={cn(
                      "absolute inset-0 w-16 h-16 -m-1 rounded-[20px] transition-all duration-500",
                      "bg-gradient-to-br from-primary/40 to-primary/20 blur-lg",
                      scannerPulse ? "scale-125 opacity-100" : "scale-100 opacity-60"
                    )}
                  />

                  {/* Main button */}
                  <div
                    className={cn(
                      "relative w-[58px] h-[58px] rounded-[18px] flex items-center justify-center",
                      "bg-gradient-to-br from-primary via-primary to-primary/85",
                      "shadow-[0_6px_24px_-4px_hsl(var(--primary)/0.6),inset_0_1px_0_hsl(0_0%_100%/0.2)]",
                      "transition-all duration-300 ease-out",
                      "group-active:scale-90 group-hover:shadow-[0_8px_32px_-4px_hsl(var(--primary)/0.7)]",
                      scannerPulse && "scale-95"
                    )}
                  >
                    {/* Animated pulse ring */}
                    <div
                      className={cn(
                        "absolute inset-0 rounded-[18px] bg-primary/30",
                        "animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite]"
                      )}
                    />

                    {/* Inner highlight */}
                    <div className="absolute inset-[3px] rounded-[14px] bg-gradient-to-br from-white/25 via-transparent to-transparent" />

                    {/* Icon with bounce animation */}
                    <Icon
                      className={cn(
                        "w-7 h-7 text-primary-foreground relative z-10 transition-transform duration-200",
                        "group-hover:scale-110",
                        scannerPulse && "scale-90"
                      )}
                      strokeWidth={2.5}
                    />
                  </div>

                  {/* Label */}
                  <span className={cn(
                    "text-[10px] font-bold mt-2 transition-all duration-300",
                    "bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent"
                  )}>
                    {tab.label}
                  </span>
                </div>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={cn(
              'relative flex flex-col items-center justify-center flex-1 h-full gap-0.5',
              'transition-all duration-300 ease-out rounded-2xl mx-0.5 group'
              )}
              style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(16px)',
              transition: `all 0.5s cubic-bezier(0.16,1,0.3,1) ${index * 60}ms`
              }}
            >
              {/* Animated background pill */}
            <div
                className={cn(
                "absolute inset-x-1 inset-y-1 rounded-2xl transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]",
                isActive
                  ? "bg-primary/12 scale-100 opacity-100"
                  : "bg-transparent scale-90 opacity-0 group-hover:bg-muted/50 group-hover:scale-100 group-hover:opacity-100"
                )}
              />

              {/* Top indicator line with glow */}
            <div
                className={cn(
                "absolute -top-[1px] h-[3px] rounded-full transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]",
                isActive
                  ? "w-10 bg-gradient-to-r from-primary/80 via-primary to-primary/80 shadow-[0_0_16px_4px_hsl(var(--primary)/0.4)]"
                    : "w-0 bg-transparent"
                )}
              />

            {/* Icon container with lift animation */}
            <div
                className={cn(
                'relative z-10 p-2.5 rounded-xl transition-all duration-300 ease-out',
                isActive && 'transform -translate-y-1',
                isPressed && 'scale-90'
                )}
              >
                <Icon
                  className={cn(
                    'w-[22px] h-[22px] transition-all duration-300 ease-out',
                  isActive
                    ? 'text-primary drop-shadow-[0_0_12px_hsl(var(--primary)/0.5)]'
                    : 'text-muted-foreground group-hover:text-foreground/70'
                  )}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />

              {/* Active dot indicator */}
              <div
                className={cn(
                  "absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary transition-all duration-300",
                  isActive ? "scale-100 opacity-100" : "scale-0 opacity-0"
                )}
              />
              </div>

            {/* Label with smooth transition */}
              <span
                className={cn(
                'relative z-10 text-[10px] font-semibold transition-all duration-300 ease-out',
                isActive
                  ? 'text-primary opacity-100 translate-y-0'
                  : 'text-muted-foreground/70 opacity-90 translate-y-0 group-hover:text-foreground/70'
                )}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
      </nav>
    </>
  );
}

export type { TabType };
