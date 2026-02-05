 import { useState, useEffect } from 'react';
 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/contexts/AuthContext';
 import { toast } from 'sonner';
 import { Bell, AlertTriangle, Clock, Package, Loader2, Save, CheckCircle2 } from 'lucide-react';
 import {
   Sheet,
   SheetContent,
   SheetHeader,
   SheetTitle,
 } from '@/components/ui/sheet';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Switch } from '@/components/ui/switch';
 import { cn } from '@/lib/utils';
 
 interface AlertSettingsProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
 }
 
 export function AlertSettings({ open, onOpenChange }: AlertSettingsProps) {
   const { user } = useAuth();
   const queryClient = useQueryClient();
   const [showSuccess, setShowSuccess] = useState(false);
   
   const [settings, setSettings] = useState({
     low_stock_enabled: true,
     low_stock_threshold: 10,
     expiry_enabled: true,
     expiry_warning_days: 30,
     stock_received_enabled: true,
   });
 
   const { data: savedSettings, isLoading } = useQuery({
     queryKey: ['alert-settings', user?.id],
     queryFn: async () => {
       if (!user?.id) return null;
       const { data, error } = await supabase
         .from('alert_settings')
         .select('*')
         .eq('user_id', user.id)
         .maybeSingle();
       if (error) throw error;
       return data;
     },
     enabled: !!user?.id && open,
   });
 
   useEffect(() => {
     if (savedSettings) {
       setSettings({
         low_stock_enabled: savedSettings.low_stock_enabled ?? true,
         low_stock_threshold: savedSettings.low_stock_threshold ?? 10,
         expiry_enabled: savedSettings.expiry_enabled ?? true,
         expiry_warning_days: savedSettings.expiry_warning_days ?? 30,
         stock_received_enabled: savedSettings.stock_received_enabled ?? true,
       });
     }
   }, [savedSettings]);
 
   const saveMutation = useMutation({
     mutationFn: async () => {
       if (!user?.id) throw new Error('Not authenticated');
       
       const { error } = await supabase
         .from('alert_settings')
         .upsert({
           user_id: user.id,
           ...settings,
           updated_at: new Date().toISOString(),
         }, { onConflict: 'user_id' });
       
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['alert-settings'] });
       setShowSuccess(true);
       toast.success('Alert settings saved');
       setTimeout(() => {
         setShowSuccess(false);
         onOpenChange(false);
       }, 800);
     },
     onError: (error: any) => {
       toast.error(error.message || 'Failed to save settings');
     },
   });
 
   return (
     <Sheet open={open} onOpenChange={onOpenChange}>
       <SheetContent side="bottom" className="rounded-t-3xl border-0 px-0 pb-8 pt-0 max-h-[90vh] overflow-hidden">
         {/* Success Overlay */}
         {showSuccess && (
           <div className="absolute inset-0 bg-success/95 z-50 flex flex-col items-center justify-center animate-fade-in rounded-t-3xl">
             <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-4 animate-scale-in">
               <CheckCircle2 className="w-12 h-12 text-white" />
             </div>
             <p className="text-white text-xl font-bold">Settings Saved!</p>
           </div>
         )}
 
         {/* Handle */}
         <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto mt-3 mb-2" />
 
         {/* Header */}
         <div className="bg-gradient-to-br from-amber-500 via-amber-500 to-orange-500 p-6 pb-8 mx-4 rounded-3xl mb-4">
           <SheetHeader>
             <SheetTitle className="flex items-center gap-4 text-white">
               <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm animate-fade-in">
                 <Bell className="w-6 h-6" />
               </div>
               <div className="animate-fade-in" style={{ animationDelay: '50ms' }}>
                 <span className="text-xl font-bold block">Alert Settings</span>
                 <p className="text-sm font-normal text-white/80 mt-0.5">Configure notifications</p>
               </div>
             </SheetTitle>
           </SheetHeader>
         </div>
 
         {/* Content */}
         <div className="px-4 space-y-4 overflow-y-auto max-h-[calc(90vh-200px)]">
           {isLoading ? (
             <div className="flex items-center justify-center py-12">
               <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
             </div>
           ) : (
             <>
               {/* Low Stock Alerts */}
               <div className="p-4 bg-muted/50 rounded-2xl space-y-4 animate-fade-in">
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className="p-2.5 bg-amber-500/20 rounded-xl">
                       <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                     </div>
                     <div>
                       <p className="font-semibold text-sm">Low Stock Alerts</p>
                       <p className="text-xs text-muted-foreground">Get notified when stock is low</p>
                     </div>
                   </div>
                   <Switch
                     checked={settings.low_stock_enabled}
                     onCheckedChange={(checked) => setSettings({ ...settings, low_stock_enabled: checked })}
                   />
                 </div>
                 {settings.low_stock_enabled && (
                   <div className="pl-14 animate-fade-in">
                     <Label className="text-xs text-muted-foreground">Default threshold</Label>
                     <div className="flex items-center gap-2 mt-1">
                       <Input
                         type="number"
                         value={settings.low_stock_threshold}
                         onChange={(e) => setSettings({ ...settings, low_stock_threshold: parseInt(e.target.value) || 0 })}
                         className="h-10 rounded-xl bg-background border-0 w-24 text-center font-semibold"
                       />
                       <span className="text-sm text-muted-foreground">units</span>
                     </div>
                   </div>
                 )}
               </div>
 
               {/* Expiry Alerts */}
               <div className="p-4 bg-muted/50 rounded-2xl space-y-4 animate-fade-in" style={{ animationDelay: '50ms' }}>
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className="p-2.5 bg-rose-500/20 rounded-xl">
                       <Clock className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                     </div>
                     <div>
                       <p className="font-semibold text-sm">Expiry Alerts</p>
                       <p className="text-xs text-muted-foreground">Warn before items expire</p>
                     </div>
                   </div>
                   <Switch
                     checked={settings.expiry_enabled}
                     onCheckedChange={(checked) => setSettings({ ...settings, expiry_enabled: checked })}
                   />
                 </div>
                 {settings.expiry_enabled && (
                   <div className="pl-14 animate-fade-in">
                     <Label className="text-xs text-muted-foreground">Warning period</Label>
                     <div className="flex items-center gap-2 mt-1">
                       <Input
                         type="number"
                         value={settings.expiry_warning_days}
                         onChange={(e) => setSettings({ ...settings, expiry_warning_days: parseInt(e.target.value) || 0 })}
                         className="h-10 rounded-xl bg-background border-0 w-24 text-center font-semibold"
                       />
                       <span className="text-sm text-muted-foreground">days before</span>
                     </div>
                   </div>
                 )}
               </div>
 
               {/* Stock Received Alerts */}
               <div className="p-4 bg-muted/50 rounded-2xl animate-fade-in" style={{ animationDelay: '100ms' }}>
                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className="p-2.5 bg-success/20 rounded-xl">
                       <Package className="w-5 h-5 text-success" />
                     </div>
                     <div>
                       <p className="font-semibold text-sm">Stock Received</p>
                       <p className="text-xs text-muted-foreground">Notify when stock is added</p>
                     </div>
                   </div>
                   <Switch
                     checked={settings.stock_received_enabled}
                     onCheckedChange={(checked) => setSettings({ ...settings, stock_received_enabled: checked })}
                   />
                 </div>
               </div>
 
               {/* Save Button */}
               <Button
                 onClick={() => saveMutation.mutate()}
                 disabled={saveMutation.isPending}
                 className="w-full h-14 rounded-2xl font-bold shadow-xl shadow-primary/25 mt-6 touch-feedback"
               >
                 {saveMutation.isPending ? (
                   <>
                     <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                     Saving...
                   </>
                 ) : (
                   <>
                     <Save className="w-5 h-5 mr-2" />
                     Save Settings
                   </>
                 )}
               </Button>
             </>
           )}
         </div>
       </SheetContent>
     </Sheet>
   );
 }