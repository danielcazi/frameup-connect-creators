import React from 'react';
import { Check } from 'lucide-react';

interface ProgressStepsProps {
  currentStep: number;
  totalSteps: number;
}

export function ProgressSteps({ currentStep, totalSteps }: ProgressStepsProps) {
  const steps = [
    { number: 1, label: 'Tipo e Estilo' },
    { number: 2, label: 'Detalhes' }
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = step.number === currentStep;
          const isCompleted = step.number < currentStep;
          
          return (
            <React.Fragment key={step.number}>
              <div className="flex flex-col items-center">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  font-semibold transition-all duration-200
                  ${isCompleted ? 'bg-green-500 text-white' : ''}
                  ${isActive ? 'bg-primary text-primary-foreground' : ''}
                  ${!isActive && !isCompleted ? 'bg-muted text-muted-foreground' : ''}
                `}>
                  {isCompleted ? <Check className="w-5 h-5" /> : step.number}
                </div>
                <span className={`text-xs mt-2 font-medium ${
                  isActive ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {step.label}
                </span>
              </div>
              
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-4 transition-colors duration-200 ${
                  step.number < currentStep ? 'bg-green-500' : 'bg-muted'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
