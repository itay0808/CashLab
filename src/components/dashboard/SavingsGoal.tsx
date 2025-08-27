import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Target, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CreateSavingsGoalDialog } from "@/components/goals/CreateSavingsGoalDialog";
import { AddGoalContributionDialog } from "@/components/goals/AddGoalContributionDialog";

interface SavingsGoalData {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  monthly_contribution: number | null;
}

export const SavingsGoal = () => {
  const [goal, setGoal] = useState<SavingsGoalData | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchPrimaryGoal();
    }
  }, [user]);

  const fetchPrimaryGoal = async () => {
    try {
      const { data, error } = await supabase
        .from("savings_goals")
        .select("*")
        .eq("user_id", user?.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setGoal(data);
    } catch (error) {
      console.error("Error fetching savings goal:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoalUpdated = () => {
    fetchPrimaryGoal();
  };

  if (loading) {
    return (
      <Card className="p-6 bg-gradient-success text-white shadow-elevated">
        <div className="animate-pulse">
          <div className="h-4 bg-white/20 rounded w-1/2 mb-4"></div>
          <div className="h-6 bg-white/20 rounded w-3/4 mb-2"></div>
          <div className="h-2 bg-white/20 rounded mb-4"></div>
        </div>
      </Card>
    );
  }

  if (!goal) {
    return (
      <Card className="p-6 bg-gradient-success text-white shadow-elevated">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">No Savings Goals</h3>
              <p className="text-sm text-white/80">Create your first goal</p>
            </div>
          </div>
        </div>
        <div className="text-center py-4">
          <p className="text-white/80 mb-4">Start saving towards your financial objectives</p>
          <CreateSavingsGoalDialog onGoalCreated={handleGoalUpdated} />
        </div>
      </Card>
    );
  }

  const progress = (goal.current_amount / goal.target_amount) * 100;
  const remaining = goal.target_amount - goal.current_amount;
  const monthsToGoal = goal.monthly_contribution && goal.monthly_contribution > 0 
    ? Math.ceil(remaining / goal.monthly_contribution) 
    : null;

  return (
    <Card className="p-6 bg-gradient-success text-white shadow-elevated">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-full">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold">{goal.name}</h3>
            <p className="text-sm text-white/80">Smart Savings Goal</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-end mb-2">
              <span className="text-2xl font-bold">
                ${goal.current_amount.toLocaleString()}
              </span>
              <span className="text-sm text-white/80">
                of ${goal.target_amount.toLocaleString()}
              </span>
            </div>
            <Progress value={progress} className="h-2 bg-white/20" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {goal.monthly_contribution && (
              <div className="bg-white/10 rounded-lg p-3">
                <div className="text-sm text-white/80">Monthly Goal</div>
                <div className="font-semibold">${goal.monthly_contribution}</div>
              </div>
            )}
            {monthsToGoal && (
              <div className="bg-white/10 rounded-lg p-3">
                <div className="text-sm text-white/80">Time to Goal</div>
                <div className="font-semibold">{monthsToGoal} months</div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-2">
            <span className="text-sm text-white/80">
              {progress.toFixed(1)}% complete
            </span>
            <AddGoalContributionDialog 
              goalId={goal.id}
              goalName={goal.name}
              onContributionAdded={handleGoalUpdated}
            />
          </div>
        </div>
    </Card>
  );
};