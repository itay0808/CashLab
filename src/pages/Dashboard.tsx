import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Navigation } from "@/components/navigation/Navigation";
import { AccountBalance } from "@/components/dashboard/AccountBalance";
import { SpendingChart } from "@/components/dashboard/SpendingChart";
import { SubscriptionsTracker } from "@/components/dashboard/SubscriptionsTracker";
import { SavingsGoal } from "@/components/dashboard/SavingsGoal";
import { TransactionsList } from "@/components/dashboard/TransactionsList";
import { Button } from "@/components/ui/button";
import { Plus, Calculator } from "lucide-react";
import { useState } from "react";
import { AddTransactionDialog } from "@/components/transaction/AddTransactionDialog";
import { AddAccountDialog } from "@/components/account/AddAccountDialog";
import { BudgetManagementDialog } from "@/components/budget/BudgetManagementDialog";

const Dashboard = () => {
  const { user, loading } = useAuth();
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showBudgetManagement, setShowBudgetManagement] = useState(false);
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
        {/* Quick Action Buttons */}
        <div className="flex gap-3 justify-center">
          <Button 
            onClick={() => setShowAddTransaction(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Transaction
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowAddAccount(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Account
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowBudgetManagement(true)}
            className="flex items-center gap-2"
          >
            <Calculator className="h-4 w-4" />
            Manage Budgets
          </Button>
        </div>

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

      <AddTransactionDialog
        open={showAddTransaction}
        onOpenChange={setShowAddTransaction}
        onTransactionAdded={handleDataRefresh}
      />

      <AddAccountDialog
        open={showAddAccount}
        onOpenChange={setShowAddAccount}
        onAccountAdded={handleDataRefresh}
      />

      <BudgetManagementDialog
        open={showBudgetManagement}
        onOpenChange={setShowBudgetManagement}
        onBudgetChange={handleDataRefresh}
      />
    </div>
  );
};

export default Dashboard;