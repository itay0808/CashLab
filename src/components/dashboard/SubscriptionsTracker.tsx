import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calendar, X } from "lucide-react";

export const SubscriptionsTracker = () => {
  const subscriptions = [
    { 
      name: "Netflix", 
      amount: 15.99, 
      nextBill: "Dec 20", 
      status: "active",
      category: "Entertainment"
    },
    { 
      name: "Spotify", 
      amount: 9.99, 
      nextBill: "Dec 22", 
      status: "active",
      category: "Music"
    },
    { 
      name: "Adobe Creative", 
      amount: 52.99, 
      nextBill: "Dec 25", 
      status: "active",
      category: "Software"
    },
    { 
      name: "Gym Membership", 
      amount: 29.99, 
      nextBill: "Jan 1", 
      status: "expiring",
      category: "Health"
    },
  ];

  const totalMonthly = subscriptions.reduce((sum, sub) => sum + sub.amount, 0);

  return (
    <Card className="p-6 bg-gradient-card shadow-card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Subscriptions</h3>
          <p className="text-sm text-muted-foreground">
            ${totalMonthly.toFixed(2)}/month • {subscriptions.length} active
          </p>
        </div>
        <Button variant="outline" size="sm" className="text-danger border-danger/20 hover:bg-danger/10">
          Manage All
        </Button>
      </div>

      <div className="space-y-3">
        {subscriptions.map((sub, index) => (
          <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-border/50">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                sub.status === 'expiring' ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'
              }`}>
                {sub.name.charAt(0)}
              </div>
              <div>
                <div className="font-medium flex items-center gap-2">
                  {sub.name}
                  {sub.status === 'expiring' && (
                    <AlertTriangle className="h-4 w-4 text-warning" />
                  )}
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  Next: {sub.nextBill}
                  <Badge variant="outline" className="text-xs">
                    {sub.category}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-semibold">${sub.amount}</span>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-danger">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-warning/10 rounded-lg border border-warning/20">
        <div className="flex items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <span className="font-medium text-warning">1 subscription expiring soon</span>
        </div>
      </div>
    </Card>
  );
};