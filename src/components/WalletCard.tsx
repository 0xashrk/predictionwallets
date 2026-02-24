import { useState } from "react";
import { Wallet, X, Pencil, Check, Copy, ExternalLink } from "lucide-react";
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

  const handleCopyAddress = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(wallet.address).then(() => {
      toast.success("Address copied to clipboard");
    }).catch(() => {
      toast.error("Failed to copy address");
    });
  };

  const handleOpenPolymarket = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`https://polymarket.com/${wallet.address}`, "_blank", "noopener,noreferrer");
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`stat-card w-full text-left transition-all duration-200 group ${
        selected ? "border-primary/50 glow-green" : "hover:border-border/80"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="rounded-lg p-2 bg-primary/10">
          <Wallet className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          {isEditing ? (
            <input
              type="text"
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-secondary rounded px-2 py-0.5 text-sm font-semibold outline-none"
              autoFocus
            />
          ) : (
            <div className="font-semibold text-sm truncate">{wallet.label}</div>
          )}
          <div className="flex items-center gap-1">
            <span className="font-mono text-xs text-muted-foreground truncate">{shortAddress}</span>
            {!isEditing && (
              <div className="flex items-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={handleCopyAddress}
                  className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  title="Copy address"
                >
                  <Copy className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={handleOpenPolymarket}
                  className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  title="View on Polymarket"
                >
                  <ExternalLink className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </div>
        {isEditing ? (
          <button
            type="button"
            onClick={handleSave}
            className="p-1 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        ) : (
          onRename && (
            <button
              type="button"
              onClick={handleEdit}
              className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )
        )}
        {removable && onRemove && !isEditing && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </button>
  );
};

export default WalletCard;
