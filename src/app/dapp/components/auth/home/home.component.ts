import { Component, effect, OnDestroy, OnInit } from "@angular/core"
import { Router } from "@angular/router"
import { EtherService } from "../../../services/ether.service"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { WalletComponent } from "../../conection/wallet/wallet.component"
import { LoginComponent } from "../login/login.component"
import { RegisterComponent } from "../register/register.component"

@Component({
  selector: "app-home",
  standalone: true,
  imports: [CommonModule, FormsModule, WalletComponent, LoginComponent, RegisterComponent],
  templateUrl: "./home.component.html",
  styleUrl: "./home.component.css",
})
export class HomeComponent implements OnInit, OnDestroy {
  // Theme management
  isDarkMode = true

  // Modal states
  showLoginModal = false
  showRegisterModal = false
  modalState: "closed" | "wallet-options" | "ethereum-wallets" | "connecting-metamask" = "closed"

  // Ethereum connection state
  walletAddress = ""
  networkName = ""

  constructor(
    private router: Router,
    private etherService: EtherService,
  ) { }

  ngOnInit(): void {
    // No need for subscriptions with signals
  }

  ngOnDestroy(): void {
    // No subscriptions to unsubscribe from
  }

  // Navigation method for sections
  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      const headerOffset = 80; // Height of the fixed header
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }

  // Modal management methods
  openLoginModal(): void {
    this.showLoginModal = true
    this.showRegisterModal = false
  }

  openRegisterModal(): void {
    this.showRegisterModal = true
    this.showLoginModal = false
  }

  onLoginSuccess(): void {
    this.modalState = "wallet-options"
  }

  onSwitchToRegister(): void {
    this.showLoginModal = false
    this.showRegisterModal = true
  }

  onSwitchToLogin(): void {
    this.showRegisterModal = false
    this.showLoginModal = true
  }

  // Handle modal state changes from wallet component
  onModalStateChange(state: "closed" | "wallet-options" | "ethereum-wallets" | "connecting-metamask"): void {
    this.modalState = state
  }

  get showWalletOptions(): boolean {
    return (
      this.modalState === "wallet-options" ||
      this.modalState === "ethereum-wallets" ||
      this.modalState === "connecting-metamask"
    )
  }

  get isMetaMaskAvailable(): boolean {
    return typeof window !== "undefined" && !!window.ethereum
  }
}