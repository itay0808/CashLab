import { Header } from "@/components/dashboard/Header";
import { AccountBalance } from "@/components/dashboard/AccountBalance";
import { TransactionsList } from "@/components/dashboard/TransactionsList";
import { SubscriptionsTracker } from "@/components/dashboard/SubscriptionsTracker";
import { SavingsGoal } from "@/components/dashboard/SavingsGoal";
import { SpendingChart } from "@/components/dashboard/SpendingChart";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      
      <main className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Top section - Account Balance */}
        <AccountBalance />
        
        {/* Middle section - 2 column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TransactionsList />
          <SubscriptionsTracker />
        </div>
        
        {/* Bottom section - 2 column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SpendingChart />
          <SavingsGoal />
        </div>
      </main>
    </div>
  );
};

export default Index;
