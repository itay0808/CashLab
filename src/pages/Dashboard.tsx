import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Navigation } from "@/components/navigation/Navigation";
import { AccountBalance } from "@/components/dashboard/AccountBalance";
import { SpendingChart } from "@/components/dashboard/SpendingChart";
import { SubscriptionsTracker } from "@/components/dashboard/SubscriptionsTracker";
import { CalendarWithClock } from "@/components/dashboard/CalendarWithClock";
import { TransactionsList } from "@/components/dashboard/TransactionsList";
import { BudgetOverview } from "@/components/budget/BudgetOverview";
import { CreateBudgetDialog } from "@/components/budget/CreateBudgetDialog";
import { useState } from "react";

const Dashboard = () => {
  const { user, loading } = useAuth();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showCreateBudget, setShowCreateBudget] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleDataRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navigation />
      
      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 md:space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-primary p-8 text-primary-foreground shadow-primary">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-light rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-success-light rounded-full blur-2xl"></div>
          </div>
          <div className="relative">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Financial Dashboard</h1>
            <p className="text-primary-foreground/80">Track, analyze, and optimize your financial health</p>
          </div>
        </div>

        {/* Financial Overview */}
        <div className="space-y-4">
          <AccountBalance key={refreshTrigger} />
        </div>

        {/* Main Calendar Section with integrated Clock - Featured */}
        <div className="space-y-4">
          <CalendarWithClock key={refreshTrigger} />
        </div>

        {/* Budget Section */}
        <div className="space-y-4">
          <BudgetOverview 
            key={refreshTrigger} 
            refreshTrigger={refreshTrigger}
            onCreateBudget={() => setShowCreateBudget(true)} 
          />
        </div>

        {/* Analytics Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <SpendingChart key={refreshTrigger} />
          <SubscriptionsTracker key={refreshTrigger} />
        </div>

        {/* Recent Activity Section */}
        <div className="space-y-4">
          <TransactionsList key={refreshTrigger} />
        </div>
      </main>

      <CreateBudgetDialog 
        open={showCreateBudget} 
        onOpenChange={setShowCreateBudget}
        onBudgetCreated={handleDataRefresh}
      />
    </div>
  );
};

export default Dashboard;