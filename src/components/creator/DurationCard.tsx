import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DurationCardProps {
  duration: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}

export function DurationCard({ duration, label, selected, onClick }: DurationCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative p-6 rounded-lg border-2 transition-all duration-200",
        "hover:shadow-md hover:-translate-y-1 flex flex-col items-center justify-center",
        selected 
          ? "border-primary bg-primary/5" 
          : "border-border bg-card hover:border-primary/50"
      )}
    >
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-3 h-3 text-primary-foreground" />
        </div>
      )}
      
      <div className="text-3xl font-bold text-foreground mb-2">{duration}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </button>
  );
}
