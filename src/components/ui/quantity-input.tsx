import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface QuantityInputProps {
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
  allowDecimals?: boolean;
  placeholder?: string;
  className?: string;
  variant?: 'success' | 'destructive' | 'default';
}

export function QuantityInput({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  allowDecimals = false,
  placeholder = "Enter quantity",
  className,
  variant = 'default',
}: QuantityInputProps) {
  const numValue = parseFloat(value) || 0;
  const effectiveStep = allowDecimals ? 0.001 : step;
  const effectiveMin = allowDecimals ? 0.001 : (min || 1);

  const increment = () => {
    const newValue = numValue + (allowDecimals ? 1 : step);
    if (max !== undefined && newValue > max) return;
    onChange(formatValue(newValue));
  };

  const decrement = () => {
    const newValue = numValue - (allowDecimals ? 1 : step);
    if (newValue < effectiveMin) {
      onChange(formatValue(effectiveMin));
      return;
    }
    onChange(formatValue(newValue));
  };

  const formatValue = (val: number) => {
    if (allowDecimals) {
      return val.toFixed(3).replace(/\.?0+$/, '');
    }
    return Math.floor(val).toString();
  };

  const ringColor = {
    success: 'focus-within:ring-success/50',
    destructive: 'focus-within:ring-destructive/50',
    default: 'focus-within:ring-primary/50',
  }[variant];

  const buttonColor = {
    success: 'hover:bg-success/10 hover:text-success active:bg-success/20',
    destructive: 'hover:bg-destructive/10 hover:text-destructive active:bg-destructive/20',
    default: 'hover:bg-primary/10 hover:text-primary active:bg-primary/20',
  }[variant];

  return (
    <div className={cn(
      "flex items-center gap-2 p-2 rounded-2xl bg-muted/50 focus-within:ring-2 transition-all",
      ringColor,
      className
    )}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={decrement}
        disabled={numValue <= effectiveMin}
        className={cn(
          "h-12 w-12 rounded-xl shrink-0 touch-feedback transition-colors",
          buttonColor
        )}
      >
        <Minus className="w-5 h-5" />
      </Button>

      <Input
        type="number"
        min={effectiveMin}
        max={max}
        step={effectiveStep}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 border-0 bg-transparent text-2xl font-bold text-center focus-visible:ring-0 focus-visible:ring-offset-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={increment}
        disabled={max !== undefined && numValue >= max}
        className={cn(
          "h-12 w-12 rounded-xl shrink-0 touch-feedback transition-colors",
          buttonColor
        )}
      >
        <Plus className="w-5 h-5" />
      </Button>
    </div>
  );
}