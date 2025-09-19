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
      
      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 md:space-y-8">
        {/* Header Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-primary p-8 text-primary-foreground shadow-primary">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 right-0 w-48 h-48 bg-success-light rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-36 h-36 bg-primary-light rounded-full blur-2xl"></div>
          </div>
          <div className="relative flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">Goals & Investments</h1>
              <p className="text-primary-foreground/80">Build wealth and achieve your financial dreams</p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowAddInvestment(true)}
                className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20"
              >
                <Plus className="h-4 w-4 mr-2" />
                Investment
              </Button>
              <Button 
                onClick={() => setShowCreateGoal(true)}
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-elevated"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Goal
              </Button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <Tabs defaultValue="goals" className="space-y-6">
          <div className="flex justify-center">
            <TabsList className="grid w-full max-w-md grid-cols-3 bg-card shadow-card border border-border/50">
              <TabsTrigger value="goals" className="gap-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">
                <Target className="h-4 w-4" />
                <span className="hidden sm:inline">Savings Goals</span>
                <span className="sm:hidden">Goals</span>
              </TabsTrigger>
              <TabsTrigger value="investments" className="gap-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Investments</span>
                <span className="sm:hidden">Invest</span>
              </TabsTrigger>
              <TabsTrigger value="forecast" className="gap-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Cash Flow</span>
                <span className="sm:hidden">Flow</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="goals" className="space-y-6">
            <SavingsGoalsOverview />
          </TabsContent>

          <TabsContent value="investments" className="space-y-6">
            <Card className="bg-gradient-card shadow-elevated border-border/50">
              <div className="p-8 text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-muted/30 rounded-2xl flex items-center justify-center">
                  <TrendingUp className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Investment Portfolio</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Track stocks, bonds, and other investments to monitor your portfolio performance
                </p>
                <Button onClick={() => setShowAddInvestment(true)} className="bg-gradient-primary shadow-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Investment
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="forecast" className="space-y-6">
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