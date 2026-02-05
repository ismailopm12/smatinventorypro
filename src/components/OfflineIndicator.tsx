import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Wifi, WifiOff, RefreshCw, Cloud, CloudOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { formatDistanceToNow } from 'date-fns';

export function OfflineIndicator() {
  const { 
    isOnline, 
    isSyncing, 
    pendingCount, 
    lastSyncTime,
    syncPendingOperations,
    refreshFromServer,
  } = useOfflineSync();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative rounded-xl h-10 w-10 transition-all duration-300",
            !isOnline && "bg-destructive/10"
          )}
        >
          {isOnline ? (
            <Cloud className={cn(
              "w-5 h-5 transition-colors",
              isSyncing ? "text-primary animate-pulse" : "text-success"
            )} />
          ) : (
            <CloudOff className="w-5 h-5 text-destructive" />
          )}
          
          {/* Pending indicator */}
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-warning text-warning-foreground text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce-in">
              {pendingCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-72 p-0 rounded-2xl overflow-hidden border-border/50 shadow-xl"
        align="end"
      >
        {/* Header */}
        <div className={cn(
          "p-4 flex items-center gap-3",
          isOnline ? "bg-success/10" : "bg-destructive/10"
        )}>
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            isOnline ? "bg-success/20" : "bg-destructive/20"
          )}>
            {isOnline ? (
              <Wifi className="w-5 h-5 text-success" />
            ) : (
              <WifiOff className="w-5 h-5 text-destructive" />
            )}
          </div>
          <div>
            <p className="font-semibold text-sm">
              {isOnline ? 'Online' : 'Offline'}
            </p>
            <p className="text-xs text-muted-foreground">
              {isOnline 
                ? isSyncing 
                  ? 'Syncing...' 
                  : 'All changes saved'
                : 'Changes saved locally'
              }
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Last sync time */}
          {lastSyncTime && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Last synced</span>
              <span className="font-medium">
                {formatDistanceToNow(lastSyncTime, { addSuffix: true })}
              </span>
            </div>
          )}

          {/* Pending changes */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Pending changes</span>
            <span className={cn(
              "font-semibold",
              pendingCount > 0 ? "text-warning" : "text-success"
            )}>
              {pendingCount}
            </span>
          </div>

          {/* Sync button */}
          {isOnline && (
            <Button
              onClick={pendingCount > 0 ? syncPendingOperations : refreshFromServer}
              disabled={isSyncing}
              className="w-full rounded-xl h-10 mt-2"
              variant={pendingCount > 0 ? "default" : "outline"}
            >
              <RefreshCw className={cn(
                "w-4 h-4 mr-2",
                isSyncing && "animate-spin"
              )} />
              {isSyncing 
                ? 'Syncing...' 
                : pendingCount > 0 
                  ? `Sync ${pendingCount} changes` 
                  : 'Refresh data'
              }
            </Button>
          )}

          {/* Offline message */}
          {!isOnline && (
            <p className="text-xs text-muted-foreground text-center py-2">
              Your changes will sync automatically when you're back online.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}