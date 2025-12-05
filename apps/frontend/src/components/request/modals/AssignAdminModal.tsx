'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AlertCircle, Loader2, UserCog, Shield } from 'lucide-react';
import { BACKEND_API_CONFIG } from '@/lib/urls';
import { getWithResult, getErrorMessage } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';

interface AdminUser {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface AssignAdminModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (adminId: string) => Promise<void>;
  district: string;
}

export function AssignAdminModal({ 
  open, 
  onOpenChange, 
  onSubmit, 
  district 
}: AssignAdminModalProps) {
  const { user: currentUser } = useAuth();
  const [adminId, setAdminId] = React.useState('');
  const [admins, setAdmins] = React.useState<AdminUser[]>([]);
  const [loadingAdmins, setLoadingAdmins] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const loadAdmins = React.useCallback(async () => {
    if (!open || !district) return;
    
    setLoadingAdmins(true);
    setError(null);
    
    try {
      // Fetch district admins for this district
      const resp = await getWithResult<{ admins: AdminUser[] }>(
        BACKEND_API_CONFIG.ENDPOINTS.REQUESTS.GET_ADMINS_BY_DISTRICT(district.trim())
      );
      
      if (!resp.ok) {
        setError(resp.error?.message || 'Failed to fetch admins');
        setAdmins([]);
      } else {
        const list = Array.isArray(resp.data?.admins) ? resp.data.admins : [];
        setAdmins(list);
        
        // If current user is in the list, auto-select them
        if (currentUser && list.some(a => a.id === currentUser.id)) {
          setAdminId(currentUser.id);
        } else if (list.length > 0) {
          setAdminId(list[0].id);
        }
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to fetch admins'));
      setAdmins([]);
    } finally {
      setLoadingAdmins(false);
    }
  }, [open, district, currentUser]);

  React.useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  function handleClose() {
    setAdminId('');
    setAdmins([]);
    setError(null);
    onOpenChange(false);
  }

  const getAdminDisplayName = (admin: AdminUser) => {
    const name = `${admin.firstName || ''} ${admin.lastName || ''}`.trim();
    if (admin.id === currentUser?.id) {
      return name ? `${name} (You)` : `${admin.email} (You)`;
    }
    return name || admin.email || admin.id;
  };

  const getInitials = (admin: AdminUser) => {
    if (admin.firstName && admin.lastName) {
      return `${admin.firstName[0]}${admin.lastName[0]}`.toUpperCase();
    }
    return admin.email?.[0]?.toUpperCase() || 'A';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />
            Assign Admin
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Select a district admin to handle this request. They will be responsible for reviewing and managing the loan process.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {loadingAdmins ? (
            <div className="p-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading available admins...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">Unable to load admins</p>
                <p className="text-xs text-muted-foreground mt-1">{error}</p>
              </div>
            </div>
          ) : admins.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor="admin-select" className="text-sm font-medium">
                District Admin <span className="text-destructive">*</span>
              </Label>
              <Select value={adminId} onValueChange={setAdminId}>
                <SelectTrigger id="admin-select" className="w-full">
                  <SelectValue placeholder="Choose an admin" />
                </SelectTrigger>
                <SelectContent className="w-full">
                  {admins.map((admin) => (
                    <SelectItem key={admin.id} value={admin.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {getInitials(admin)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{getAdminDisplayName(admin)}</span>
                        {admin.id === currentUser?.id && (
                          <Shield className="h-3 w-3 text-primary" />
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {admins.length} admin{admins.length !== 1 ? 's' : ''} available in {district}
              </p>
            </div>
          ) : (
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">No admins available in {district}.</p>
            </div>
          )}

          {/* Info box */}
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <strong>Note:</strong> The assigned admin will receive notifications and be responsible for all actions on this request.
            </p>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t gap-2">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            onClick={async () => { 
              if (adminId) {
                try {
                  setSubmitting(true);
                  await onSubmit(adminId);
                  handleClose();
                } catch (err: unknown) {
                  setError(getErrorMessage(err, 'Failed to assign admin'));
                } finally { 
                  setSubmitting(false); 
                }
              }
            }} 
            disabled={admins.length === 0 || !adminId || submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              'Assign Admin'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AssignAdminModal;
