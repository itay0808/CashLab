import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Home, 
  Receipt, 
  Calculator, 
  Settings,
  Menu,
  LogOut,
  User
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Transactions", href: "/transactions", icon: Receipt },
  { name: "Budgets", href: "/budgets", icon: Calculator },
  { name: "Settings", href: "/settings", icon: Settings },
];

export const MobileNavigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (!isMobile) return null;

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 h-14">
      <div className="flex items-center justify-between h-full px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <div className="bg-gradient-primary bg-clip-text text-transparent">
            <h1 className="text-xl font-bold">Cashlab</h1>
          </div>
        </Link>

        {/* Mobile Menu Button */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80 p-0">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-4 border-b">
                <div className="bg-gradient-primary bg-clip-text text-transparent">
                  <h2 className="text-lg font-bold">Cashlab</h2>
                </div>
              </div>

              {/* Navigation Links */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {navigation.map((item) => {
                    const isActive = location.pathname === item.href;
                    const Icon = item.icon;
                    
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                          isActive 
                            ? "bg-primary text-primary-foreground shadow-sm" 
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* User Section */}
              {user && (
                <div className="border-t p-4">
                  <div className="space-y-3">
                    {/* User Info */}
                    <div className="flex items-center gap-3 p-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {user.user_metadata?.full_name || user.email}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>

                    {/* Profile Link */}
                    <Link
                      to="/edit-profile"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <User className="h-4 w-4" />
                      Edit Profile
                    </Link>

                    {/* Sign Out */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSignOut}
                      className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
};