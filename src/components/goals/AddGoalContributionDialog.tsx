import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Minus, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface AddGoalContributionDialogProps {
  goalId: string;
  goalName: string;
  onContributionAdded?: () => void;
}

export const AddGoalContributionDialog = ({ goalId, goalName, onContributionAdded }: AddGoalContributionDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [transactionType, setTransactionType] = useState<"contribution" | "withdrawal">("contribution");
  const [description, setDescription] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to add a contribution.",
        variant: "destructive",
      });
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const contributionAmount = transactionType === "contribution" 
        ? parseFloat(amount) 
        : -parseFloat(amount);

      const { error } = await supabase
        .from("savings_goal_transactions")
        .insert({
          goal_id: goalId,
          amount: contributionAmount,
          transaction_type: transactionType,
          description: description.trim() || null,
        });

      if (error) throw error;

      toast({
        title: transactionType === "contribution" ? "Contribution added" : "Withdrawal recorded",
        description: `$${amount} has been ${transactionType === "contribution" ? "added to" : "withdrawn from"} ${goalName}.`,
      });

      // Reset form
      setAmount("");
      setTransactionType("contribution");
      setDescription("");
      setOpen(false);
      
      if (onContributionAdded) onContributionAdded();
    } catch (error) {
      console.error("Error adding contribution:", error);
      toast({
        title: "Error",
        description: "Failed to add contribution. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 flex-1">
          <DollarSign className="h-4 w-4" />
          Add Money
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Update {goalName}
          </DialogTitle>
          <DialogDescription>
            Add a contribution or record a withdrawal from this savings goal.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Transaction Type</Label>
            <RadioGroup
              value={transactionType}
              onValueChange={(value: "contribution" | "withdrawal") => setTransactionType(value)}
              className="flex gap-6 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="contribution" id="contribution" />
                <Label htmlFor="contribution" className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-green-600" />
                  Contribution
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="withdrawal" id="withdrawal" />
                <Label htmlFor="withdrawal" className="flex items-center gap-2">
                  <Minus className="h-4 w-4 text-red-600" />
                  Withdrawal
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Add a note about this transaction"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Processing..." : transactionType === "contribution" ? "Add Contribution" : "Record Withdrawal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};