import { Component, Input, Output, EventEmitter, effect } from "@angular/core"
import { CommonModule } from "@angular/common"
import { EtherService } from "../../../services/ether.service"
import { NETWORKS } from "../../../config/constants"
import { Network } from "../../../interfaces/network.interface"

@Component({
  selector: "app-network-display",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./network-display.component.html",
  styleUrl: "./network-display.component.css",
})
export class NetworkDisplayComponent {
  @Input() isDarkMode = true
  @Input() showInHeader = true // Para mostrar en el header o como componente independiente
  @Output() networkChanged = new EventEmitter<Network>()

  // Network state
  currentNetwork: Network | null = null
  networkName = ""
  networkSymbol = ""
  chainId = 0
  isWalletConnected = false

  // Modal state
  showNetworkModal = false
  availableNetworks = Object.values(NETWORKS)
  isSwitching = false
  switchError = ""

  constructor(private etherService: EtherService) {
    // Use effects to react to signal changes
    effect(() => {
      this.isWalletConnected = this.etherService.isConnected()
    })

    effect(() => {
      const network = this.etherService.network()
      this.currentNetwork = network
      this.networkName = network?.name || ""
      this.networkSymbol = network?.symbol || "ETH"
      this.chainId = network?.chainId || 0

      // Emit network change event
      if (network) {
        this.networkChanged.emit(network)
      }
    })
  }

  openNetworkModal(): void {
    if (!this.isWalletConnected) return
    this.showNetworkModal = true
    this.switchError = ""
  }

  closeNetworkModal(): void {
    this.showNetworkModal = false
    this.switchError = ""
    this.isSwitching = false
  }

  async switchNetwork(network: Network): Promise<void> {
    if (this.isSwitching) return

    this.isSwitching = true
    this.switchError = ""

    try {
      const success = await this.etherService.switchNetwork(network.chainId)

      if (success) {
        // Wait a moment for the network to update
        setTimeout(() => {
          this.closeNetworkModal()
        }, 500)
      } else {
        this.switchError = "Error al cambiar de red"
      }
    } catch (error) {
      console.error("Error switching network:", error)
      this.switchError = "Error al cambiar de red. Verifica tu wallet."
    } finally {
      this.isSwitching = false
    }
  }

  getNetworkIcon(network: Network): string {
    // Return the first letter of the symbol or a default
    return network.symbol?.charAt(0) || "N"
  }

  getNetworkColor(network: Network): string {
    // Return different colors based on network
    switch (network.chainId) {
      case 1: // Ethereum Mainnet
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
      case 11155111: // Sepolia
        return "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
      case 137: // Polygon
        return "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
      case 80001: // Mumbai
        return "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
      case 17000: // Holesky
        return "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
      default:
        return "bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400"
    }
  }

  isCurrentNetwork(network: Network): boolean {
    return this.chainId === network.chainId
  }

  getConnectionStatus(): string {
    if (!this.isWalletConnected) {
      return "No conectado"
    }
    return this.networkName || "Red desconocida"
  }

  getConnectionStatusColor(): string {
    if (!this.isWalletConnected) {
      return "text-red-600 dark:text-red-400"
    }
    if (this.networkName) {
      return "text-green-600 dark:text-green-400"
    }
    return "text-yellow-600 dark:text-yellow-400"
  }

  getNetworkColorHeader(network: Network): string {
    // Return different colors based on network for header display
    switch (network.chainId) {
      case 1: // Ethereum Mainnet
        return "border-blue-500/30 text-blue-300"
      case 11155111: // Sepolia
        return "border-purple-500/30 text-purple-300"
      case 137: // Polygon
        return "border-purple-500/30 text-purple-300"
      case 80001: // Mumbai
        return "border-orange-500/30 text-orange-300"
      case 17000: // Holesky
        return "border-green-500/30 text-green-300"
      default:
        return "border-orange-500/30 text-orange-300"
    }
  }

  refreshNetwork(): void {
    // Force refresh network information
    if (this.isWalletConnected) {
      this.etherService.switchNetwork(this.chainId)
    }
  }
}
