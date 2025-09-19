import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BudgetOverview } from './BudgetOverview';
import { BudgetAnalytics } from './BudgetAnalytics';
import { CreateBudgetDialog } from './CreateBudgetDialog';
import { useIsMobile } from '@/hooks/use-mobile';

interface BudgetManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBudgetChange: () => void;
}

export const BudgetManagementDialog = ({ open, onOpenChange, onBudgetChange }: BudgetManagementDialogProps) => {
  const [showCreateBudget, setShowCreateBudget] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const isMobile = useIsMobile();

  const handleBudgetCreated = () => {
    setRefreshTrigger(prev => prev + 1);
    onBudgetChange();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-4xl h-full max-h-screen overflow-hidden flex flex-col">
          <SheetHeader>
            <SheetTitle>Budget Management</SheetTitle>
          </SheetHeader>
          
          <Tabs defaultValue="overview" className="flex-1 overflow-hidden">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Overview</TabsTrigger>
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
        </SheetContent>
      </Sheet>

      <CreateBudgetDialog
        open={showCreateBudget}
        onOpenChange={setShowCreateBudget}
        onBudgetCreated={handleBudgetCreated}
      />
    </>
  );
};