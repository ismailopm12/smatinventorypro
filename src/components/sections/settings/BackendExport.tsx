import { useState } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Database,
  Download,
  Copy,
  Check,
  FileCode,
  Table,
  Shield,
  Zap,
  Loader2,
  Lock,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface BackendExportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BackendExport({ open, onOpenChange }: BackendExportProps) {
  const { isAdmin } = useUserRole();
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{
    sql: string;
    tables: string[];
    functions: string[];
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please sign in to export');
        return;
      }

      const { data, error } = await supabase.functions.invoke('export-schema', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setExportResult(data);
      toast.success('Schema exported successfully');
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.message || 'Failed to export schema');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopy = async () => {
    if (!exportResult?.sql) return;
    
    try {
      await navigator.clipboard.writeText(exportResult.sql);
      setCopied(true);
      toast.success('SQL copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const handleDownload = () => {
    if (!exportResult?.sql) return;
    
    const blob = new Blob([exportResult.sql], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `warehouse_inventory_schema_${format(new Date(), 'yyyy-MM-dd_HHmm')}.sql`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('SQL file downloaded');
  };

  const schemaItems = [
    { icon: Table, label: 'Tables', count: 8, color: 'text-primary' },
    { icon: Zap, label: 'Functions', count: 3, color: 'text-amber-500' },
    { icon: Shield, label: 'RLS Policies', count: 26, color: 'text-emerald-500' },
    { icon: FileCode, label: 'Triggers', count: 6, color: 'text-violet-500' },
    { icon: Database, label: 'Indexes', count: 11, color: 'text-cyan-500' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] p-0 gap-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Database className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Backend Export</DialogTitle>
              <DialogDescription>
                Export database schema for migration
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {!isAdmin ? (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-destructive mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Admin Access Required</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Only administrators can export the database schema. Contact your admin for access.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : !exportResult ? (
            <>
              {/* Schema Overview */}
              <Card className="border-border/50">
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-sm">Schema Contents</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="grid grid-cols-2 gap-2">
                    {schemaItems.map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                      >
                        <item.icon className={`w-4 h-4 ${item.color}`} />
                        <span className="text-xs font-medium flex-1">{item.label}</span>
                        <Badge variant="secondary" className="text-[10px] h-4">
                          {item.count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Info */}
              <Card className="border-info/50 bg-info/5">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-info mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-muted-foreground">
                      <p className="font-medium text-foreground mb-1">What's included:</p>
                      <ul className="space-y-0.5 list-disc list-inside">
                        <li>All table definitions with columns and constraints</li>
                        <li>Database functions (has_role, handle_new_user, etc.)</li>
                        <li>Triggers for timestamps and user creation</li>
                        <li>Row Level Security policies</li>
                        <li>Storage bucket configuration</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Export Button */}
              <Button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full gap-2"
                size="lg"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating Schema...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4" />
                    Generate SQL Export
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              {/* Export Result */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <Table className="w-3 h-3" />
                    {exportResult.tables.length} Tables
                  </Badge>
                  <Badge variant="secondary" className="gap-1">
                    <Zap className="w-3 h-3" />
                    {exportResult.functions.length} Functions
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="gap-1.5"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleDownload}
                    className="gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </Button>
                </div>
              </div>

              {/* SQL Preview */}
              <Card className="border-border/50">
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-xs text-muted-foreground">SQL Preview</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[300px]">
                    <pre className="p-3 text-[10px] font-mono leading-relaxed text-muted-foreground overflow-x-auto">
                      {exportResult.sql}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Instructions */}
              <Card className="border-success/50 bg-success/5">
                <CardContent className="p-3">
                  <p className="text-xs font-medium text-success mb-2">How to use:</p>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Create a new Supabase project</li>
                    <li>Go to SQL Editor in your new project</li>
                    <li>Paste or upload this SQL file</li>
                    <li>Run the script to create all tables and policies</li>
                    <li>Update your app's Supabase credentials</li>
                  </ol>
                </CardContent>
              </Card>

              <Button
                variant="outline"
                onClick={() => setExportResult(null)}
                className="w-full"
              >
                Generate New Export
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
