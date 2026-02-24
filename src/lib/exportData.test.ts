import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { exportWalletData } from "./exportData";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("exportWalletData", () => {
  const mockWallets = [
    { address: "0x1234567890abcdef1234567890abcdef12345678", label: "Wallet 1" },
    { address: "0xabcdef1234567890abcdef1234567890abcdef12", label: "Wallet 2" },
  ];

  const mockWalletsData = [
    {
      trades: [
        { title: "Market A", outcome: "Yes", side: "buy", size: 100, price: 0.5, timestamp: 1700000000 },
        { title: "Market B", outcome: "No", side: "sell", size: 50, price: 0.75, timestamp: 1700001000 },
      ],
      closedPositions: [
        { title: "Market C", outcome: "Yes", size: 200, avgPrice: 0.4, realizedPnl: 50, timestamp: 1700002000 },
      ],
    },
    {
      trades: [
        { title: "Market D", outcome: "No", side: "buy", size: 75, price: 0.3, timestamp: 1700003000 },
      ],
      closedPositions: [],
    },
  ];

  const mockAnchor = { href: "", download: "", click: vi.fn() };
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  const originalCreateElement = document.createElement.bind(document);

  beforeEach(() => {
    vi.clearAllMocks();
    mockAnchor.href = "";
    mockAnchor.download = "";
    
    URL.createObjectURL = vi.fn().mockReturnValue("blob:test-url");
    URL.revokeObjectURL = vi.fn();
    document.createElement = vi.fn((tag: string) => {
      if (tag === "a") return mockAnchor as unknown as HTMLAnchorElement;
      return originalCreateElement(tag);
    });
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    document.createElement = originalCreateElement;
  });

  describe("trades export", () => {
    it("exports trades as CSV for single wallet", async () => {
      exportWalletData("trades-csv", mockWallets, mockWalletsData, [0]);
      
      expect(mockAnchor.download).toContain("Wallet 1-trades");
      expect(mockAnchor.download).toMatch(/\.csv$/);
      expect(mockAnchor.click).toHaveBeenCalled();
    });

    it("exports trades as JSON for single wallet", async () => {
      exportWalletData("trades-json", mockWallets, mockWalletsData, [0]);
      
      expect(mockAnchor.download).toContain("Wallet 1-trades");
      expect(mockAnchor.download).toMatch(/\.json$/);
    });

    it("exports trades for multiple wallets", async () => {
      exportWalletData("trades-csv", mockWallets, mockWalletsData, [0, 1]);
      
      expect(mockAnchor.download).toContain("2-wallets-trades");
    });
  });

  describe("positions export", () => {
    it("exports positions as CSV", async () => {
      exportWalletData("positions-csv", mockWallets, mockWalletsData, [0]);
      
      expect(mockAnchor.download).toContain("positions");
      expect(mockAnchor.download).toMatch(/\.csv$/);
    });

    it("exports positions as JSON", async () => {
      exportWalletData("positions-json", mockWallets, mockWalletsData, [0]);
      
      expect(mockAnchor.download).toContain("positions");
      expect(mockAnchor.download).toMatch(/\.json$/);
    });
  });

  describe("error handling", () => {
    it("shows error toast when no wallets exist", async () => {
      const { toast } = await import("sonner");
      
      exportWalletData("trades-csv", [], [], []);
      
      expect(toast.error).toHaveBeenCalledWith("No wallets to export");
    });

    it("shows error toast when no trades to export", async () => {
      const { toast } = await import("sonner");
      const emptyWalletsData = [{ trades: [], closedPositions: [] }];
      
      exportWalletData("trades-csv", mockWallets.slice(0, 1), emptyWalletsData, [0]);
      
      expect(toast.error).toHaveBeenCalledWith("No trades to export");
    });

    it("shows error toast when no positions to export", async () => {
      const { toast } = await import("sonner");
      const emptyWalletsData = [{ trades: [], closedPositions: [] }];
      
      exportWalletData("positions-csv", mockWallets.slice(0, 1), emptyWalletsData, [0]);
      
      expect(toast.error).toHaveBeenCalledWith("No positions to export");
    });
  });

  describe("success feedback", () => {
    it("shows success toast for CSV export", async () => {
      const { toast } = await import("sonner");
      
      exportWalletData("trades-csv", mockWallets, mockWalletsData, [0]);
      
      expect(toast.success).toHaveBeenCalledWith("CSV exported");
    });

    it("shows success toast for JSON export", async () => {
      const { toast } = await import("sonner");
      
      exportWalletData("trades-json", mockWallets, mockWalletsData, [0]);
      
      expect(toast.success).toHaveBeenCalledWith("JSON exported");
    });
  });
});
