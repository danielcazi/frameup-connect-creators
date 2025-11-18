import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  type?: 'text' | 'email' | 'password' | 'tel' | 'url' | 'number';
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  maxLength?: number;
  showCharCount?: boolean;
  mask?: 'phone' | 'cpf' | 'cnpj';
}

// Mask functions
const maskPhone = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};

const maskCPF = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

const maskCNPJ = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

// Validation functions
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidURL = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const isValidPhone = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 11;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      type = 'text',
      placeholder,
      value,
      onChange,
      error,
      helperText,
      required = false,
      disabled = false,
      icon,
      iconPosition = 'left',
      maxLength,
      showCharCount = false,
      mask,
      className,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isValid, setIsValid] = useState<boolean | null>(null);

    const applyMask = (inputValue: string): string => {
      if (!mask) return inputValue;
      
      switch (mask) {
        case 'phone':
          return maskPhone(inputValue);
        case 'cpf':
          return maskCPF(inputValue);
        case 'cnpj':
          return maskCNPJ(inputValue);
        default:
          return inputValue;
      }
    };

    const validateInput = (inputValue: string): void => {
      if (!inputValue) {
        setIsValid(null);
        return;
      }

      switch (type) {
        case 'email':
          setIsValid(isValidEmail(inputValue));
          break;
        case 'url':
          setIsValid(isValidURL(inputValue));
          break;
        case 'tel':
          setIsValid(isValidPhone(inputValue));
          break;
        default:
          setIsValid(null);
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let newValue = e.target.value;
      
      if (maxLength && newValue.length > maxLength) {
        return;
      }

      if (mask) {
        newValue = applyMask(newValue);
      }

      onChange(newValue);
      
      // Validate with debounce
      setTimeout(() => validateInput(newValue), 300);
    };

    const inputType = type === 'password' && showPassword ? 'text' : type;

    const hasError = !!error;
    const hasSuccess = isValid && !hasError;

    return (
      <div className={cn('flex flex-col gap-1', className)}>
        {label && (
          <label className="text-sm font-semibold text-foreground">
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          <div
            className={cn(
              'relative flex items-center gap-2 h-10 rounded-md border bg-background px-3 transition-all',
              'focus-within:ring-2 focus-within:ring-primary/20',
              hasError && 'border-destructive focus-within:border-destructive focus-within:ring-destructive/20',
              hasSuccess && 'border-success focus-within:border-success focus-within:ring-success/20',
              !hasError && !hasSuccess && 'border-input focus-within:border-primary',
              disabled && 'bg-muted cursor-not-allowed opacity-50'
            )}
          >
            {icon && iconPosition === 'left' && (
              <span className="text-muted-foreground shrink-0 w-5 h-5">
                {icon}
              </span>
            )}

            <input
              ref={ref}
              type={inputType}
              value={value}
              onChange={handleChange}
              placeholder={placeholder}
              disabled={disabled}
              className={cn(
                'flex-1 bg-transparent text-foreground placeholder:text-muted-foreground',
                'focus:outline-none disabled:cursor-not-allowed',
                'text-base'
              )}
              {...props}
            />

            {hasError && (
              <AlertCircle className="text-destructive shrink-0 w-5 h-5" />
            )}

            {hasSuccess && !icon && (
              <CheckCircle className="text-success shrink-0 w-5 h-5" />
            )}

            {type === 'password' && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            )}

            {icon && iconPosition === 'right' && !hasError && !hasSuccess && type !== 'password' && (
              <span className="text-muted-foreground shrink-0 w-5 h-5">
                {icon}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 min-h-[20px]">
          <div className="flex-1">
            {error && (
              <span className="text-sm text-destructive">{error}</span>
            )}
            {helperText && !error && (
              <span className="text-sm text-muted-foreground">{helperText}</span>
            )}
          </div>

          {showCharCount && maxLength && (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {value.length}/{maxLength}
            </span>
          )}
        </div>
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
