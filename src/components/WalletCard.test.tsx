import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import WalletCard from "./WalletCard";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockClipboard = {
  writeText: vi.fn(),
};

const mockWindowOpen = vi.fn();

describe("WalletCard", () => {
  const mockWallet = {
    address: "0x1234567890abcdef1234567890abcdef12345678",
    label: "Test Wallet",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, { clipboard: mockClipboard });
    window.open = mockWindowOpen;
  });

  it("renders wallet label and truncated address", () => {
    render(<WalletCard wallet={mockWallet} />);
    
    expect(screen.getByText("Test Wallet")).toBeInTheDocument();
    expect(screen.getByText("0x1234...5678")).toBeInTheDocument();
  });

  it("shows selected state when selected prop is true", () => {
    const { container } = render(<WalletCard wallet={mockWallet} selected />);
    
    const button = container.querySelector("button");
    expect(button).toHaveClass("border-primary/50");
  });

  describe("copy address functionality", () => {
    it("copies address to clipboard on click", async () => {
      mockClipboard.writeText.mockResolvedValue(undefined);
      
      render(<WalletCard wallet={mockWallet} />);
      
      const copyButton = screen.getByTitle("Copy address");
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledWith(mockWallet.address);
      });
    });

    it("shows success toast after copying", async () => {
      const { toast } = await import("sonner");
      mockClipboard.writeText.mockResolvedValue(undefined);
      
      render(<WalletCard wallet={mockWallet} />);
      
      const copyButton = screen.getByTitle("Copy address");
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Address copied to clipboard");
      });
    });

    it("shows error toast if copy fails", async () => {
      const { toast } = await import("sonner");
      mockClipboard.writeText.mockRejectedValue(new Error("Copy failed"));
      
      render(<WalletCard wallet={mockWallet} />);
      
      const copyButton = screen.getByTitle("Copy address");
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to copy address");
      });
    });
  });

  describe("predictfolio link functionality", () => {
    it("opens predictfolio in new tab on click", () => {
      render(<WalletCard wallet={mockWallet} />);
      
      const linkButton = screen.getByTitle("View on Predictfolio");
      fireEvent.click(linkButton);
      
      expect(mockWindowOpen).toHaveBeenCalledWith(
        `https://predictfolio.com/${mockWallet.address}`,
        "_blank",
        "noopener,noreferrer"
      );
    });
  });

  describe("edit functionality", () => {
    it("shows edit button when onRename is provided", () => {
      render(<WalletCard wallet={mockWallet} onRename={vi.fn()} />);
      
      const editButtons = screen.getAllByRole("button");
      const pencilButton = editButtons.find(btn => 
        btn.querySelector("svg.lucide-pencil")
      );
      expect(pencilButton).toBeInTheDocument();
    });

    it("enters edit mode on pencil click", () => {
      render(<WalletCard wallet={mockWallet} onRename={vi.fn()} />);
      
      const buttons = screen.getAllByRole("button");
      const editButton = buttons.find(btn => {
        const svg = btn.querySelector("svg");
        return svg?.classList.contains("lucide-pencil");
      });
      
      if (editButton) {
        fireEvent.click(editButton);
        expect(screen.getByRole("textbox")).toBeInTheDocument();
      }
    });
  });

  describe("remove functionality", () => {
    it("shows remove button when removable and onRemove provided", () => {
      render(<WalletCard wallet={mockWallet} removable onRemove={vi.fn()} />);
      
      const buttons = screen.getAllByRole("button");
      const removeButton = buttons.find(btn => {
        const svg = btn.querySelector("svg");
        return svg?.classList.contains("lucide-x");
      });
      expect(removeButton).toBeInTheDocument();
    });

    it("calls onRemove when remove button clicked", () => {
      const onRemove = vi.fn();
      render(<WalletCard wallet={mockWallet} removable onRemove={onRemove} />);
      
      const buttons = screen.getAllByRole("button");
      const removeButton = buttons.find(btn => {
        const svg = btn.querySelector("svg");
        return svg?.classList.contains("lucide-x");
      });
      
      if (removeButton) {
        fireEvent.click(removeButton);
        expect(onRemove).toHaveBeenCalled();
      }
    });
  });

  it("calls onClick when card is clicked", () => {
    const onClick = vi.fn();
    render(<WalletCard wallet={mockWallet} onClick={onClick} />);
    
    const cardButton = screen.getByRole("button", { name: /test wallet/i });
    fireEvent.click(cardButton);
    
    expect(onClick).toHaveBeenCalled();
  });
});
