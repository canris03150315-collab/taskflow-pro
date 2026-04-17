import React from 'react';

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="text-center py-16 bg-white rounded-xl border border-slate-200 border-dashed animate-fade-in">
      <div className="text-5xl mb-4 grayscale opacity-50">{icon}</div>
      <p className="text-slate-400 font-bold text-base">{title}</p>
      {description && <p className="text-slate-300 text-sm mt-2">{description}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white text-sm font-bold rounded-lg transition transform hover:scale-105 active:scale-95 min-h-[44px]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
