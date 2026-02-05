import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useUserRole } from '@/hooks/useUserRole';
import {
  User,
  Moon,
  Sun,
  LogOut,
  Bell,
  Shield,
  HelpCircle,
  ChevronRight,
  Laptop,
  FolderOpen,
  Package,
  Plus,
  Palette,
  Users,
  ShieldCheck,
  Database,
  FileSpreadsheet,
  Building2,
} from 'lucide-react';
import { QrCode } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CategoryDialog } from './items/CategoryDialog';
import { TeamManagement } from './settings/TeamManagement';
import { BackendExport } from './settings/BackendExport';
import { AlertSettings } from './settings/AlertSettings';
import { SecuritySettings } from './settings/SecuritySettings';
import { HelpSupport } from './settings/HelpSupport';
import { WarehouseManagement } from './settings/WarehouseManagement';
import { cn } from '@/lib/utils';
import { ReportsSection } from './ReportsSection';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { PrintLabels } from './settings/PrintLabels';

interface Category {
  id: string;
  name: string;
  color: string;
}

export function MoreSection() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { role, isAdmin } = useUserRole();
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showTeamManagement, setShowTeamManagement] = useState(false);
  const [showBackendExport, setShowBackendExport] = useState(false);
  const [showAlertSettings, setShowAlertSettings] = useState(false);
  const [showSecuritySettings, setShowSecuritySettings] = useState(false);
  const [showHelpSupport, setShowHelpSupport] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showPrintLabels, setShowPrintLabels] = useState(false);

  const { data: categories = [], refetch: refetchCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: itemCount = 0 } = useQuery({
    queryKey: ['item-count'],
    queryFn: async () => {
      const { count, error } = await supabase.from('items').select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: teamCount = 0 } = useQuery({
    queryKey: ['team-count'],
    queryFn: async () => {
      const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: warehouseCount = 0 } = useQuery({
    queryKey: ['warehouse-count'],
    queryFn: async () => {
      const { count, error } = await supabase.from('warehouses').select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* User Profile */}
      <Card className="border-0 bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
              <User className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">
                {profile?.full_name || user?.email || 'User'}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-[10px] h-5 gap-1",
                    isAdmin 
                      ? "bg-primary/10 text-primary border-primary/20" 
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {isAdmin ? (
                    <>
                      <ShieldCheck className="w-3 h-3" />
                      Admin
                    </>
                  ) : (
                    <>
                      <User className="w-3 h-3" />
                      Member
                    </>
                  )}
                </Badge>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="border-border/50">
          <CardContent className="p-2 text-center">
            <div className="w-8 h-8 mx-auto bg-primary/10 rounded-lg flex items-center justify-center mb-1">
              <Package className="w-4 h-4 text-primary" />
            </div>
            <p className="text-lg font-bold">{itemCount}</p>
            <p className="text-[10px] text-muted-foreground">Items</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-2 text-center">
            <div className="w-8 h-8 mx-auto bg-violet-100 dark:bg-violet-900/50 rounded-lg flex items-center justify-center mb-1">
              <FolderOpen className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
            <p className="text-lg font-bold">{categories.length}</p>
            <p className="text-[10px] text-muted-foreground">Categories</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-2 text-center">
            <div className="w-8 h-8 mx-auto bg-emerald-100 dark:bg-emerald-900/50 rounded-lg flex items-center justify-center mb-1">
              <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-lg font-bold">{teamCount}</p>
            <p className="text-[10px] text-muted-foreground">Team</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-2 text-center">
            <div className="w-8 h-8 mx-auto bg-amber-100 dark:bg-amber-900/50 rounded-lg flex items-center justify-center mb-1">
              <Building2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-lg font-bold">{warehouseCount}</p>
            <p className="text-[10px] text-muted-foreground">Warehouses</p>
          </CardContent>
        </Card>
      </div>

      {/* Warehouse Management */}
      <WarehouseManagement />

      {/* Team Management */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          <button 
            onClick={() => setShowTeamManagement(true)}
            className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-medium text-sm">Team Management</p>
                <p className="text-xs text-muted-foreground">
                  {teamCount} member{teamCount !== 1 ? 's' : ''} • {isAdmin ? 'Manage access' : 'View team'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </CardContent>
      </Card>

      {/* Backend Export */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          <button 
            onClick={() => setShowBackendExport(true)}
            className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-violet-500/20 to-violet-500/10 rounded-xl">
                <Database className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="text-left">
                <p className="font-medium text-sm">Backend Export</p>
                <p className="text-xs text-muted-foreground">
                  Export schema for new project
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </CardContent>
      </Card>

      {/* Reports */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          <button 
            onClick={() => setShowReports(true)}
            className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 rounded-xl">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-left">
                <p className="font-medium text-sm">Reports</p>
                <p className="text-xs text-muted-foreground">
                  View and export inventory reports
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </CardContent>
      </Card>

      {/* Categories Management */}
      {/* Print Labels */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          <button 
            onClick={() => setShowPrintLabels(true)}
            className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-cyan-500/20 to-cyan-500/10 rounded-xl">
                <QrCode className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div className="text-left">
                <p className="font-medium text-sm">Print Labels</p>
                <p className="text-xs text-muted-foreground">
                  View and print QR codes for items
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary" />
              Categories
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingCategory(null);
                setShowCategoryDialog(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No categories yet
            </p>
          ) : (
            <div className="space-y-2">
              {categories.slice(0, 5).map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    setEditingCategory(category);
                    setShowCategoryDialog(true);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors text-left"
                >
                  <div
                    className="w-4 h-4 rounded-full ring-2 ring-white dark:ring-background shadow-sm"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="flex-1 font-medium text-sm">{category.name}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
              {categories.length > 5 && (
                <p className="text-xs text-center text-muted-foreground py-2">
                  +{categories.length - 5} more categories
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Appearance</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setTheme('light')}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-xl transition-all",
                theme === 'light' 
                  ? "bg-amber-100 dark:bg-amber-900/50 ring-2 ring-amber-500" 
                  : "hover:bg-muted"
              )}
            >
              <Sun className={cn("w-5 h-5", theme === 'light' ? "text-amber-600" : "text-muted-foreground")} />
              <span className="text-xs font-medium">Light</span>
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-xl transition-all",
                theme === 'dark' 
                  ? "bg-indigo-100 dark:bg-indigo-900/50 ring-2 ring-indigo-500" 
                  : "hover:bg-muted"
              )}
            >
              <Moon className={cn("w-5 h-5", theme === 'dark' ? "text-indigo-600 dark:text-indigo-400" : "text-muted-foreground")} />
              <span className="text-xs font-medium">Dark</span>
            </button>
            <button
              onClick={() => setTheme('system')}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-xl transition-all",
                theme === 'system' 
                  ? "bg-primary/10 ring-2 ring-primary" 
                  : "hover:bg-muted"
              )}
            >
              <Laptop className={cn("w-5 h-5", theme === 'system' ? "text-primary" : "text-muted-foreground")} />
              <span className="text-xs font-medium">Auto</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 pt-0">
          <button 
            onClick={() => setShowAlertSettings(true)}
            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted transition-colors touch-feedback"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
                <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-sm font-medium">Alert Settings</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          <button 
            onClick={() => setShowSecuritySettings(true)}
            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted transition-colors touch-feedback"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-sm font-medium">Security</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          <button 
            onClick={() => setShowHelpSupport(true)}
            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted transition-colors touch-feedback"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm font-medium">Help & Support</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Button
        variant="outline"
        className="w-full text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300 dark:border-rose-900 dark:hover:bg-rose-950/50"
        onClick={handleSignOut}
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sign Out
      </Button>

      {/* App Info */}
      <p className="text-center text-xs text-muted-foreground pt-2">
        Warehouse Inventory v1.0.0
      </p>

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

      {/* Team Management Dialog */}
      <TeamManagement 
        open={showTeamManagement} 
        onOpenChange={setShowTeamManagement} 
      />

      {/* Backend Export Dialog */}
      <BackendExport 
        open={showBackendExport} 
        onOpenChange={setShowBackendExport} 
      />

      {/* Alert Settings Dialog */}
      <AlertSettings
        open={showAlertSettings}
        onOpenChange={setShowAlertSettings}
      />

      {/* Security Settings Dialog */}
      <SecuritySettings
        open={showSecuritySettings}
        onOpenChange={setShowSecuritySettings}
      />

      {/* Help & Support Dialog */}
      <HelpSupport
        open={showHelpSupport}
        onOpenChange={setShowHelpSupport}
      />

      {/* Reports Sheet */}
      <Sheet open={showReports} onOpenChange={setShowReports}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl border-0 p-0">
          <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto mt-2 mb-2" />
          <SheetHeader className="px-4 pb-2">
            <SheetTitle className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-xl">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              </div>
              Reports & Analytics
            </SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto h-[calc(90vh-60px)]">
            <ReportsSection />
          </div>
        </SheetContent>
      </Sheet>

      {/* Print Labels */}
      <PrintLabels
        open={showPrintLabels}
        onOpenChange={setShowPrintLabels}
      />
    </div>
  );
}
