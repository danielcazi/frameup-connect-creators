import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditingStyleCardProps {
  style: string;
  icon: string;
  title: string;
  description: string;
  features: string[];
  selected: boolean;
  onClick: () => void;
}

export function EditingStyleCard({ 
  style, 
  icon, 
  title, 
  description, 
  features, 
  selected, 
  onClick 
}: EditingStyleCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative p-6 rounded-lg border-2 text-left transition-all duration-200 h-full",
        "hover:shadow-md hover:-translate-y-1",
        selected 
          ? "border-primary bg-primary/5" 
          : "border-border bg-card hover:border-primary/50"
      )}
    >
      {selected && (
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-4 h-4 text-primary-foreground" />
        </div>
      )}
      
      <div className="text-3xl mb-3">{icon}</div>
      <h4 className="text-lg font-semibold mb-2 text-foreground">{title}</h4>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{description}</p>
      
      <ul className="space-y-2">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2 text-sm">
            <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
            <span className="text-muted-foreground">{feature}</span>
          </li>
        ))}
      </ul>
    </button>
  );
}
