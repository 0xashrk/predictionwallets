import { useState } from "react";
import { Plus, X, Trash2, GripVertical, Layers } from "lucide-react";
import WalletCard from "@/components/WalletCard";

type ViewMode = "single" | "all" | "compare";

interface Wallet {
  address: string;
  label: string;
}

interface WalletsWidgetProps {
  wallets: Wallet[];
  selectedWallet: number;
  viewMode: ViewMode;
  compareWallets: Set<number>;
  onWalletClick: (index: number) => void;
  onAddWallet: (address: string, label: string) => void;
  onRemoveWallet: (index: number) => void;
  onRenameWallet: (index: number, label: string) => void;
  onRemoveAllWallets: () => void;
  onReorderWallets: (fromIndex: number, toIndex: number) => void;
  onToggleViewMode: (mode: ViewMode) => void;
  onToggleCompareWallet: (index: number) => void;
}

export default function WalletsWidget({
  wallets,
  selectedWallet,
  viewMode,
  compareWallets,
  onWalletClick,
  onAddWallet,
  onRemoveWallet,
  onRenameWallet,
  onRemoveAllWallets,
  onReorderWallets,
  onToggleViewMode,
  onToggleCompareWallet,
}: WalletsWidgetProps) {
  const [newAddress, setNewAddress] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleAddWallet = () => {
    if (newAddress && newAddress.startsWith("0x") && newAddress.length === 42) {
      const label = newLabel.trim() || `Wallet ${wallets.length + 1}`;
      onAddWallet(newAddress, label);
      setNewAddress("");
      setNewLabel("");
      setShowAdd(false);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      onReorderWallets(draggedIndex, dragOverIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-1 py-2 flex-shrink-0">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Wallets</h2>
        <div className="flex items-center gap-2">
          {wallets.length > 1 && (
            <button
              type="button"
              onClick={() => onToggleViewMode(viewMode === "all" ? "single" : "all")}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                viewMode === "all"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <Layers className="h-3 w-3 inline mr-1" />
              All
            </button>
          )}
          {wallets.length > 1 && (
            <button
              type="button"
              onClick={() => onToggleViewMode(viewMode === "compare" ? "single" : "compare")}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                viewMode === "compare"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              Compare
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-3 pr-1">
        {wallets.length === 0 && !showAdd && (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="stat-card flex flex-col items-center justify-center py-8 text-center cursor-pointer hover:border-primary/50 transition-colors w-full"
          >
            <Plus className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium text-foreground">Add your first wallet</p>
            <p className="text-xs text-muted-foreground mt-1">Track Polymarket positions and PnL</p>
          </button>
        )}

        {wallets.map((w, i) => (
          <div
            key={w.address}
            draggable={wallets.length > 1 && viewMode !== "compare"}
            onDragStart={() => handleDragStart(i)}
            onDragOver={(e) => handleDragOver(e, i)}
            onDragEnd={handleDragEnd}
            className={`flex items-center gap-1 transition-all ${
              draggedIndex === i ? "opacity-50" : ""
            } ${dragOverIndex === i ? "border-t-2 border-primary" : ""}`}
          >
            {viewMode === "compare" && (
              <input
                type="checkbox"
                checked={compareWallets.has(i)}
                onChange={() => onToggleCompareWallet(i)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
            )}
            {wallets.length > 1 && viewMode !== "compare" && (
              <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1">
                <GripVertical className="h-4 w-4" />
              </div>
            )}
            <div className="flex-1">
              <WalletCard
                wallet={w}
                selected={
                  viewMode === "single"
                    ? i === selectedWallet
                    : viewMode === "all"
                    ? true
                    : compareWallets.has(i)
                }
                onClick={() => onWalletClick(i)}
                onRemove={() => onRemoveWallet(i)}
                onRename={(label) => onRenameWallet(i, label)}
                removable
              />
            </div>
          </div>
        ))}

        {showAdd && (
          <div className="stat-card space-y-2">
            <input
              type="text"
              placeholder="0x... (wallet address)"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              className="w-full bg-secondary rounded-md px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground outline-none"
            />
            <input
              type="text"
              placeholder="Name (optional)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="w-full bg-secondary rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddWallet}
                className="flex-1 bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAdd(false);
                  setNewAddress("");
                  setNewLabel("");
                }}
                className="text-muted-foreground hover:text-foreground px-2 py-2 rounded-md transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {wallets.length > 0 && !showAdd && (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <Plus className="h-3 w-3" />
            Add wallet
          </button>
        )}

        {wallets.length > 1 && (
          <button
            type="button"
            onClick={onRemoveAllWallets}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="h-3 w-3" />
            Remove all wallets
          </button>
        )}
      </div>
    </div>
  );
}
