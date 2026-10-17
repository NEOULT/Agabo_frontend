import React from 'react';

interface PlainToastProps {
  label?: string;
  value?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export function PlainToast(props: PlainToastProps) {
  const { label, value, onClick, className, style } = props;
  return (
    <div className={`${className || ''} inline-flex items-center gap-2 rounded-lg bg-surface-primary px-3 py-1.5 text-sm text-text-secondary shadow-soft ${onClick ? 'cursor-pointer hover:bg-surface-tertiary' : ''}`}
      style={style}
      onClick={onClick}
    >
      {label && <span>{label}</span>}
      {value}
    </div>
  );
}
