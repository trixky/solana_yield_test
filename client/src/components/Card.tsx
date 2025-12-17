import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
}

export default function Card({ children, className = '', title, subtitle, icon }: CardProps) {
  return (
    <div className={`glass rounded-2xl p-6 ${className}`}>
      {(title || icon) && (
        <div className="flex items-start gap-4 mb-6">
          {icon && (
            <div className="w-12 h-12 rounded-xl bg-vault-500/20 flex items-center justify-center flex-shrink-0">
              {icon}
            </div>
          )}
          <div>
            {title && (
              <h3 className="font-display font-semibold text-lg text-white">{title}</h3>
            )}
            {subtitle && (
              <p className="text-sm text-dark-400 mt-1">{subtitle}</p>
            )}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}


