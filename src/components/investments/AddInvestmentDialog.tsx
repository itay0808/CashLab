import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Plus, TrendingUp } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";

interface AddInvestmentDialogProps {
  onInvestmentAdded?: () => void;
}

export const AddInvestmentDialog = ({ onInvestmentAdded }: AddInvestmentDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [investmentType, setInvestmentType] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [purchaseDate, setPurchaseDate] = useState<Date>();
  const [currentPrice, setCurrentPrice] = useState("");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to add an investment.",
        variant: "destructive",
      });
      return;
    }

    if (!name.trim() || !investmentType || !purchasePrice || !quantity || !purchaseDate) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("investments")
        .insert({
          user_id: user.id,
          name: name.trim(),
          symbol: symbol.trim() || null,
          investment_type: investmentType,
          purchase_price: parseFloat(purchasePrice),
          quantity: parseFloat(quantity),
          purchase_date: purchaseDate.toISOString().split('T')[0],
          current_price: currentPrice ? parseFloat(currentPrice) : null,
          notes: notes.trim() || null,
        });

      if (error) throw error;

      toast({
        title: "Investment added",
        description: `${name} has been added to your portfolio.`,
      });

      // Reset form
      setName("");
      setSymbol("");
      setInvestmentType("");
      setPurchasePrice("");
      setQuantity("");
      setPurchaseDate(undefined);
      setCurrentPrice("");
      setNotes("");
      setOpen(false);
      
      if (onInvestmentAdded) onInvestmentAdded();
    } catch (error) {
      console.error("Error adding investment:", error);
      toast({
        title: "Error",
        description: "Failed to add investment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Investment
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Add Investment
          </SheetTitle>
        </SheetHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div>
            <Label htmlFor="name">Investment Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Apple Inc., S&P 500 ETF"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="symbol">Symbol</Label>
            <Input
              id="symbol"
              placeholder="e.g., AAPL, SPY"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            />
          </div>

          <div>
            <Label htmlFor="investment-type">Investment Type *</Label>
            <Select value={investmentType} onValueChange={setInvestmentType} required>
              <SelectTrigger>
                <SelectValue placeholder="Select investment type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stock">Stock</SelectItem>
                <SelectItem value="bond">Bond</SelectItem>
                <SelectItem value="mutual_fund">Mutual Fund</SelectItem>
                <SelectItem value="etf">ETF</SelectItem>
                <SelectItem value="crypto">Cryptocurrency</SelectItem>
                <SelectItem value="real_estate">Real Estate</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="purchase-price">Purchase Price *</Label>
              <Input
                id="purchase-price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                step="0.000001"
                min="0"
                placeholder="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label>Purchase Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {purchaseDate ? format(purchaseDate, "PPP") : "Select purchase date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={purchaseDate}
                  onSelect={setPurchaseDate}
                  initialFocus
                  disabled={(date) => date > new Date()}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="current-price">Current Price</Label>
            <Input
              id="current-price"
              type="number"
              step="0.01"
              min="0"
              placeholder="Leave empty to use purchase price"
              value={currentPrice}
              onChange={(e) => setCurrentPrice(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this investment"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <Button type="submit" disabled={loading} size="lg">
              {loading ? "Adding..." : "Add Investment"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} size="lg">
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};