import { Component, OnInit, OnDestroy, effect } from "@angular/core"
import { CommonModule } from "@angular/common"
import { Router } from "@angular/router"
import { FormsModule } from "@angular/forms"
import { EtherService } from "../../../services/ether.service"
import { AuthService } from "../../../services/auth.service"
import { ContactService } from "../../../services/contact.service"
import { TransactionHistoryComponent } from "../transaction-history/transaction-history.component"
import { NetworkDisplayComponent } from "../../conection/network-display/network-display.component"
import { SendTransactionComponent } from "../send-transaction/send-transaction.component"
import { ContactsComponent } from "../contacts/contacts.component"
import { Network } from "../../../interfaces/network.interface"

@Component({
  selector: "app-dashboard",
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    TransactionHistoryComponent, 
    NetworkDisplayComponent, 
    SendTransactionComponent,
    ContactsComponent
  ],
  templateUrl: "./dashboard.component.html",
  styleUrl: "./dashboard.component.css",
})
export class DashboardComponent implements OnInit, OnDestroy {
  isDarkMode = true
  userName = "Usuario"

  // Wallet state
  isWalletConnected = false
  walletAddress = ""
  balance = "0"
  networkName = ""
  networkSymbol = ""
  isRefreshingBalance = false

  // Send transaction modal
  showSendModal = false

  // Active view
  activeView: 'history' | 'contacts' | 'settings' = 'history'

  // User authentication state
  isUserLoggedIn = false
  currentUser: any = null

  constructor(
    private router: Router,
    private etherService: EtherService,
    private authService: AuthService,
    private contactService: ContactService
  ) {
    // Use effects to react to signal changes for wallet
    effect(() => {
      this.isWalletConnected = this.etherService.isConnected()
      if (!this.isWalletConnected) {
        this.walletAddress = ""
        this.balance = "0"
        this.networkName = ""
      }
    })

    effect(() => {
      const account = this.etherService.currentAccount()
      this.walletAddress = account
      if (account) {
        this.userName = `${account.slice(0, 6)}...${account.slice(-4)}`
      }
    })

    effect(() => {
      this.balance = this.etherService.balance()
    })

    effect(() => {
      const network = this.etherService.network()
      this.networkName = network?.name || ""
      this.networkSymbol = network?.symbol || "ETH"
    })

    // Use effects to react to authentication changes
    effect(() => {
      this.isUserLoggedIn = this.authService.isAuthenticated()
      this.currentUser = this.authService.currentUser()
      
      if (this.currentUser) {
        this.userName = this.currentUser.username
      }
    })
  }

  ngOnInit(): void {
    // Check if user is logged in
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(["/introduction"])
      return
    }

    // Load user contacts when component initializes
    this.loadUserContacts()
  }

  ngOnDestroy(): void {
    // No subscriptions to unsubscribe from with signals
  }

  private loadUserContacts(): void {
    if (this.authService.isLoggedIn()) {
      this.contactService.loadUserContacts().subscribe({
        next: (contacts) => {
          console.log('Contactos cargados:', contacts.length)
        },
        error: (error) => {
          console.error('Error cargando contactos:', error)
        }
      })
    }
  }

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode
  }

  async connectWallet(): Promise<void> {
    try {
      await this.etherService.connectWallet()
      
      // Update user's MetaMask address if wallet is connected
      if (this.isWalletConnected && this.walletAddress && this.currentUser) {
        this.updateUserMetamaskAddress(this.walletAddress)
      }
    } catch (error) {
      console.error("Error connecting wallet:", error)
    }
  }

  async disconnectWallet(): Promise<void> {
    await this.etherService.disconnect()
  }

  private updateUserMetamaskAddress(address: string): void {
    if (!this.currentUser) return
    
    this.authService.updateMetamaskAddress(this.currentUser.id, address).subscribe({
      next: (updatedUser) => {
        console.log('Dirección de MetaMask actualizada:', updatedUser.metamaskAddress)
      },
      error: (error) => {
        console.error('Error actualizando dirección de MetaMask:', error)
      }
    })
  }

  openSendModal(): void {
    this.showSendModal = true
  }

  closeSendModal(): void {
    this.showSendModal = false
  }

  onTransactionSent(txHash: string): void {
    console.log("Transaction sent from component:", txHash)
    // You can add additional logic here, like showing a success notification
  }

  logout(): void {
    // Disconnect wallet
    this.etherService.disconnect()
    
    // Clear contacts
    this.contactService.clearContacts()
    
    // Logout user
    this.authService.logout()
    
    // Navigate to introduction
    this.router.navigate(["/introduction"])
  }

  onNetworkChanged(network: Network): void {
    console.log("Network changed to:", network)
  }

  async refreshBalance(): Promise<void> {
    if (this.isRefreshingBalance || !this.isWalletConnected) return
    
    this.isRefreshingBalance = true
    try {
      await this.etherService.updateBalanceEth()
      
      // Also update user balance in backend if needed
      if (this.currentUser && this.balance) {
        const balanceNumber = parseFloat(this.balance)
        this.authService.updateUserBalance(this.currentUser.id, balanceNumber).subscribe({
          next: (updatedUser) => {
            console.log('Saldo actualizado en backend:', updatedUser.ethBalance)
          },
          error: (error) => {
            console.error('Error actualizando saldo en backend:', error)
          }
        })
      }
    } catch (error) {
      console.error("Error refreshing balance:", error)
    } finally {
      setTimeout(() => {
        this.isRefreshingBalance = false
      }, 500)
    }
  }

  setActiveView(view: 'history' | 'contacts' | 'settings'): void {
    this.activeView = view
  }

  get formattedBalance(): string {
    const bal = Number.parseFloat(this.balance)
    return bal.toFixed(4)
  }

  get formattedAddress(): string {
    if (!this.walletAddress) return ""
    return `${this.walletAddress.slice(0, 6)}...${this.walletAddress.slice(-4)}`
  }

  get displayUserName(): string {
    if (this.currentUser?.username) {
      return this.currentUser.username
    }
    if (this.walletAddress) {
      return `${this.walletAddress.slice(0, 6)}...${this.walletAddress.slice(-4)}`
    }
    return "Usuario"
  }

  isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }

  trackByHash(index: number, transaction: any): string {
    return transaction.hash
  }
}