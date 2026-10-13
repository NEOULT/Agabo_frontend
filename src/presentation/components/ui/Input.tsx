import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-text-secondary">
            {label}
            {props.required && <span className="text-semantic-danger-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-muted">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            className={`
              w-full rounded-lg border bg-surface-primary px-3 py-2 text-sm
              transition-colors duration-150
              placeholder:text-text-muted
              focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500
              disabled:bg-surface-secondary disabled:text-text-tertiary disabled:cursor-not-allowed
              ${error ? 'border-semantic-danger-300 focus:ring-semantic-danger-500 focus:border-semantic-danger-500' : 'border-border-input'}
              ${leftIcon ? 'pl-10' : ''}
              ${className}
            `}
            {...props}
          />
        </div>

        {error && <p className="text-sm text-semantic-danger-600">{error}</p>}
        {helperText && !error && <p className="text-sm text-text-tertiary">{helperText}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
