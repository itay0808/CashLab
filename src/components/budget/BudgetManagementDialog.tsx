import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BudgetOverview } from './BudgetOverview';
import { BudgetAnalytics } from './BudgetAnalytics';
import { CreateBudgetDialog } from './CreateBudgetDialog';

interface BudgetManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBudgetChange: () => void;
}

export const BudgetManagementDialog = ({ open, onOpenChange, onBudgetChange }: BudgetManagementDialogProps) => {
  const [showCreateBudget, setShowCreateBudget] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleBudgetCreated = () => {
    setRefreshTrigger(prev => prev + 1);
    onBudgetChange();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Budget Management</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="overview" className="flex-1 overflow-hidden">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Budget Overview</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>
            
            <div className="flex-1 overflow-auto mt-4">
              <TabsContent value="overview" className="mt-0 space-y-4">
                <BudgetOverview 
                  onCreateBudget={() => setShowCreateBudget(true)} 
                  key={refreshTrigger}
                />
              </TabsContent>
              
              <TabsContent value="analytics" className="mt-0 space-y-4">
                <BudgetAnalytics refreshTrigger={refreshTrigger} />
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      <CreateBudgetDialog
        open={showCreateBudget}
        onOpenChange={setShowCreateBudget}
        onBudgetCreated={handleBudgetCreated}
      />
    </>
  );
};