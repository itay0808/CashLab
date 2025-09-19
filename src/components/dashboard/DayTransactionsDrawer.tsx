import { format } from "date-fns";
import { X, DollarSign, Repeat, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerClose } from "@/components/ui/drawer";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  transaction_date: string;
  type: string;
  category?: {
    name: string;
    icon: string;
  } | null;
}

interface RecurringTransaction {
  id: string;
  name: string;
  amount: number;
  next_due_date: string;
  frequency: string;
  type: string;
  category?: {
    name: string;
    icon: string;
  } | null;
}

interface DayTransactionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  transactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
}

export const DayTransactionsDrawer = ({ 
  isOpen, 
  onClose, 
  date, 
  transactions, 
  recurringTransactions 
}: DayTransactionsDrawerProps) => {
  const formatCurrency = (amount: number) => {
    return `₪${Math.abs(amount).toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const getTransactionTypeColor = (type: string) => {
    return type === 'income' 
      ? 'bg-success/10 text-success border-success/20' 
      : 'bg-danger/10 text-danger border-danger/20';
  };

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const recurringIncome = recurringTransactions
    .filter(rt => rt.type === 'income')
    .reduce((sum, rt) => sum + rt.amount, 0);

  const recurringExpenses = recurringTransactions
    .filter(rt => rt.type === 'expense')
    .reduce((sum, rt) => sum + Math.abs(rt.amount), 0);

  const netTotal = (totalIncome + recurringIncome) - (totalExpenses + recurringExpenses);

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle className="text-lg font-semibold">
                {format(date, 'EEEE, MMMM d, yyyy')}
              </DrawerTitle>
              <DrawerDescription className="text-sm text-muted-foreground">
                All transactions for this day
              </DrawerDescription>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="bg-success/10 rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground">Income</div>
              <div className="text-sm font-semibold text-success">
                +{formatCurrency(totalIncome + recurringIncome)}
              </div>
            </div>
            <div className="bg-danger/10 rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground">Expenses</div>
              <div className="text-sm font-semibold text-danger">
                -{formatCurrency(totalExpenses + recurringExpenses)}
              </div>
            </div>
            <div className={`${netTotal >= 0 ? 'bg-success/10' : 'bg-danger/10'} rounded-lg p-3 text-center`}>
              <div className="text-xs text-muted-foreground">Net</div>
              <div className={`text-sm font-semibold ${netTotal >= 0 ? 'text-success' : 'text-danger'}`}>
                {netTotal >= 0 ? '+' : ''}{formatCurrency(netTotal)}
              </div>
            </div>
          </div>
        </DrawerHeader>

        <div className="px-4 pb-4 space-y-4 overflow-y-auto">
          {/* Regular Transactions */}
          {transactions.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Transactions</h3>
              {transactions.map(transaction => (
                <Card key={transaction.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {transaction.description}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {transaction.category && (
                            <Badge variant="secondary" className="text-xs">
                              {transaction.category.name}
                            </Badge>
                          )}
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(transaction.transaction_date), 'HH:mm')}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className={`text-sm font-semibold ${
                      transaction.type === 'income' ? 'text-success' : 'text-danger'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Recurring Transactions */}
          {recurringTransactions.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Recurring Transactions</h3>
              {recurringTransactions.map(recurring => (
                <Card key={recurring.id} className="p-3 bg-warning/5 border-warning/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        <Repeat className="h-4 w-4 text-warning" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {recurring.name}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs border-warning/30 text-warning">
                            {recurring.frequency}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className={`text-sm font-semibold ${
                      recurring.type === 'income' ? 'text-success' : 'text-danger'
                    }`}>
                      {recurring.type === 'income' ? '+' : '-'}{formatCurrency(recurring.amount)}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Empty state */}
          {transactions.length === 0 && recurringTransactions.length === 0 && (
            <div className="text-center py-8">
              <div className="text-muted-foreground text-sm">
                No transactions for this day
              </div>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};