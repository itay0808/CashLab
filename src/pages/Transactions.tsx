import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Navigation } from "@/components/navigation/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Receipt, Repeat, CreditCard } from "lucide-react";
import { TransactionsList } from "@/components/dashboard/TransactionsList";
import { SubscriptionsTracker } from "@/components/dashboard/SubscriptionsTracker";
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
            <h1 className="text-3xl font-bold">Transactions & Recurring</h1>
            <p className="text-muted-foreground">Manage your transactions, subscriptions and recurring payments</p>
          </div>
          <Button onClick={() => setShowAddTransaction(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Transaction
          </Button>
        </div>

        <Tabs defaultValue="transactions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="transactions" className="gap-2">
              <Receipt className="h-4 w-4" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="recurring" className="gap-2">
              <Repeat className="h-4 w-4" />
              Recurring
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Subscriptions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <TransactionsList />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recurring">
            <Card>
              <CardHeader>
                <CardTitle>Recurring Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Recurring transactions functionality coming soon
                </div>
              </CardContent>
            </Card>
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
        onSuccess={() => setShowAddTransaction(false)}
      />
    </div>
  );
};

export default Transactions;