import { useState } from 'react';
import { BottomNav, TabType } from './BottomNav';
import { AppHeader } from './AppHeader';
import { Dashboard } from '@/components/sections/Dashboard';
import { Items } from '@/components/sections/Items';
import { HistorySection } from '@/components/sections/HistorySection';
import { MoreSection } from '@/components/sections/MoreSection';
import { NotificationsSheet } from '@/components/notifications/NotificationsSheet';
import { ScannerMenu } from '@/components/scanner/ScannerMenu';

const headerTitles: Record<TabType, string> = {
  dashboard: 'Dashboard',
  items: 'Inventory',
  history: 'History',
  more: 'Settings',
};

export function MainLayout() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scannerAction, setScannerAction] = useState<{ type: string; data?: any } | null>(null);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'items':
        return <Items scannerAction={scannerAction} onClearScannerAction={() => setScannerAction(null)} />;
      case 'history':
        return <HistorySection />;
      case 'more':
        return <MoreSection />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader 
        title={headerTitles[activeTab]} 
        onNotificationsClick={() => setShowNotifications(true)}
      />
      
      <main className="pb-24 max-w-lg mx-auto">
        <div key={activeTab} className="animate-fade-in">
          {renderContent()}
        </div>
      </main>

      <BottomNav 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        onScannerOpen={() => setShowScanner(true)}
      />

      <ScannerMenu 
        open={showScanner} 
        onOpenChange={setShowScanner}
        onItemFound={(itemId) => {
          setActiveTab('items');
          setScannerAction({ type: 'find', data: itemId });
        }}
        onAddWithBarcode={(barcode) => {
          setActiveTab('items');
          setScannerAction({ type: 'add', data: barcode });
        }}
        onStockIn={(item) => {
          setActiveTab('items');
          setScannerAction({ type: 'stockIn', data: item });
        }}
        onStockOut={(item) => {
          setActiveTab('items');
          setScannerAction({ type: 'stockOut', data: item });
        }}
      />
      
      <NotificationsSheet 
        open={showNotifications} 
        onOpenChange={setShowNotifications} 
      />
    </div>
  );
}
