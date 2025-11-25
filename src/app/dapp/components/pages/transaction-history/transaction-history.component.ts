import { Component, Input, OnInit, OnDestroy, effect } from "@angular/core";
import { CommonModule } from "@angular/common";
import { EtherscanService } from "../../../services/etherscan.service";
import { EtherService } from "../../../services/ether.service";
import { Transaction } from "../../../interfaces/transaction.interface";
import { Subscription } from "rxjs";
import { ethers } from "ethers";

@Component({
  selector: "app-transaction-history",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./transaction-history.component.html",
  styleUrl: "./transaction-history.component.css",
})
export class TransactionHistoryComponent implements OnInit, OnDestroy {
  @Input() isDarkMode = true;

  transactions: Transaction[] = [];
  displayedTransactions: Transaction[] = [];
  isLoading = false;
  error = "";
  transactionsToShow = 5; // Cantidad inicial de transacciones a mostrar

  // Wallet state from signals
  walletAddress = "";
  networkSymbol = "";
  currentChainId = 0;
  isWalletConnected = false;

  private subscription?: Subscription;

  constructor(
    private etherscanService: EtherscanService,
    private etherService: EtherService,
  ) {
    // Use effects to react to signal changes
    effect(() => {
      this.isWalletConnected = this.etherService.isConnected();
    });

    effect(() => {
      this.walletAddress = this.etherService.currentAccount();
      if (this.walletAddress && this.currentChainId) {
        this.loadTransactions();
      }
    });

    effect(() => {
      const network = this.etherService.network();
      this.networkSymbol = network?.symbol || "ETH";
      this.currentChainId = network?.chainId || 0;

      // Reload transactions when network changes
      if (this.walletAddress && this.currentChainId) {
        this.loadTransactions();
      }
    });
  }

  ngOnInit(): void {
    // Initial load if wallet is already connected
    if (this.walletAddress && this.currentChainId) {
      this.loadTransactions();
    }
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  private loadTransactions(): void {
    if (!this.walletAddress || !this.currentChainId) {
      return;
    }

    this.isLoading = true;
    this.error = "";

    this.subscription = this.etherscanService.getTransactionHistory(this.walletAddress, this.currentChainId).subscribe({
      next: (transactions) => {
        this.transactions = transactions;
        this.displayedTransactions = this.transactions.slice(0, this.transactionsToShow); // Mostrar solo las primeras 5
        this.isLoading = false;
      },
      error: (error) => {
        console.error("Error loading transactions:", error);
        this.error = "Error al cargar las transacciones";
        this.isLoading = false;
      },
    });
  }

  loadMoreTransactions(): void {
    this.transactionsToShow += 5; // Incrementar en 5
    this.displayedTransactions = this.transactions.slice(0, this.transactionsToShow); // Actualizar las transacciones mostradas
  }

  refreshTransactions(): void {
    this.loadTransactions();
  }

  // Agrega estas funciones en tu clase TransactionHistoryComponent

  getTransactionColor(transaction: Transaction): string {
    if (transaction.status === "failed") {
      return "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30";
    }

    return transaction.isOutgoing ? "text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30" : "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30";
  }

  getTransactionIcon(transaction: Transaction): string {
    if (transaction.status === "failed") {
      return "M6 18L18 6M6 6l12 12"; // Icono de error
    }

    return transaction.isOutgoing ? "M12 19l9 2-9-18-9 18 9-2zm0 0v-8" : "M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12z"; // Iconos de enviar y recibir
  }

  getTransactionType(transaction: Transaction): string {
    return transaction.status === "failed" ? "Transacción fallida" : (transaction.isOutgoing ? "Enviado" : "Recibido");
  }

  formatAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  getValueColor(transaction: Transaction): string {
    return transaction.status === "failed" ? "text-red-600 dark:text-red-400" : (transaction.isOutgoing ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400");
  }

  getValuePrefix(transaction: Transaction): string {
    return transaction.status === "failed" ? "" : (transaction.isOutgoing ? "-" : "+");
  }

  formatValue(value: string): string {
    try {
      const ethValue = ethers.utils.formatEther(value);
      const numValue = Number.parseFloat(ethValue);

      if (numValue === 0) return "0";
      if (numValue < 0.0001) return "< 0.0001";

      return numValue.toFixed(4);
    } catch {
      return "0";
    }
  }

  formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `Hace ${diffMinutes} min`;
    } else if (diffHours < 24) {
      return `Hace ${diffHours}h`;
    } else if (diffDays < 7) {
      return `Hace ${diffDays}d`;
    } else {
      return date.toLocaleDateString();
    }
  }

  getExplorerUrl(hash: string): string {
    return this.etherscanService.getExplorerUrl(this.currentChainId, hash);
  }


  trackByHash(index: number, transaction: Transaction): string {
    return transaction.hash; // Retorna el hash de la transacción como identificador único
  }
}
