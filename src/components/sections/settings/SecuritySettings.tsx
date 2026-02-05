 import { useState } from 'react';
 import { useAuth } from '@/contexts/AuthContext';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from 'sonner';
 import { 
   Shield, 
   Key, 
   Smartphone, 
   Mail, 
   Loader2, 
   CheckCircle2,
   Lock,
   Eye,
   EyeOff
 } from 'lucide-react';
 import {
   Sheet,
   SheetContent,
   SheetHeader,
   SheetTitle,
 } from '@/components/ui/sheet';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 
 interface SecuritySettingsProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
 }
 
 export function SecuritySettings({ open, onOpenChange }: SecuritySettingsProps) {
   const { user } = useAuth();
   const [showPasswordForm, setShowPasswordForm] = useState(false);
   const [loading, setLoading] = useState(false);
   const [showSuccess, setShowSuccess] = useState(false);
   const [showPassword, setShowPassword] = useState(false);
   const [passwords, setPasswords] = useState({
     newPassword: '',
     confirmPassword: '',
   });
 
   const handleChangePassword = async () => {
     if (passwords.newPassword.length < 6) {
       toast.error('Password must be at least 6 characters');
       return;
     }
     
     if (passwords.newPassword !== passwords.confirmPassword) {
       toast.error('Passwords do not match');
       return;
     }
 
     setLoading(true);
     try {
       const { error } = await supabase.auth.updateUser({
         password: passwords.newPassword,
       });
 
       if (error) throw error;
 
       setShowSuccess(true);
       toast.success('Password updated successfully');
       setPasswords({ newPassword: '', confirmPassword: '' });
       
       setTimeout(() => {
         setShowSuccess(false);
         setShowPasswordForm(false);
       }, 1000);
     } catch (error: any) {
       toast.error(error.message || 'Failed to update password');
     } finally {
       setLoading(false);
     }
   };
 
   const handleSendResetEmail = async () => {
     if (!user?.email) {
       toast.error('No email found');
       return;
     }
 
     setLoading(true);
     try {
       const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
         redirectTo: window.location.origin,
       });
 
       if (error) throw error;
 
       toast.success('Password reset email sent', {
         description: 'Check your inbox for the reset link',
       });
     } catch (error: any) {
       toast.error(error.message || 'Failed to send reset email');
     } finally {
       setLoading(false);
     }
   };
 
   return (
     <Sheet open={open} onOpenChange={onOpenChange}>
       <SheetContent side="bottom" className="rounded-t-3xl border-0 px-0 pb-8 pt-0 max-h-[90vh] overflow-hidden">
         {/* Success Overlay */}
         {showSuccess && (
           <div className="absolute inset-0 bg-success/95 z-50 flex flex-col items-center justify-center animate-fade-in rounded-t-3xl">
             <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-4 animate-scale-in">
               <CheckCircle2 className="w-12 h-12 text-white" />
             </div>
             <p className="text-white text-xl font-bold">Password Updated!</p>
           </div>
         )}
 
         {/* Handle */}
         <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto mt-3 mb-2" />
 
         {/* Header */}
         <div className="bg-gradient-to-br from-emerald-500 via-emerald-500 to-teal-500 p-6 pb-8 mx-4 rounded-3xl mb-4">
           <SheetHeader>
             <SheetTitle className="flex items-center gap-4 text-white">
               <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm animate-fade-in">
                 <Shield className="w-6 h-6" />
               </div>
               <div className="animate-fade-in" style={{ animationDelay: '50ms' }}>
                 <span className="text-xl font-bold block">Security</span>
                 <p className="text-sm font-normal text-white/80 mt-0.5">Manage your account security</p>
               </div>
             </SheetTitle>
           </SheetHeader>
         </div>
 
         {/* Content */}
         <div className="px-4 space-y-4 overflow-y-auto max-h-[calc(90vh-200px)]">
           {/* Account Info */}
           <div className="p-4 bg-muted/50 rounded-2xl animate-fade-in">
             <div className="flex items-center gap-3">
               <div className="p-2.5 bg-primary/20 rounded-xl">
                 <Mail className="w-5 h-5 text-primary" />
               </div>
               <div className="flex-1">
                 <p className="text-xs text-muted-foreground">Email Address</p>
                 <p className="font-semibold text-sm truncate">{user?.email}</p>
               </div>
             </div>
           </div>
 
           {/* Change Password */}
           <div className="p-4 bg-muted/50 rounded-2xl space-y-4 animate-fade-in" style={{ animationDelay: '50ms' }}>
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <div className="p-2.5 bg-violet-500/20 rounded-xl">
                   <Key className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                 </div>
                 <div>
                   <p className="font-semibold text-sm">Change Password</p>
                   <p className="text-xs text-muted-foreground">Update your login password</p>
                 </div>
               </div>
               {!showPasswordForm && (
                 <Button
                   variant="ghost"
                   size="sm"
                   onClick={() => setShowPasswordForm(true)}
                   className="rounded-xl"
                 >
                   Change
                 </Button>
               )}
             </div>
 
             {showPasswordForm && (
               <div className="space-y-3 animate-fade-in pt-2">
                 <div className="space-y-2">
                   <Label className="text-xs text-muted-foreground">New Password</Label>
                   <div className="relative">
                     <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                     <Input
                       type={showPassword ? 'text' : 'password'}
                       value={passwords.newPassword}
                       onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                       placeholder="••••••••"
                       className="h-12 rounded-xl bg-background border-0 pl-10 pr-10"
                     />
                     <button
                       type="button"
                       onClick={() => setShowPassword(!showPassword)}
                       className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                     >
                       {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                     </button>
                   </div>
                 </div>
 
                 <div className="space-y-2">
                   <Label className="text-xs text-muted-foreground">Confirm Password</Label>
                   <div className="relative">
                     <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                     <Input
                       type={showPassword ? 'text' : 'password'}
                       value={passwords.confirmPassword}
                       onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                       placeholder="••••••••"
                       className="h-12 rounded-xl bg-background border-0 pl-10"
                     />
                   </div>
                 </div>
 
                 <div className="flex gap-2 pt-2">
                   <Button
                     variant="outline"
                     onClick={() => {
                       setShowPasswordForm(false);
                       setPasswords({ newPassword: '', confirmPassword: '' });
                     }}
                     className="flex-1 h-12 rounded-xl"
                   >
                     Cancel
                   </Button>
                   <Button
                     onClick={handleChangePassword}
                     disabled={loading}
                     className="flex-1 h-12 rounded-xl shadow-lg shadow-primary/25"
                   >
                     {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update'}
                   </Button>
                 </div>
               </div>
             )}
           </div>
 
           {/* Reset via Email */}
           <div className="p-4 bg-muted/50 rounded-2xl animate-fade-in" style={{ animationDelay: '100ms' }}>
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <div className="p-2.5 bg-blue-500/20 rounded-xl">
                   <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                 </div>
                 <div>
                   <p className="font-semibold text-sm">Reset via Email</p>
                   <p className="text-xs text-muted-foreground">Send a password reset link</p>
                 </div>
               </div>
               <Button
                 variant="ghost"
                 size="sm"
                 onClick={handleSendResetEmail}
                 disabled={loading}
                 className="rounded-xl"
               >
                 {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send'}
               </Button>
             </div>
           </div>
 
           {/* Device Sessions */}
           <div className="p-4 bg-muted/50 rounded-2xl animate-fade-in" style={{ animationDelay: '150ms' }}>
             <div className="flex items-center gap-3">
               <div className="p-2.5 bg-orange-500/20 rounded-xl">
                 <Smartphone className="w-5 h-5 text-orange-600 dark:text-orange-400" />
               </div>
               <div className="flex-1">
                 <p className="font-semibold text-sm">Active Session</p>
                 <p className="text-xs text-muted-foreground">Current device • This browser</p>
               </div>
               <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
             </div>
           </div>
         </div>
       </SheetContent>
     </Sheet>
   );
 }