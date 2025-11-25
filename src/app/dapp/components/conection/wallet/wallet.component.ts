import { Component, EventEmitter, Input, Output, effect, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { EtherService } from "../../../services/ether.service";
import { DeviceDetectionService, DeviceInfo } from "src/app/dapp/services/devic-detection.service";

@Component({
  selector: "app-wallet",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./wallet.component.html",
  styleUrl: "./wallet.component.css",
})
export class WalletComponent implements OnInit {
  // Modal states
  @Input() modalState: "closed" | "wallet-options" | "ethereum-wallets" | "connecting-metamask" = "closed";
  @Input() isDarkMode = true;
  @Output() modalStateChange = new EventEmitter<"closed" | "wallet-options" | "ethereum-wallets" | "connecting-metamask">();
  
  // Wallet connection states
  selectedWalletType: string | null = null;
  selectedWallet: string | null = null;
  isConnecting = false;
  errorMessage = "";
  
  // Ethereum connection state
  isWalletConnected = false;
  walletAddress = "";
  networkName = "";
  
  // Device information
  deviceInfo: DeviceInfo | null = null;
  
  constructor(
    private router: Router,
    private etherService: EtherService,
    private deviceDetectionService: DeviceDetectionService
  ) {
    // Use effects to react to signal changes
    effect(() => {
      this.isWalletConnected = this.etherService.isConnected();
    });

    effect(() => {
      this.walletAddress = this.etherService.currentAccount();
    });

    effect(() => {
      const network = this.etherService.network();
      this.networkName = network?.name || "";
    });
  }

  ngOnInit(): void {
    this.deviceInfo = this.deviceDetectionService.getDeviceInfo();
    this.checkMetaMaskInstallation();
  }

  private async checkMetaMaskInstallation(): Promise<void> {
    // Verificar automáticamente la instalación de MetaMask
    const isInstalled = await this.deviceDetectionService.handleMetaMaskInstallation(false);
    
    if (!isInstalled) {
      console.log('MetaMask no está instalado, preparado para redirección');
    }
  }

  // CAMBIO: Método ahora es público (sin private)
  handleMetaMaskRedirection(): void {
    this.deviceDetectionService.redirectToMetaMaskInstall({
      showConfirmDialog: true,
      autoRedirect: false
    });
  }

  // Método público para forzar la verificación de instalación
  recheckMetaMaskInstallation(): void {
    this.deviceDetectionService.recheckMetaMaskInstallation();
  }
  
  selectWalletType(type: string): void {
    if (!this.isMetaMaskAvailable) {
      this.handleMetaMaskRedirection();
      return;
    }
    
    this.selectedWalletType = type;
    if (type === "ethereum") {
      this.updateModalState("ethereum-wallets");
    }
  }

  selectWallet(wallet: string): void {
    if (!this.isMetaMaskAvailable) {
      this.handleMetaMaskRedirection();
      return;
    }
    
    this.selectedWallet = wallet;
    if (wallet === "metamask") {
      this.connectMetaMask();
    }
  }

  async connectMetaMask(): Promise<void> {
    if (!this.isMetaMaskAvailable) {
      this.handleMetaMaskRedirection();
      return;
    }

    this.isConnecting = true;
    this.updateModalState("connecting-metamask");
    this.errorMessage = "";

    try {
      const connected = await this.etherService.connectWallet();

      if (connected) {
        setTimeout(() => {
          this.router.navigate(["/dashboard"]);
        }, 1000);
      } else {
        this.errorMessage = "No se pudo conectar con MetaMask";
        this.isConnecting = false;
      }
    } catch (error) {
      console.error("Error al conectar con MetaMask:", error);
      this.errorMessage = "Error al conectar con MetaMask. Asegúrate de tener MetaMask instalado.";
      this.isConnecting = false;
    }
  }

  continueWithoutWallet(): void {
    this.router.navigate(["/dashboard"]);
  }

  closeWalletOptions(): void {
    this.updateModalState("closed");
    this.selectedWalletType = null;
    this.selectedWallet = null;
    this.isConnecting = false;
    this.errorMessage = "";
  }

  backToWalletTypes(): void {
    this.updateModalState("wallet-options");
    this.selectedWalletType = null;
  }
  
  private updateModalState(state: "closed" | "wallet-options" | "ethereum-wallets" | "connecting-metamask"): void {
    this.modalState = state;
    this.modalStateChange.emit(state);
  }

  get showWalletOptions(): boolean {
    return (
      this.modalState === "wallet-options" ||
      this.modalState === "ethereum-wallets" ||
      this.modalState === "connecting-metamask"
    );
  }

  get showEthereumWallets(): boolean {
    return this.modalState === "ethereum-wallets";
  }

  get isMetaMaskAvailable(): boolean {
    return this.deviceDetectionService.isMetaMaskInstalled();
  }

  // Getters adicionales para el template
  get deviceInfo_display(): string {
    if (!this.deviceInfo) return "Detectando dispositivo...";
    
    if (this.deviceInfo.isMobile) {
      if (this.deviceInfo.isAndroid) return "Dispositivo Android detectado";
      if (this.deviceInfo.isIOS) return "Dispositivo iOS detectado";
      return "Dispositivo móvil detectado";
    }
    
    const browserName = this.getBrowserDisplayName();
    return `Navegador ${browserName} (escritorio) detectado`;
  }

  private getBrowserDisplayName(): string {
    if (!this.deviceInfo) return "desconocido";
    
    if (this.deviceInfo.isChrome) return "Chrome";
    if (this.deviceInfo.isFirefox) return "Firefox";
    if (this.deviceInfo.isEdge) return "Edge";
    if (this.deviceInfo.isSafari) return "Safari";
    
    return "desconocido";
  }

  get installMessage(): string {
    return this.deviceDetectionService.getInstallMessage();
  }

  get isMobileDevice(): boolean {
    return this.deviceDetectionService.isMobileDevice();
  }

  get isDesktopDevice(): boolean {
    return this.deviceDetectionService.isDesktopDevice();
  }

  // Método para obtener información detallada (útil para debugging)
  getDetailedDeviceInfo(): any {
    return this.deviceDetectionService.getDetailedDeviceInfo();
  }

  // Método para manejar la instalación automática
  async handleAutoMetaMaskInstallation(): Promise<void> {
    await this.deviceDetectionService.handleMetaMaskInstallation(true);
  }
}