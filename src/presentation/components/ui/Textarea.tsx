import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className = '', rows = 3, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-text-secondary">
            {label}
            {props.required && <span className="text-semantic-danger-500 ml-1">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          rows={rows}
          className={`
            w-full rounded-lg border bg-surface-primary px-3 py-2 text-sm
            transition-colors duration-150 resize-y
            placeholder:text-text-muted
            focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500
            disabled:bg-surface-secondary disabled:text-text-tertiary disabled:cursor-not-allowed
            ${error ? 'border-semantic-danger-300 focus:ring-semantic-danger-500 focus:border-semantic-danger-500' : 'border-border-input'}
            ${className}
          `}
          {...props}
        />

        {error && <p className="text-sm text-semantic-danger-600">{error}</p>}
        {helperText && !error && <p className="text-sm text-text-tertiary">{helperText}</p>}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';
