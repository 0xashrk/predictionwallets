import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
  icon?: ReactNode;
}

const StatCard = ({ label, value, change, positive, icon }: StatCardProps) => (
  <div className="stat-card group">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
      {icon && <span className="text-muted-foreground group-hover:text-foreground transition-colors">{icon}</span>}
    </div>
    <div className="font-mono text-2xl font-bold tracking-tight">{value}</div>
    {change && (
      <span className={`font-mono text-sm font-medium mt-1 inline-block ${positive ? "text-gain" : "text-loss"}`}>
        {change}
      </span>
    )}
  </div>
);

export default StatCard;
