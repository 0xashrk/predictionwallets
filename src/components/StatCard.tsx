import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
  icon?: ReactNode;
}

const StatCard = ({ label, value, change, positive, icon }: StatCardProps) => {
  const valueColor = positive === true ? "text-gain" : positive === false ? "text-loss" : "";
  
  return (
    <div className="stat-card group h-full flex flex-col">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <span className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
        {icon && <span className="text-muted-foreground group-hover:text-foreground transition-colors">{icon}</span>}
      </div>
      <div className="flex-1 flex items-center">
        <div className={`font-mono text-lg sm:text-2xl font-bold tracking-tight ${valueColor}`}>{value}</div>
      </div>
      {change && (
        <span className={`font-mono text-xs sm:text-sm font-medium mt-1 inline-block ${positive ? "text-gain" : "text-loss"}`}>
          {change}
        </span>
      )}
    </div>
  );
};

export default StatCard;
