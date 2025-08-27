import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Navigation } from "@/components/navigation/Navigation";
import { AccountBalance } from "@/components/dashboard/AccountBalance";
import { SpendingChart } from "@/components/dashboard/SpendingChart";
import { SubscriptionsTracker } from "@/components/dashboard/SubscriptionsTracker";
import { SavingsGoal } from "@/components/dashboard/SavingsGoal";
import { TransactionsList } from "@/components/dashboard/TransactionsList";
import { useState } from "react";

const Dashboard = () => {
  const { user, loading } = useAuth();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
      
      <main className="max-w-7xl mx-auto p-6 space-y-8">

        {/* Top Row - Account Balance and Savings Goal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <AccountBalance key={refreshTrigger} />
          </div>
          <div>
            <SavingsGoal key={refreshTrigger} />
          </div>
        </div>

        {/* Middle Row - Spending Chart and Subscriptions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SpendingChart key={refreshTrigger} />
          <SubscriptionsTracker key={refreshTrigger} />
        </div>

        {/* Bottom Row - Recent Transactions */}
        <div className="grid grid-cols-1 gap-6">
          <TransactionsList key={refreshTrigger} />
        </div>
      </main>

    </div>
  );
};

export default Dashboard;