 import { useState } from 'react';
 import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from 'sonner';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Textarea } from '@/components/ui/textarea';
 import { Badge } from '@/components/ui/badge';
 import { Switch } from '@/components/ui/switch';
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
 } from '@/components/ui/dialog';
 import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
 } from '@/components/ui/alert-dialog';
 import { Warehouse, Plus, Edit, Trash2, MapPin, Building2, Star, Loader2 } from 'lucide-react';
 import { cn } from '@/lib/utils';
 
 interface WarehouseData {
   id: string;
   name: string;
   address: string | null;
   description: string | null;
   is_default: boolean;
   created_at: string;
 }
 
 export function WarehouseManagement() {
   const queryClient = useQueryClient();
   const [showAddDialog, setShowAddDialog] = useState(false);
   const [editingWarehouse, setEditingWarehouse] = useState<WarehouseData | null>(null);
   const [deleteWarehouse, setDeleteWarehouse] = useState<WarehouseData | null>(null);
   const [formData, setFormData] = useState({
     name: '',
     address: '',
     description: '',
     is_default: false,
   });
 
   const { data: warehouses = [], isLoading } = useQuery({
     queryKey: ['warehouses'],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('warehouses')
         .select('*')
         .order('is_default', { ascending: false })
         .order('name');
       if (error) throw error;
       return data as WarehouseData[];
     },
   });
 
   const createMutation = useMutation({
     mutationFn: async (data: typeof formData) => {
       // If setting as default, unset other defaults first
       if (data.is_default) {
         await supabase
           .from('warehouses')
           .update({ is_default: false })
           .eq('is_default', true);
       }
       
       const { error } = await supabase.from('warehouses').insert({
         name: data.name,
         address: data.address || null,
         description: data.description || null,
         is_default: data.is_default,
       });
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['warehouses'] });
       toast.success('Warehouse added successfully');
       setShowAddDialog(false);
       resetForm();
     },
     onError: (error: any) => {
       toast.error(error.message || 'Failed to add warehouse');
     },
   });
 
   const updateMutation = useMutation({
     mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
       // If setting as default, unset other defaults first
       if (data.is_default) {
         await supabase
           .from('warehouses')
           .update({ is_default: false })
           .neq('id', id);
       }
       
       const { error } = await supabase
         .from('warehouses')
         .update({
           name: data.name,
           address: data.address || null,
           description: data.description || null,
           is_default: data.is_default,
         })
         .eq('id', id);
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['warehouses'] });
       toast.success('Warehouse updated successfully');
       setEditingWarehouse(null);
       resetForm();
     },
     onError: (error: any) => {
       toast.error(error.message || 'Failed to update warehouse');
     },
   });
 
   const deleteMutation = useMutation({
     mutationFn: async (id: string) => {
       const { error } = await supabase.from('warehouses').delete().eq('id', id);
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['warehouses'] });
       toast.success('Warehouse deleted');
       setDeleteWarehouse(null);
     },
     onError: (error: any) => {
       toast.error(error.message || 'Failed to delete warehouse');
     },
   });
 
   const resetForm = () => {
     setFormData({ name: '', address: '', description: '', is_default: false });
   };
 
   const openEditDialog = (warehouse: WarehouseData) => {
     setFormData({
       name: warehouse.name,
       address: warehouse.address || '',
       description: warehouse.description || '',
       is_default: warehouse.is_default,
     });
     setEditingWarehouse(warehouse);
   };
 
   const handleSubmit = (e: React.FormEvent) => {
     e.preventDefault();
     if (!formData.name.trim()) {
       toast.error('Warehouse name is required');
       return;
     }
     
     if (editingWarehouse) {
       updateMutation.mutate({ id: editingWarehouse.id, data: formData });
     } else {
       createMutation.mutate(formData);
     }
   };
 
   const isSubmitting = createMutation.isPending || updateMutation.isPending;
 
   return (
     <Card className="border-0 shadow-lg shadow-primary/5">
       <CardHeader className="pb-4">
         <div className="flex items-center justify-between">
           <CardTitle className="text-base font-bold flex items-center gap-2">
             <div className="p-2 bg-primary/10 rounded-xl">
               <Building2 className="w-4 h-4 text-primary" />
             </div>
             Warehouse Management
           </CardTitle>
           <Button
             size="sm"
             onClick={() => {
               resetForm();
               setShowAddDialog(true);
             }}
             className="rounded-xl h-9 shadow-lg shadow-primary/25"
           >
             <Plus className="w-4 h-4 mr-1" />
             Add
           </Button>
         </div>
       </CardHeader>
       <CardContent className="space-y-3">
         {isLoading ? (
           <div className="flex items-center justify-center py-8">
             <Loader2 className="w-6 h-6 animate-spin text-primary" />
           </div>
         ) : warehouses.length === 0 ? (
           <div className="text-center py-8">
             <div className="w-14 h-14 mx-auto bg-muted rounded-2xl flex items-center justify-center mb-3">
               <Warehouse className="w-7 h-7 text-muted-foreground" />
             </div>
             <p className="text-muted-foreground font-medium">No warehouses yet</p>
             <p className="text-sm text-muted-foreground/70 mt-1">Add your first warehouse</p>
           </div>
         ) : (
           warehouses.map((warehouse) => (
             <div
               key={warehouse.id}
               className={cn(
                 "flex items-center gap-4 p-4 rounded-2xl bg-muted/50 hover:bg-muted transition-colors",
                 warehouse.is_default && "ring-2 ring-primary/30 bg-primary/5"
               )}
             >
               <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl">
                 <Warehouse className="w-5 h-5 text-primary" />
               </div>
               <div className="flex-1 min-w-0">
                 <div className="flex items-center gap-2">
                   <p className="font-semibold truncate">{warehouse.name}</p>
                   {warehouse.is_default && (
                     <Badge className="bg-primary/20 text-primary border-0 text-[10px] flex items-center gap-1">
                       <Star className="w-2.5 h-2.5" />
                       Default
                     </Badge>
                   )}
                 </div>
                 {warehouse.address && (
                   <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                     <MapPin className="w-3 h-3" />
                     {warehouse.address}
                   </p>
                 )}
               </div>
               <div className="flex gap-1">
                 <Button
                   variant="ghost"
                   size="icon"
                   className="h-9 w-9 rounded-xl hover:bg-background"
                   onClick={() => openEditDialog(warehouse)}
                 >
                   <Edit className="w-4 h-4" />
                 </Button>
                 <Button
                   variant="ghost"
                   size="icon"
                   className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive"
                   onClick={() => setDeleteWarehouse(warehouse)}
                   disabled={warehouse.is_default}
                 >
                   <Trash2 className="w-4 h-4" />
                 </Button>
               </div>
             </div>
           ))
         )}
       </CardContent>
 
       {/* Add/Edit Dialog */}
       <Dialog 
         open={showAddDialog || !!editingWarehouse} 
         onOpenChange={(open) => {
           if (!open) {
             setShowAddDialog(false);
             setEditingWarehouse(null);
             resetForm();
           }
         }}
       >
         <DialogContent className="sm:max-w-md rounded-3xl border-0 shadow-2xl">
           <DialogHeader>
             <DialogTitle className="flex items-center gap-2">
               <div className="p-2 bg-primary/10 rounded-xl">
                 <Warehouse className="w-5 h-5 text-primary" />
               </div>
               {editingWarehouse ? 'Edit Warehouse' : 'Add Warehouse'}
             </DialogTitle>
           </DialogHeader>
 
           <form onSubmit={handleSubmit} className="space-y-4">
             <div className="space-y-2">
               <Label htmlFor="name">Warehouse Name *</Label>
               <Input
                 id="name"
                 value={formData.name}
                 onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                 placeholder="e.g., Main Warehouse"
                 className="h-12 rounded-xl bg-muted/50 border-0"
               />
             </div>
 
             <div className="space-y-2">
               <Label htmlFor="address">Address</Label>
               <Input
                 id="address"
                 value={formData.address}
                 onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                 placeholder="e.g., 123 Industrial Ave"
                 className="h-12 rounded-xl bg-muted/50 border-0"
               />
             </div>
 
             <div className="space-y-2">
               <Label htmlFor="description">Description</Label>
               <Textarea
                 id="description"
                 value={formData.description}
                 onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                 placeholder="Optional notes about this warehouse"
                 rows={2}
                 className="rounded-xl bg-muted/50 border-0 resize-none"
               />
             </div>
 
             <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
               <div>
                 <Label htmlFor="is_default" className="cursor-pointer">Set as Default</Label>
                 <p className="text-xs text-muted-foreground">New items will use this warehouse</p>
               </div>
               <Switch
                 id="is_default"
                 checked={formData.is_default}
                 onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
               />
             </div>
 
             <div className="flex gap-3 pt-2">
               <Button
                 type="button"
                 variant="outline"
                 className="flex-1 h-12 rounded-2xl"
                 onClick={() => {
                   setShowAddDialog(false);
                   setEditingWarehouse(null);
                   resetForm();
                 }}
               >
                 Cancel
               </Button>
               <Button
                 type="submit"
                 className="flex-1 h-12 rounded-2xl shadow-lg shadow-primary/25"
                 disabled={isSubmitting}
               >
                 {isSubmitting ? (
                   <>
                     <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                     Saving...
                   </>
                 ) : editingWarehouse ? (
                   'Update'
                 ) : (
                   'Add Warehouse'
                 )}
               </Button>
             </div>
           </form>
         </DialogContent>
       </Dialog>
 
       {/* Delete Confirmation */}
       <AlertDialog open={!!deleteWarehouse} onOpenChange={() => setDeleteWarehouse(null)}>
         <AlertDialogContent className="rounded-3xl border-0 shadow-2xl">
           <AlertDialogHeader>
             <AlertDialogTitle>Delete Warehouse?</AlertDialogTitle>
             <AlertDialogDescription>
               Are you sure you want to delete "{deleteWarehouse?.name}"? Items assigned to this warehouse will be unassigned.
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
             <AlertDialogAction
               className="bg-destructive hover:bg-destructive/90 rounded-xl"
               onClick={() => deleteWarehouse && deleteMutation.mutate(deleteWarehouse.id)}
             >
               {deleteMutation.isPending ? (
                 <Loader2 className="w-4 h-4 animate-spin" />
               ) : (
                 'Delete'
               )}
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
     </Card>
   );
 }