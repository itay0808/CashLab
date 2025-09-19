import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navigation } from '@/components/navigation/Navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';
import { 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Minus,
  Edit,
  Trash2
} from 'lucide-react';

interface SystemLog {
  id: string;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  description: string;
  amount: number | null;
  old_value: any;
  new_value: any;
  metadata: any;
  created_at: string;
}

const LOGS_PER_PAGE = 50;

export const Logs = () => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  useEffect(() => {
    fetchLogs();
  }, [user, currentPage]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      
      // Get total count
      const { count } = await supabase
        .from('system_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setTotalPages(Math.ceil((count || 0) / LOGS_PER_PAGE));

      // Get paginated logs
      const { data, error } = await supabase
        .from('system_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * LOGS_PER_PAGE, currentPage * LOGS_PER_PAGE - 1);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast({
        title: "Error",
        description: "Failed to load activity logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'CREATE':
        return <Plus className="h-4 w-4 text-success" />;
      case 'UPDATE':
        return <Edit className="h-4 w-4 text-warning" />;
      case 'DELETE':
        return <Trash2 className="h-4 w-4 text-destructive" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'CREATE':
        return 'bg-success/10 text-success border-success/20';
      case 'UPDATE':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'DELETE':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  if (loading && logs.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <Card className="p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-1/4 mb-6"></div>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-4">
                    <div className="w-8 h-8 bg-muted rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-3 bg-muted rounded w-3/4 mb-2"></div>
                      <div className="h-2 bg-muted rounded w-1/2"></div>
                    </div>
                    <div className="h-3 bg-muted rounded w-16"></div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-primary/10 rounded-full">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Activity Logs</h1>
            <p className="text-muted-foreground">
              Detailed history of all financial activities and changes
            </p>
          </div>
        </div>

        <Card className="bg-gradient-card shadow-elevated border-border/50">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Recent Activity</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Page {currentPage} of {totalPages}</span>
              </div>
            </div>

            {logs.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No activity logs found</h3>
                <p className="text-muted-foreground">
                  Start making transactions to see activity logs here
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div 
                    key={log.id} 
                    className="flex items-start gap-4 p-4 rounded-lg border border-border/50 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getActionIcon(log.action_type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getActionColor(log.action_type)}`}
                        >
                          {log.action_type}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {log.entity_type}
                        </Badge>
                      </div>
                      
                      <p className="text-sm font-medium mb-1">
                        {log.description}
                      </p>
                      
                      {log.amount && (
                        <div className="flex items-center gap-1 text-sm">
                          {log.amount > 0 ? (
                            <ArrowDownLeft className="h-3 w-3 text-success" />
                          ) : (
                            <ArrowUpRight className="h-3 w-3 text-destructive" />
                          )}
                          <span className={log.amount > 0 ? 'text-success' : 'text-destructive'}>
                            ₪{Math.abs(log.amount).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right text-xs text-muted-foreground">
                      {formatDateTime(log.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-border/50">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <span className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * LOGS_PER_PAGE) + 1} to {Math.min(currentPage * LOGS_PER_PAGE, logs.length + (currentPage - 1) * LOGS_PER_PAGE)} entries
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};