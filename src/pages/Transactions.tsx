import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Navigation } from "@/components/navigation/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Receipt, Repeat, CreditCard } from "lucide-react";
import { TransactionsList } from "@/components/dashboard/TransactionsList";
import { SubscriptionsTracker } from "@/components/dashboard/SubscriptionsTracker";
import { RecurringTransactionsList } from "@/components/recurring/RecurringTransactionsList";
import { AddTransactionDialog } from "@/components/transaction/AddTransactionDialog";
import { useState } from "react";


const Transactions = () => {
  const { user, loading } = useAuth();
  const [showAddTransaction, setShowAddTransaction] = useState(false);

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
            <h1 className="text-3xl font-bold">Transactions</h1>
            <p className="text-muted-foreground">Manage your transactions and recurring payments</p>
          </div>
          <Button onClick={() => setShowAddTransaction(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Transaction
          </Button>
        </div>

        <Tabs defaultValue="transactions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="transactions" className="gap-2">
              <Receipt className="h-4 w-4" />
              All Transactions
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Subscriptions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transactions">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <TransactionsList />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Recurring Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <RecurringTransactionsList />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="subscriptions">
            <Card>
              <CardHeader>
                <CardTitle>Active Subscriptions</CardTitle>
              </CardHeader>
              <CardContent>
                <SubscriptionsTracker />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <AddTransactionDialog 
        open={showAddTransaction} 
        onOpenChange={setShowAddTransaction}
        onTransactionAdded={() => setShowAddTransaction(false)}
      />
    </div>
  );
};

export default Transactions;