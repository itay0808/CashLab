import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Navigation } from "@/components/navigation/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Target, TrendingUp } from "lucide-react";
import { SavingsGoalsOverview } from "@/components/goals/SavingsGoalsOverview";
import { CashFlowForecast } from "@/components/goals/CashFlowForecast";
import { CreateSavingsGoalDialog } from "@/components/goals/CreateSavingsGoalDialog";
import { AddInvestmentDialog } from "@/components/investments/AddInvestmentDialog";
import { useState } from "react";

const Goals = () => {
  const { user, loading } = useAuth();
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [showAddInvestment, setShowAddInvestment] = useState(false);

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Goals & Investments</h1>
            <p className="text-muted-foreground">Track your savings goals and investment portfolio</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowAddInvestment(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Investment
            </Button>
            <Button onClick={() => setShowCreateGoal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Goal
            </Button>
          </div>
        </div>

        <Tabs defaultValue="goals" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="goals" className="gap-2">
              <Target className="h-4 w-4" />
              Savings Goals
            </TabsTrigger>
            <TabsTrigger value="investments" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Investments
            </TabsTrigger>
            <TabsTrigger value="forecast" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Cash Flow
            </TabsTrigger>
          </TabsList>

          <TabsContent value="goals">
            <SavingsGoalsOverview />
          </TabsContent>

          <TabsContent value="investments">
            <Card>
              <CardHeader>
                <CardTitle>Investment Portfolio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Investment tracking functionality coming soon
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="forecast">
            <CashFlowForecast />
          </TabsContent>
        </Tabs>
      </main>

      <CreateSavingsGoalDialog 
        onGoalCreated={() => setShowCreateGoal(false)}
      />
      
      <AddInvestmentDialog
        onInvestmentAdded={() => setShowAddInvestment(false)}
      />
    </div>
  );
};

export default Goals;