import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Navigation } from "@/components/navigation/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Receipt } from "lucide-react";
import { TransactionsList } from "@/components/dashboard/TransactionsList";

import { RecurringTransactionsList } from "@/components/recurring/RecurringTransactionsList";
import { AddTransactionDialog } from "@/components/transaction/AddTransactionDialog";
import { useState } from "react";


const Transactions = () => {
  const { user, loading } = useAuth();
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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

  const handleDataRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navigation />
      
      <main className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Transactions</h1>
            <p className="text-muted-foreground">Manage all your transactions and recurring payments</p>
          </div>
          <Button onClick={() => setShowAddTransaction(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Transaction
          </Button>
        </div>

        <Tabs defaultValue="transactions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="transactions" className="gap-2">
              <Receipt className="h-4 w-4" />
              All Transactions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transactions">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <TransactionsList key={refreshTrigger} />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Recurring Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <RecurringTransactionsList key={refreshTrigger} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

        </Tabs>
      </main>

      <AddTransactionDialog 
        open={showAddTransaction} 
        onOpenChange={setShowAddTransaction}
        onTransactionAdded={() => {
          setShowAddTransaction(false);
          handleDataRefresh();
        }}
      />
    </div>
  );
};

export default Transactions;