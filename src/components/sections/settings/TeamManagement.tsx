import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Mail,
  MoreVertical,
  Trash2,
  Edit,
  Crown,
  User,
  X,
  KeyRound,
  Loader2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { z } from 'zod';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface TeamMember {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  role: AppRole;
  email?: string;
}

const inviteSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'member']),
});

interface TeamManagementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TeamManagement({ open, onOpenChange }: TeamManagementProps) {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const queryClient = useQueryClient();
  
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [resettingPasswordFor, setResettingPasswordFor] = useState<string | null>(null);
  
  // Invite form state
  const [inviteForm, setInviteForm] = useState({
    email: '',
    fullName: '',
    password: '',
    role: 'member' as AppRole,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch team members (profiles + roles)
  const { data: teamMembers = [], isLoading } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Combine profiles with roles
      const members: TeamMember[] = profiles.map((profile) => {
        const userRole = roles.find((r) => r.user_id === profile.user_id);
        return {
          id: profile.id,
          user_id: profile.user_id,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          created_at: profile.created_at,
          role: userRole?.role || 'member',
          email: (profile as any).email || undefined,
        };
      });

      return members;
    },
    enabled: open,
  });

  // Invite new user mutation
  const inviteMutation = useMutation({
    mutationFn: async (data: typeof inviteForm) => {
      // Create user via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: data.fullName,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      // Update profile with email (trigger already created the profile, but might need to update email)
      // Wait a moment for the trigger to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: data.fullName,
          email: data.email,
        })
        .eq('user_id', authData.user.id);

      if (profileError) throw profileError;

      // Assign role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: data.role,
        });

      if (roleError) throw roleError;

      return authData.user;
    },
    onSuccess: () => {
      toast.success('Team member invited successfully');
      setShowInviteDialog(false);
      setInviteForm({ email: '', fullName: '', password: '', role: 'member' });
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    },
    onError: (error: any) => {
      if (error.message?.includes('already registered')) {
        toast.error('This email is already registered');
      } else {
        toast.error(error.message || 'Failed to invite team member');
      }
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      // Check if role exists
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingRole) {
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Role updated successfully');
      setShowEditDialog(false);
      setSelectedMember(null);
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      queryClient.invalidateQueries({ queryKey: ['user-role'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update role');
    },
  });

  // Password reset handler
  const handlePasswordReset = async (member: TeamMember) => {
    if (!member.email) {
      toast.error('No email address found for this user');
      return;
    }
    
    setResettingPasswordFor(member.user_id);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(member.email, {
        redirectTo: `${window.location.origin}/auth?type=recovery`,
      });
      
      if (error) throw error;
      
      toast.success(`Password reset email sent to ${member.email}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send password reset email');
    } finally {
      setResettingPasswordFor(null);
    }
  };

  const handleInvite = () => {
    const result = inviteSchema.safeParse(inviteForm);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0] as string] = err.message;
        }
      });
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    inviteMutation.mutate(inviteForm);
  };

  const handleUpdateRole = () => {
    if (!selectedMember) return;
    updateRoleMutation.mutate({
      userId: selectedMember.user_id,
      newRole: selectedMember.role,
    });
  };

  const getRoleIcon = (role: AppRole) => {
    return role === 'admin' ? ShieldCheck : User;
  };

  const getRoleBadgeColor = (role: AppRole) => {
    return role === 'admin' 
      ? 'bg-primary/10 text-primary border-primary/20' 
      : 'bg-muted text-muted-foreground';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] p-0 gap-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Team Management</DialogTitle>
              <DialogDescription>
                {teamMembers.length} team member{teamMembers.length !== 1 ? 's' : ''}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* Invite Button (Admin only) */}
          {isAdmin && (
            <Button
              onClick={() => setShowInviteDialog(true)}
              className="w-full gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Add Team Member
            </Button>
          )}

          {/* Team Members List */}
          <ScrollArea className="h-[350px]">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : teamMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No team members</p>
              </div>
            ) : (
              <div className="space-y-2">
                {teamMembers.map((member) => {
                  const RoleIcon = getRoleIcon(member.role);
                  const isCurrentUser = member.user_id === user?.id;
                  
                  return (
                    <Card key={member.id} className="border-border/50">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm truncate">
                                {member.full_name || 'Unnamed User'}
                              </p>
                              {isCurrentUser && (
                                <Badge variant="secondary" className="text-[10px] h-4">
                                  You
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge 
                                variant="outline" 
                                className={`text-[10px] h-4 gap-1 ${getRoleBadgeColor(member.role)}`}
                              >
                                <RoleIcon className="w-2.5 h-2.5" />
                                {member.role === 'admin' ? 'Admin' : 'Member'}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">
                                Joined {format(new Date(member.created_at), 'MMM d, yyyy')}
                              </span>
                            </div>
                          </div>
                          
                          {/* Actions (Admin only, not for self) */}
                          {isAdmin && !isCurrentUser && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedMember(member);
                                    setShowEditDialog(true);
                                  }}
                                >
                                  <Edit className="w-4 h-4 mr-2" />
                                  Change Role
                                </DropdownMenuItem>
                                {member.email && (
                                  <DropdownMenuItem
                                    onClick={() => handlePasswordReset(member)}
                                    disabled={resettingPasswordFor === member.user_id}
                                  >
                                    {resettingPasswordFor === member.user_id ? (
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                      <KeyRound className="w-4 h-4 mr-2" />
                                    )}
                                    Reset Password
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Invite Dialog */}
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                Add Team Member
              </DialogTitle>
              <DialogDescription>
                Create a new account for a team member
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  value={inviteForm.fullName}
                  onChange={(e) => setInviteForm({ ...inviteForm, fullName: e.target.value })}
                />
                {formErrors.fullName && (
                  <p className="text-xs text-destructive">{formErrors.fullName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                />
                {formErrors.email && (
                  <p className="text-xs text-destructive">{formErrors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Temporary Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={inviteForm.password}
                  onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
                />
                {formErrors.password && (
                  <p className="text-xs text-destructive">{formErrors.password}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Share this password with the team member securely
                </p>
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={inviteForm.role}
                  onValueChange={(value: AppRole) => setInviteForm({ ...inviteForm, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Member
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" />
                        Admin
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleInvite} disabled={inviteMutation.isPending}>
                {inviteMutation.isPending ? 'Creating...' : 'Create Account'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Role Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Change Role</DialogTitle>
              <DialogDescription>
                Update role for {selectedMember?.full_name || 'this user'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Select
                value={selectedMember?.role}
                onValueChange={(value: AppRole) => 
                  setSelectedMember(prev => prev ? { ...prev, role: value } : null)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Member - Can manage inventory
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" />
                      Admin - Full access + manage team
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateRole} disabled={updateRoleMutation.isPending}>
                {updateRoleMutation.isPending ? 'Updating...' : 'Update Role'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
