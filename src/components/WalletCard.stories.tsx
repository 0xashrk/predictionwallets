import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Toaster } from 'sonner';
import WalletCard from './WalletCard';

const meta = {
  title: 'Components/WalletCard',
  component: WalletCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="dark p-8 bg-background min-w-[300px]">
        <Toaster position="top-center" />
        <Story />
      </div>
    ),
  ],
  args: {
    onClick: fn(),
    onRemove: fn(),
    onRename: fn(),
  },
} satisfies Meta<typeof WalletCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleWallet = {
  address: '0x1234567890abcdef1234567890abcdef12345678',
  label: 'Gina FC Sid',
};

export const Default: Story = {
  args: {
    wallet: sampleWallet,
  },
};

export const Selected: Story = {
  args: {
    wallet: sampleWallet,
    selected: true,
  },
};

export const WithRemoveButton: Story = {
  args: {
    wallet: sampleWallet,
    removable: true,
  },
};

export const SelectedWithActions: Story = {
  args: {
    wallet: sampleWallet,
    selected: true,
    removable: true,
  },
};

export const LongWalletName: Story = {
  args: {
    wallet: {
      address: '0xabcdef1234567890abcdef1234567890abcdef12',
      label: 'My Very Long Wallet Name That Might Overflow',
    },
    removable: true,
  },
};

export const ShortAddress: Story = {
  args: {
    wallet: {
      address: '0x1234',
      label: 'Short',
    },
  },
};
