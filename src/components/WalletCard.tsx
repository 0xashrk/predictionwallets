import { useState } from "react";
import { Wallet, X, Pencil, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface WalletCardProps {
  wallet: { address: string; label: string };
  selected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  onRename?: (newLabel: string) => void;
  removable?: boolean;
}

const WalletCard = ({ wallet, selected, onClick, onRemove, onRename, removable }: WalletCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(wallet.label);

  const shortAddress = wallet.address.length > 12
    ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
    : wallet.address;

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (editLabel.trim() && onRename) {
      onRename(editLabel.trim());
    }
    setIsEditing(false);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditLabel(wallet.label);
    setIsEditing(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (editLabel.trim() && onRename) {
        onRename(editLabel.trim());
      }
      setIsEditing(false);
    } else if (e.key === "Escape") {
      setEditLabel(wallet.label);
      setIsEditing(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`stat-card w-full text-left transition-all duration-200 ${
        selected ? "border-primary/50 glow-green" : "hover:border-border/80"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-lg p-2 bg-primary/10 mt-0.5">
          <Wallet className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            {isEditing ? (
              <>
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 bg-secondary rounded px-2 py-0.5 text-sm font-semibold outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSave}
                  className="p-0.5 rounded text-muted-foreground hover:text-primary transition-colors"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <>
                <span className="font-semibold text-sm">{wallet.label}</span>
                {onRename && (
                  <button
                    type="button"
                    onClick={handleEdit}
                    className="p-1 rounded text-muted-foreground/50 hover:text-foreground transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(wallet.address)
                  .then(() => toast.success("Address copied to clipboard"))
                  .catch(() => toast.error("Failed to copy address"));
              }}
              className="font-mono text-muted-foreground hover:text-primary transition-colors cursor-pointer"
              title="Click to copy"
            >
              {shortAddress}
            </button>
            {!isEditing && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`https://polymarket.com/${wallet.address}`, "_blank", "noopener,noreferrer");
                }}
                className="p-1 text-muted-foreground/50 hover:text-primary transition-colors"
                title="View on Polymarket"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        {removable && onRemove && !isEditing && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="p-0.5 rounded text-muted-foreground/40 hover:text-destructive transition-colors -mt-3 -mr-3"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </button>
  );
};

export default WalletCard;
