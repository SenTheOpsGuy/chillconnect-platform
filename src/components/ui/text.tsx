import React from 'react';
import { cn } from '@/lib/utils';

// Text component variants with proper contrast
export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'label' | 'caption' | 'number';
  children: React.ReactNode;
  as?: keyof JSX.IntrinsicElements;
}

const textVariants = {
  h1: 'text-3xl font-bold text-gray-900',
  h2: 'text-2xl font-bold text-gray-900',
  h3: 'text-xl font-semibold text-gray-900',
  h4: 'text-lg font-semibold text-gray-900',
  body: 'text-base text-gray-900',
  label: 'text-sm font-medium text-gray-900',
  caption: 'text-sm text-gray-800',
  number: 'font-semibold text-gray-900'
};

export const Text: React.FC<TextProps> = ({ 
  variant = 'body', 
  className, 
  children, 
  as,
  ...props 
}) => {
  const Component = as || getDefaultElement(variant);
  
  return (
    <Component 
      className={cn(textVariants[variant], className)} 
      {...props}
    >
      {children}
    </Component>
  );
};

function getDefaultElement(variant: TextProps['variant']): keyof JSX.IntrinsicElements {
  switch (variant) {
    case 'h1': return 'h1';
    case 'h2': return 'h2';
    case 'h3': return 'h3';
    case 'h4': return 'h4';
    case 'label': return 'label';
    case 'caption': return 'p';
    case 'number': return 'span';
    default: return 'p';
  }
}

// Specific text components for common use cases
export const Heading1: React.FC<Omit<TextProps, 'variant'>> = (props) => 
  <Text variant="h1" {...props} />;

export const Heading2: React.FC<Omit<TextProps, 'variant'>> = (props) => 
  <Text variant="h2" {...props} />;

export const Heading3: React.FC<Omit<TextProps, 'variant'>> = (props) => 
  <Text variant="h3" {...props} />;

export const Heading4: React.FC<Omit<TextProps, 'variant'>> = (props) => 
  <Text variant="h4" {...props} />;

export const Body: React.FC<Omit<TextProps, 'variant'>> = (props) => 
  <Text variant="body" {...props} />;

export const Label: React.FC<Omit<TextProps, 'variant'>> = (props) => 
  <Text variant="label" {...props} />;

export const Caption: React.FC<Omit<TextProps, 'variant'>> = (props) => 
  <Text variant="caption" {...props} />;

export const NumberDisplay: React.FC<Omit<TextProps, 'variant'>> = (props) => 
  <Text variant="number" {...props} />;

// Stats display component for dashboards
export interface StatsCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export const StatsCard: React.FC<StatsCardProps> = ({ label, value, icon, trend }) => (
  <div className="bg-white p-6 rounded-lg shadow-sm">
    <div className="flex items-center">
      {icon && <div className="mr-4">{icon}</div>}
      <div>
        <Label className="mb-1">{label}</Label>
        <NumberDisplay className="text-2xl">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </NumberDisplay>
        {trend && (
          <Caption className={`mt-1 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </Caption>
        )}
      </div>
    </div>
  </div>
);

// Data list component with proper contrast
export interface DataListItemProps {
  label: string;
  value: string | number;
  valueColor?: 'default' | 'success' | 'warning' | 'error';
}

export const DataListItem: React.FC<DataListItemProps> = ({ 
  label, 
  value, 
  valueColor = 'default' 
}) => {
  const valueColorClass = {
    default: 'text-gray-900',
    success: 'text-green-600',
    warning: 'text-orange-600',
    error: 'text-red-600'
  }[valueColor];

  return (
    <div className="flex items-center justify-between">
      <Caption>{label}</Caption>
      <NumberDisplay className={valueColorClass}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </NumberDisplay>
    </div>
  );
};