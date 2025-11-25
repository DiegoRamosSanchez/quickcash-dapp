// src/app/dapp/interfaces/transaction.interface.ts
export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  status: 'confirmed' | 'failed' | 'pending';
  timestamp: number;
  isOutgoing: boolean;
  gasUsed?: string;
  gasPrice?: string;
}
