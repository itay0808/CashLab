import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Navigation } from '@/components/navigation/Navigation';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, Link } from 'react-router-dom';
import { 
  Settings as SettingsIcon, 
  Moon, 
  Sun, 
  FileText, 
  User, 
  Shield,
  Palette
} from 'lucide-react';

export const Settings = () => {
  const { user } = useAuth();
  const { theme } = useTheme();

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-primary/10 rounded-full">
            <SettingsIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Manage your account and application preferences</p>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Appearance Settings */}
          <Card className="bg-gradient-card shadow-elevated border-border/50">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <Palette className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Appearance</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-medium">Theme</h3>
                    <p className="text-sm text-muted-foreground">
                      Choose between light and dark mode
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {theme === 'light' ? (
                      <Sun className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Moon className="h-4 w-4 text-muted-foreground" />
                    )}
                    <ThemeToggle />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Account Settings */}
          <Card className="bg-gradient-card shadow-elevated border-border/50">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <User className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Account</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-medium">Profile Information</h3>
                    <p className="text-sm text-muted-foreground">
                      Update your personal information and preferences
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
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
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <Shield className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">System</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-medium">Activity Logs</h3>
                    <p className="text-sm text-muted-foreground">
                      View detailed logs of all financial activities
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
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