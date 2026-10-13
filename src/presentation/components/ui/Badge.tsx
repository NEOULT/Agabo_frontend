type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-semantic-success-100 text-semantic-success-800',
  warning: 'bg-semantic-warning-100 text-semantic-warning-800',
  danger: 'bg-semantic-danger-100 text-semantic-danger-800',
  info: 'bg-brand-100 text-brand-800',
  neutral: 'bg-surface-tertiary text-text-primary',
};

export function Badge({ variant = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
