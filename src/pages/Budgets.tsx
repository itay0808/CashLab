import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Navigation } from "@/components/navigation/Navigation";
import { BudgetOverview } from "@/components/budget/BudgetOverview";
import { BudgetAnalytics } from "@/components/budget/BudgetAnalytics";
import { BudgetManagementDialog } from "@/components/budget/BudgetManagementDialog";
import { useState } from "react";

const Budgets = () => {
  const { user, loading } = useAuth();
  const [showBudgetManagement, setShowBudgetManagement] = useState(false);

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

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navigation />
      
      <main className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="space-y-6">
          <BudgetOverview onCreateBudget={() => setShowBudgetManagement(true)} />
          <BudgetAnalytics />
        </div>

        <BudgetManagementDialog
          open={showBudgetManagement}
          onOpenChange={setShowBudgetManagement}
          onBudgetChange={() => {}}
        />
      </main>
    </div>
  );
};

export default Budgets;