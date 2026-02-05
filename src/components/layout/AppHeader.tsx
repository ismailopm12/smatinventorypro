import { Warehouse, Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OfflineIndicator } from '@/components/OfflineIndicator';

interface AppHeaderProps {
  title: string;
  showNotifications?: boolean;
  onNotificationsClick?: () => void;
  showSearch?: boolean;
  onSearchClick?: () => void;
}

export function AppHeader({ 
  title, 
  showNotifications = true, 
  onNotificationsClick,
  showSearch = false,
  onSearchClick
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 glass border-b border-border/30">
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/30">
            <Warehouse className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">{title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Offline/Sync indicator */}
          <OfflineIndicator />
          
          {showSearch && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onSearchClick}
              className="rounded-xl hover:bg-muted w-10 h-10"
            >
              <Search className="w-5 h-5 text-muted-foreground" />
            </Button>
          )}
          
          {showNotifications && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onNotificationsClick}
              className="rounded-xl hover:bg-muted w-10 h-10 relative"
            >
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full ring-2 ring-background" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
