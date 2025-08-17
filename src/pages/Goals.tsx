import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Navigation } from "@/components/navigation/Navigation";
import { SavingsGoalsOverview } from "@/components/goals/SavingsGoalsOverview";
import { CashFlowForecast } from "@/components/goals/CashFlowForecast";

const Goals = () => {
  const { user, loading } = useAuth();

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
          <SavingsGoalsOverview />
          <CashFlowForecast />
        </div>
      </main>
    </div>
  );
};

export default Goals;