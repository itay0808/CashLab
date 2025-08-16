import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Target, Plus } from "lucide-react";

export const SavingsGoal = () => {
  const goal = {
    name: "Emergency Fund",
    target: 10000,
    current: 7320,
    monthlyContribution: 500
  };

  const progress = (goal.current / goal.target) * 100;
  const remaining = goal.target - goal.current;
  const monthsToGoal = Math.ceil(remaining / goal.monthlyContribution);

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
              ${goal.current.toLocaleString()}
            </span>
            <span className="text-sm text-white/80">
              of ${goal.target.toLocaleString()}
            </span>
          </div>
          <Progress value={progress} className="h-2 bg-white/20" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/10 rounded-lg p-3">
            <div className="text-sm text-white/80">Monthly Goal</div>
            <div className="font-semibold">${goal.monthlyContribution}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="text-sm text-white/80">Time to Goal</div>
            <div className="font-semibold">{monthsToGoal} months</div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2">
          <span className="text-sm text-white/80">
            {progress.toFixed(1)}% complete
          </span>
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
            Add Money
          </Button>
        </div>
      </div>
    </Card>
  );
};