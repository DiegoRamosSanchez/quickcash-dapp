import { Injectable, signal, Inject, PLATFORM_ID } from '@angular/core';
import { ethers } from 'ethers';
import { Network } from '../interfaces/network.interface';
import { NETWORKS } from '../config/constants';
import TransactionABI from '../abi/Transaction.json';
import { isPlatformBrowser } from '@angular/common';
import { Transaction } from '../interfaces/transaction.interface';

// Define tu tipo de contrato
interface TransactionContract extends ethers.Contract {
  sendTransaction(recipient: string, amount: ethers.BigNumber, overrides?: ethers.CallOverrides): Promise<ethers.ContractTransaction>;
  deposit(overrides?: ethers.CallOverrides): Promise<ethers.ContractTransaction>;
  getContractBalance(overrides?: ethers.CallOverrides): Promise<ethers.BigNumber>;
}

@Injectable({
  providedIn: 'root'
})
export class EtherService {
  private provider: ethers.providers.Web3Provider | null = null;
  private signer: ethers.Signer | null = null;
  private contract: TransactionContract | null = null;
  private networkSwitchInProgress = false;

  // Signals
  isConnected = signal<boolean>(false);
  currentAccount = signal<string>('');
  balance = signal<string>('0');
  network = signal<Network | null>(null);
  contractAddress = signal<string>('');
  contractBalance = signal<string>('0');
  transactions = signal<Transaction[]>([]);
  isLoadingTransactions = signal<boolean>(false);

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.checkConnection();
    this.listenToWalletEvents();
  }

  private listenToWalletEvents() {
    if (isPlatformBrowser(this.platformId) && window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          this.setCurrentAccount(accounts[0]);
        } else {
          this.disconnect();
        }
      });

      window.ethereum.on('chainChanged', async (_chainId: string) => {
        // Reinicializar el provider para asegurar que esté actualizado con la nueva red
        if (window.ethereum) {
          this.provider = new ethers.providers.Web3Provider(window.ethereum);
          this.signer = this.provider.getSigner();
        }

        // Actualizar los detalles de la red y el balance
        await this.updateNetworkDetails();
        await this.updateBalance();

        // Si hay un contrato inicializado, actualizar su balance
        if (this.contract) {
          await this.updateContractBalance();
        }

        // Resetear las transacciones al cambiar de red
        this.transactions.set([]);

        // Si hay un cambio de red en progreso, marcar como completado
        if (this.networkSwitchInProgress) {
          this.networkSwitchInProgress = false;
        }
      });

      window.ethereum.on('disconnect', () => {
        this.disconnect();
      });
    }
  }

  private async checkConnection(): Promise<void> {
    if (isPlatformBrowser(this.platformId) && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts && accounts.length > 0) {
          await this.connectWallet();
        }
      } catch (error) {
        console.error('Error checking connection:', error);
      }
    }
  }

  async connectWallet(): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) {
      console.error('No se puede conectar a MetaMask en este entorno');
      return false;
    }

    if (!window.ethereum) {
      console.error('MetaMask no encontrado');
      return false;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      this.provider = new ethers.providers.Web3Provider(window.ethereum);
      this.signer = this.provider.getSigner();

      if (accounts && accounts.length > 0) {
        this.setCurrentAccount(accounts[0]);
        this.isConnected.set(true);
        await this.updateNetworkDetails();
        await this.updateBalance();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error al conectar con MetaMask:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.isConnected.set(false);
    this.currentAccount.set('');
    this.balance.set('0');
    this.network.set(null);
    this.contractAddress.set('');
    this.contractBalance.set('0');
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.transactions.set([]);
  }

  private async setCurrentAccount(account: string): Promise<void> {
    this.currentAccount.set(account);
    await this.updateBalance();

    // Reset transactions when account changes
    this.transactions.set([]);

    // Si hay un contrato inicializado, actualizar su balance
    if (this.contract) {
      await this.updateContractBalance();
    }
  }

  private async updateBalance(): Promise<void> {
    if (this.provider && this.currentAccount()) {
      try {
        // Asegurarse de que el provider esté actualizado
        const balance = await this.provider.getBalance(this.currentAccount());
        this.balance.set(ethers.utils.formatEther(balance));
      } catch (error : any) {
        console.error('Error al obtener el saldo:', error);
        // Si el error está relacionado con un cambio de red, reintentar después de un breve retraso
        if (error.code === 'NETWORK_ERROR' && !this.networkSwitchInProgress) {
          setTimeout(() => this.updateBalance(), 1000);
        }
      }
    }
  }

  private async updateContractBalance(): Promise<void> {
    if (!this.contract) return;

    try {
      const balance = await this.contract.getContractBalance();
      this.contractBalance.set(ethers.utils.formatEther(balance));
    } catch (error) {
      console.error('Error al obtener el saldo del contrato:', error);
      this.contractBalance.set('0');
    }
  }

  private async updateNetworkDetails(): Promise<void> {
    if (!this.provider) return;

    try {
      // Reinicializar el provider para asegurar que esté actualizado con la nueva red
      if (window.ethereum) {
        this.provider = new ethers.providers.Web3Provider(window.ethereum);
        this.signer = this.provider.getSigner();
      }

      const network = await this.provider.getNetwork();
      const chainId = network.chainId;

      const knownNetwork = Object.values(NETWORKS).find(n => n.chainId === chainId);

      if (knownNetwork) {
        this.network.set(knownNetwork);
      } else {
        this.network.set({
          name: `Red desconocida (ChainID: ${chainId})`,
          chainId
        });
      }
    } catch (error: any) {
      console.error('Error al obtener los detalles de la red:', error);
      // Si el error está relacionado con un cambio de red, reintentar después de un breve retraso
      if (error.code === 'NETWORK_ERROR' && !this.networkSwitchInProgress) {
        setTimeout(() => this.updateNetworkDetails(), 1000);
      }
    }
  }

  // Método para cambiar de red
  async switchNetwork(chainId: number): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId) || !window.ethereum) {
      console.error('MetaMask no disponible');
      return false;
    }

    const networkDetails = Object.values(NETWORKS).find(network => network.chainId === chainId);
    if (!networkDetails) {
      console.error('Red no soportada');
      return false;
    }

    // Marcar que un cambio de red está en progreso
    this.networkSwitchInProgress = true;

    try {
      // Intenta cambiar a la red solicitada
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });

      // Esperar un momento para que MetaMask procese el cambio
      await new Promise(resolve => setTimeout(resolve, 500));

      // Forzar la actualización del provider y los detalles
      if (window.ethereum) {
        this.provider = new ethers.providers.Web3Provider(window.ethereum);
        this.signer = this.provider.getSigner();
      }

      await this.updateNetworkDetails();
      await this.updateBalance();

      // Si hay un contrato inicializado, actualizarlo en la nueva red
      if (this.contractAddress()) {
        await this.initContract(this.contractAddress());
      }

      // Resetear las transacciones al cambiar de red
      this.transactions.set([]);

      // El evento chainChanged debería manejar la actualización completa
      return true;
    } catch (switchError: any) {
      this.networkSwitchInProgress = false;
      // Si la red no está en MetaMask, intenta añadirla (solo para redes conocidas)
      if (switchError.code === 4902 && networkDetails) {
        try {
          await this.addNetwork(networkDetails);

          // Después de añadir la red, intentar cambiar a ella nuevamente
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${chainId.toString(16)}` }],
          });

          // Forzar la actualización del provider y los detalles
          await new Promise(resolve => setTimeout(resolve, 500));
          if (window.ethereum) {
            this.provider = new ethers.providers.Web3Provider(window.ethereum);
            this.signer = this.provider.getSigner();
          }

          await this.updateNetworkDetails();
          await this.updateBalance();

          // Si hay un contrato inicializado, actualizarlo en la nueva red
          if (this.contractAddress()) {
            await this.initContract(this.contractAddress());
          }

          // Resetear las transacciones al cambiar de red
          this.transactions.set([]);

          return true;
        } catch (addError) {
          console.error('Error al añadir la red:', addError);
          return false;
        }
      }
      console.error('Error al cambiar de red:', switchError);
      return false;
    }
  }

  // Método para añadir una red si no existe
  private async addNetwork(network: Network): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || !window.ethereum) return;

    // Parámetros para agregar red (adaptados para cada red)
    const networkParams: any = {
      chainId: `0x${network.chainId.toString(16)}`,
      chainName: network.name,
      nativeCurrency: {
        name: network.symbol || 'ETH',
        symbol: network.symbol || 'ETH',
        decimals: 18,
      },
      rpcUrls: this.getRpcUrlsForNetwork(network.chainId),
      blockExplorerUrls: network.blockExplorer ? [network.blockExplorer] : undefined,
    };

    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [networkParams],
    });
  }

  // Helper para obtener RPC URLs según la red
  private getRpcUrlsForNetwork(chainId: number): string[] {
    switch (chainId) {
      case 1: // Ethereum Mainnet
        return ['https://mainnet.infura.io/v3/your-infura-key', 'https://rpc.ankr.com/eth'];
      case 11155111: // Sepolia
        return ['https://sepolia.infura.io/v3/your-infura-key', 'https://rpc.sepolia.org'];
      case 137: // Polygon
        return ['https://polygon-rpc.com', 'https://rpc-mainnet.matic.network'];
      case 80001: // Mumbai
        return ['https://rpc-mumbai.maticvigil.com', 'https://matic-mumbai.chainstacklabs.com'];
      case 17000: // Holesky
        return ['https://ethereum-holesky.publicnode.com', 'https://holesky.rpc.thirdweb.com'];
      default:
        return [];
    }
  }

  async sendTransaction(recipient: string, amount: string): Promise<string | null> {
    if (!this.signer || !amount || !ethers.utils.isAddress(recipient)) {
      console.error('Datos de transacción inválidos');
      return null;
    }

    try {
      const amountStr = String(amount);
      const amountInWei = ethers.utils.parseEther(amountStr);

      const tx = await this.signer.sendTransaction({
        to: recipient,
        value: amountInWei
      });

      await tx.wait();
      await this.updateBalance();
      return tx.hash;
    } catch (error) {
      console.error('Error al enviar la transacción:', error);
      return null;
    }
  }

  async initContract(contractAddress: string): Promise<boolean> {
    if (!this.signer || !ethers.utils.isAddress(contractAddress)) {
      console.error('Dirección del contrato inválida');
      return false;
    }

    try {
      this.contract = new ethers.Contract(contractAddress, TransactionABI, this.signer) as TransactionContract;
      this.contractAddress.set(contractAddress);
      
      // Obtener el balance del contrato
      await this.updateContractBalance();
      
      return true;
    } catch (error) {
      console.error('Error al inicializar el contrato:', error);
      return false;
    }
  }

  async sendContractTransaction(recipient: string, amount: string): Promise<string | null> {
    if (!this.contract || !amount || !ethers.utils.isAddress(recipient)) {
      console.error('Datos de transacción del contrato inválidos');
      return null;
    }

    try {
      const amountStr = String(amount);
      const amountInWei = ethers.utils.parseEther(amountStr);

      // El contrato requiere fondos para enviar, así que verificamos si tiene suficiente balance
      const contractBalance = ethers.utils.formatEther(await this.contract.getContractBalance());
      
      if (Number(contractBalance) < Number(amount)) {
        // Si el contrato no tiene suficiente balance, primero hacemos un depósito
        const depositTx = await this.contract.deposit({
          value: amountInWei
        });
        await depositTx.wait();
      }

      // Ahora enviamos la transacción a través del contrato
      const tx = await this.contract.sendTransaction(
        recipient,
        amountInWei
      );

      await tx.wait();
      await this.updateBalance();
      await this.updateContractBalance();
      return tx.hash;
    } catch (error) {
      console.error('Error al enviar la transacción a través del contrato:', error);
      return null;
    }
  }

  async depositToContract(amount: string): Promise<string | null> {
    if (!this.contract || !amount) {
      console.error('Datos de depósito inválidos');
      return null;
    }

    try {
      const amountStr = String(amount);
      const amountInWei = ethers.utils.parseEther(amountStr);

      const tx = await this.contract.deposit({
        value: amountInWei
      });

      await tx.wait();
      await this.updateBalance();
      await this.updateContractBalance();
      return tx.hash;
    } catch (error) {
      console.error('Error al depositar en el contrato:', error);
      return null;
    }
  }

  // Método público para actualizar el balance manualmente
  async updateBalanceEth(): Promise<void> {
    if (this.provider && this.currentAccount()) {
      try {
        const balance = await this.provider.getBalance(this.currentAccount());
        this.balance.set(ethers.utils.formatEther(balance));
        return Promise.resolve();
      } catch (error) {
        console.error('Error al actualizar el balance:', error);
        return Promise.reject(error);
      }
    }
    return Promise.resolve();
  }

  getNetworkName(): string {
    return this.network()?.name || 'No conectado';
  }

  getNetworkCurrency(): string {
    return this.network()?.symbol || 'ETH';
  }

  getContractBalanceFormatted(): string {
    return this.contractBalance();
  }

  // Método para obtener transacciones de un servicio externo y actualizar el signal
  updateTransactions(transactions: Transaction[]): void {
    this.transactions.set(transactions);
  }

  // Método para establecer el estado de carga de transacciones
  setLoadingTransactions(loading: boolean): void {
    this.isLoadingTransactions.set(loading);
  }
}