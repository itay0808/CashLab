import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Target, Plus, Calendar, TrendingUp, Edit3, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { CreateSavingsGoalDialog } from "./CreateSavingsGoalDialog";
import { AddGoalContributionDialog } from "./AddGoalContributionDialog";
import { format, differenceInDays } from "date-fns";

interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  monthly_contribution: number | null;
  target_date: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export const SavingsGoalsOverview = () => {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchGoals();
    }
  }, [user]);

  const fetchGoals = async () => {
    try {
      const { data, error } = await supabase
        .from("savings_goals")
        .select("*")
        .eq("user_id", user?.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error("Error fetching savings goals:", error);
      toast({
        title: "Error",
        description: "Failed to load savings goals.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoalUpdated = () => {
    fetchGoals();
  };

  const calculateProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const calculateDaysToTarget = (targetDate: string | null) => {
    if (!targetDate) return null;
    return differenceInDays(new Date(targetDate), new Date());
  };

  const calculateMonthsToGoal = (current: number, target: number, monthlyContribution: number | null) => {
    if (!monthlyContribution || monthlyContribution <= 0) return null;
    const remaining = target - current;
    if (remaining <= 0) return 0;
    return Math.ceil(remaining / monthlyContribution);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-muted rounded"></div>
            <div className="h-3 bg-muted rounded w-5/6"></div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Savings Goals</h2>
            <p className="text-muted-foreground">Track your financial objectives</p>
          </div>
        </div>
        <CreateSavingsGoalDialog onGoalCreated={handleGoalUpdated} />
      </div>

      {goals.length === 0 ? (
        <Card className="p-12 text-center">
          <Target className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No savings goals yet</h3>
          <p className="text-muted-foreground mb-6">
            Create your first savings goal to start tracking your financial objectives.
          </p>
          <CreateSavingsGoalDialog onGoalCreated={handleGoalUpdated} />
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => {
            const progress = calculateProgress(goal.current_amount, goal.target_amount);
            const daysToTarget = calculateDaysToTarget(goal.target_date);
            const monthsToGoal = calculateMonthsToGoal(
              goal.current_amount,
              goal.target_amount,
              goal.monthly_contribution
            );

            return (
              <Card key={goal.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Target className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{goal.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {goal.description || "Savings Goal"}
                      </p>
                    </div>
                  </div>
                  <Badge variant={progress >= 100 ? "default" : "secondary"}>
                    {progress.toFixed(1)}%
                  </Badge>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-2xl font-bold">
                        ${goal.current_amount.toLocaleString()}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        of ${goal.target_amount.toLocaleString()}
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  {(daysToTarget !== null || monthsToGoal !== null || goal.monthly_contribution) && (
                    <div className="grid grid-cols-2 gap-4">
                      {goal.monthly_contribution && (
                        <div className="bg-muted/50 rounded-lg p-3">
                          <div className="text-sm text-muted-foreground">Monthly</div>
                          <div className="font-semibold">${goal.monthly_contribution}</div>
                        </div>
                      )}
                      {monthsToGoal !== null && (
                        <div className="bg-muted/50 rounded-lg p-3">
                          <div className="text-sm text-muted-foreground">Est. Time</div>
                          <div className="font-semibold">{monthsToGoal} months</div>
                        </div>
                      )}
                      {daysToTarget !== null && (
                        <div className="bg-muted/50 rounded-lg p-3 col-span-2">
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Target Date
                          </div>
                          <div className="font-semibold">
                            {format(new Date(goal.target_date!), "MMM dd, yyyy")}
                            {daysToTarget > 0 && (
                              <span className="text-sm text-muted-foreground ml-2">
                                ({daysToTarget} days)
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <AddGoalContributionDialog 
                      goalId={goal.id} 
                      goalName={goal.name}
                      onContributionAdded={handleGoalUpdated} 
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};