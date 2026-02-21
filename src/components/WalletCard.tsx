import { Wallet, X } from "lucide-react";

interface WalletCardProps {
  wallet: { address: string; label: string };
  selected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  removable?: boolean;
}

const WalletCard = ({ wallet, selected, onClick, onRemove, removable }: WalletCardProps) => {
  const shortAddress = wallet.address.length > 12
    ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
    : wallet.address;

  return (
    <button
      onClick={onClick}
      className={`stat-card w-full text-left transition-all duration-200 ${
        selected ? "border-primary/50 glow-green" : "hover:border-border/80"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="rounded-lg p-2 bg-primary/10">
          <Wallet className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{wallet.label}</div>
          <div className="font-mono text-xs text-muted-foreground">{shortAddress}</div>
        </div>
        {removable && onRemove && (
          <div
            role="button"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </div>
        )}
      </div>
    </button>
  );
};

export default WalletCard;
