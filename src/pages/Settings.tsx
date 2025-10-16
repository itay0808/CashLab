import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Navigation } from '@/components/navigation/Navigation';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, Link } from 'react-router-dom';
import { 
  Settings as SettingsIcon, 
  FileText, 
  User, 
  Shield
} from 'lucide-react';

export const Settings = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Mobile-optimized container for S20 FE 5G */}
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-6 sm:mb-8">
          <div className="p-2 bg-primary/10 rounded-full">
            <SettingsIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Manage your account and application preferences</p>
          </div>
        </div>

        <div className="grid gap-4 sm:gap-6">
          {/* Account Settings */}
          <Card className="bg-gradient-card shadow-elevated border-border/50">
            <div className="p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <User className="h-5 w-5 text-primary" />
                <h2 className="text-lg sm:text-xl font-semibold">Account</h2>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <div className="space-y-1">
                    <h3 className="font-medium text-sm sm:text-base">Profile Information</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Update your personal information and preferences
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
                    <Link to="/edit-profile">
                      Edit Profile
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* System Settings */}
          <Card className="bg-gradient-card shadow-elevated border-border/50">
            <div className="p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <Shield className="h-5 w-5 text-primary" />
                <h2 className="text-lg sm:text-xl font-semibold">System</h2>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <div className="space-y-1">
                    <h3 className="font-medium text-sm sm:text-base">Activity Logs</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      View detailed logs of all financial activities
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
                    <Link to="/logs">
                      <FileText className="h-4 w-4 mr-2" />
                      View Logs
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};