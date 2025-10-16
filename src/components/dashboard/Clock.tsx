import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Clock as ClockIcon } from 'lucide-react';

export const Clock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Card className="bg-gradient-card shadow-elevated border-border/50">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <ClockIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Current Time</h3>
              <p className="text-sm text-muted-foreground">Live clock</p>
            </div>
          </div>
        </div>

        <div className="text-center space-y-2">
          <div className="text-4xl font-mono font-bold text-primary">
            {formatTime(time)}
          </div>
          <div className="text-lg text-muted-foreground">
            {formatDate(time)}
          </div>
        </div>
      </div>
    </Card>
  );
};