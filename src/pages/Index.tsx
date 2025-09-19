import { Navigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/dashboard/Header";
import { AccountBalance } from "@/components/dashboard/AccountBalance";
import { TransactionsList } from "@/components/dashboard/TransactionsList";
import { SubscriptionsTracker } from "@/components/dashboard/SubscriptionsTracker";
import { SpendingChart } from "@/components/dashboard/SpendingChart";
import { AddTransactionDialog } from "@/components/transaction/AddTransactionDialog";
import { BudgetManagementDialog } from "@/components/budget/BudgetManagementDialog";
import { Button } from "@/components/ui/button";
import { Plus, Calculator } from "lucide-react";

const Index = () => {
  const { user, loading } = useAuth();
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showBudgetManagement, setShowBudgetManagement] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
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
      <Header />
      
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
            onClick={() => setShowBudgetManagement(true)}
            className="flex items-center gap-2"
          >
            <Calculator className="h-4 w-4" />
            Manage Budgets
          </Button>
        </div>

        {/* Top Row - Account Balance */}
        <div className="space-y-6">
          <AccountBalance key={refreshTrigger} />
        </div>

        {/* Middle Row - Spending Chart and Subscriptions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SpendingChart key={refreshTrigger} />
          <SubscriptionsTracker />
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

      <BudgetManagementDialog
        open={showBudgetManagement}
        onOpenChange={setShowBudgetManagement}
        onBudgetChange={handleDataRefresh}
      />
    </div>
  );
};

export default Index;