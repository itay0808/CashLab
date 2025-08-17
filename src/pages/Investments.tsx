import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Navigation } from "@/components/navigation/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, TrendingDown, DollarSign, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AddInvestmentDialog } from "@/components/investments/AddInvestmentDialog";

interface Investment {
  id: string;
  name: string;
  symbol: string | null;
  investment_type: string;
  purchase_price: number;
  purchase_date: string;
  quantity: number;
  current_price: number | null;
  notes: string | null;
}

const Investments = () => {
  const { user, loading } = useAuth();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [investmentsLoading, setInvestmentsLoading] = useState(true);
  const { toast } = useToast();

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

  useEffect(() => {
    if (user) {
      fetchInvestments();
    }
  }, [user]);

  const fetchInvestments = async () => {
    try {
      const { data, error } = await supabase
        .from("investments")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvestments(data || []);
    } catch (error) {
      console.error("Error fetching investments:", error);
      toast({
        title: "Error",
        description: "Failed to load investments.",
        variant: "destructive",
      });
    } finally {
      setInvestmentsLoading(false);
    }
  };

  const handleInvestmentAdded = () => {
    fetchInvestments();
  };

  const calculatePerformance = (investment: Investment) => {
    const currentPrice = investment.current_price || investment.purchase_price;
    const totalValue = investment.quantity * currentPrice;
    const totalCost = investment.quantity * investment.purchase_price;
    const gainLoss = totalValue - totalCost;
    const percentage = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;
    
    return { totalValue, gainLoss, percentage };
  };

  const totalPortfolioValue = investments.reduce((sum, inv) => {
    const { totalValue } = calculatePerformance(inv);
    return sum + totalValue;
  }, 0);

  const totalGainLoss = investments.reduce((sum, inv) => {
    const { gainLoss } = calculatePerformance(inv);
    return sum + gainLoss;
  }, 0);

  const portfolioPercentage = investments.reduce((sum, inv) => sum + inv.quantity * inv.purchase_price, 0) > 0 
    ? (totalGainLoss / investments.reduce((sum, inv) => sum + inv.quantity * inv.purchase_price, 0)) * 100 
    : 0;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navigation />
      
      <main className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Investment Portfolio</h1>
            <p className="text-muted-foreground">Track your investment performance</p>
          </div>
          <AddInvestmentDialog onInvestmentAdded={handleInvestmentAdded} />
        </div>

        {/* Portfolio Overview */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalPortfolioValue.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Gain/Loss</CardTitle>
              {totalGainLoss >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${Math.abs(totalGainLoss).toLocaleString()}
              </div>
              <Badge variant={totalGainLoss >= 0 ? "default" : "destructive"}>
                {portfolioPercentage >= 0 ? '+' : ''}{portfolioPercentage.toFixed(2)}%
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Holdings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{investments.length}</div>
              <p className="text-xs text-muted-foreground">Active investments</p>
            </CardContent>
          </Card>
        </div>

        {/* Investments List */}
        {investmentsLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center">Loading investments...</div>
            </CardContent>
          </Card>
        ) : investments.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <TrendingUp className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No investments yet</h3>
              <p className="text-muted-foreground mb-6">
                Start building your investment portfolio by adding your first investment.
              </p>
              <AddInvestmentDialog onInvestmentAdded={handleInvestmentAdded} />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {investments.map((investment) => {
              const { totalValue, gainLoss, percentage } = calculatePerformance(investment);
              
              return (
                <Card key={investment.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{investment.name}</CardTitle>
                        {investment.symbol && (
                          <CardDescription>{investment.symbol}</CardDescription>
                        )}
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {investment.investment_type.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Quantity</p>
                        <p className="font-semibold">{investment.quantity}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Purchase Price</p>
                        <p className="font-semibold">${investment.purchase_price}</p>
                      </div>
                    </div>
                    
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-sm text-muted-foreground">Current Value</span>
                        <span className="text-xl font-bold">${totalValue.toLocaleString()}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Gain/Loss</span>
                        <div className="text-right">
                          <div className={`font-semibold ${gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${Math.abs(gainLoss).toLocaleString()}
                          </div>
                          <Badge 
                            variant={gainLoss >= 0 ? "default" : "destructive"}
                            className="text-xs"
                          >
                            {percentage >= 0 ? '+' : ''}{percentage.toFixed(2)}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      Purchased: {new Date(investment.purchase_date).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Investments;