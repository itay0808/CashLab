import { Button } from "@/components/ui/button";
import { Bell, Menu, User, Settings } from "lucide-react";

export const Header = () => {
  return (
    <header className="border-b bg-gradient-card p-4 shadow-card">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="bg-gradient-primary bg-clip-text text-transparent">
            <h1 className="text-2xl font-bold">MoneyFlow</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 bg-danger text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
              2
            </span>
          </Button>
          <Button variant="ghost" size="sm">
            <Settings className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="sm" className="bg-gradient-subtle">
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};