import { Component, OnInit, Input, Output, EventEmitter, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EtherService } from '../../../services/ether.service';
import { ContactService, Contact, ContactCreateRequest } from '../../../services/contact.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-send-transaction',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './send-transaction.component.html',
  styleUrl: './send-transaction.component.css'
})
export class SendTransactionComponent implements OnInit {
  @Input() isDarkMode = true;
  @Input() showModal = false;
  @Output() closeModal = new EventEmitter<void>();
  @Output() transactionSent = new EventEmitter<string>();

  // Transaction form
  recipientAddress = '';
  sendAmount = '';
  sendError = '';
  isSending = false;

  // Contract functionality
  useContract = false;
  contractAddress = '';
  isContractInitialized = false;
  contractBalance = '0';

  // Contact management using signals
  contacts = signal<Contact[]>([]);
  selectedContactId = '';
  showAddContact = false;
  newContact = {
    name: '',
    address: '',
    notes: ''
  };

  // Wallet state from service
  balance = '0';
  networkSymbol = 'ETH';
  isWalletConnected = false;

  constructor(
    private etherService: EtherService,
    private contactService: ContactService,
    private authService: AuthService
  ) {
    // React to ether service signals
    effect(() => {
      this.balance = this.etherService.balance();
    });

    effect(() => {
      const network = this.etherService.network();
      this.networkSymbol = network?.symbol || 'ETH';
    });

    effect(() => {
      this.isWalletConnected = this.etherService.isConnected();
    });

    effect(() => {
      this.contractBalance = this.etherService.contractBalance();
    });

    effect(() => {
      const contractAddr = this.etherService.contractAddress();
      if (contractAddr) {
        this.contractAddress = contractAddr;
        this.isContractInitialized = true;
      }
    });

    // React to contact service signals
    effect(() => {
      const serviceContacts = this.contactService.contacts();
      this.contacts.set(serviceContacts);
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.loadContacts();
  }

  loadContacts(): void {
    // Only load contacts if user is logged in
    if (this.authService.isLoggedIn()) {
      this.contactService.loadUserContacts().subscribe({
        next: (contacts) => {
          console.log('Contactos cargados en send-transaction:', contacts.length);
        },
        error: (error) => {
          console.error('Error cargando contactos:', error);
        }
      });
    }
  }

  selectContact(contactId: string): void {
    const contact = this.contacts().find(c => c.id === contactId);
    if (contact) {
      this.recipientAddress = contact.address;
      this.selectedContactId = contactId;
    }
  }

  toggleAddContact(): void {
    this.showAddContact = !this.showAddContact;
    this.sendError = '';
    
    if (!this.showAddContact) {
      this.resetNewContact();
    } else if (this.recipientAddress && this.isValidAddress(this.recipientAddress)) {
      this.newContact.address = this.recipientAddress;
    }
  }

  resetNewContact(): void {
    this.newContact = {
      name: '',
      address: '',
      notes: ''
    };
  }

  addContact(): void {
    if (!this.newContact.name.trim()) {
      this.sendError = 'El nombre es obligatorio';
      return;
    }
    
    // Check for duplicates using the service
    if (this.contactService.nameExists(this.newContact.name)) {
      this.sendError = 'Ya existe un contacto con este nombre';
      return;
    }
    
    if (!this.isValidAddress(this.newContact.address)) {
      this.sendError = 'La dirección no es válida';
      return;
    }
    
    if (this.contactService.addressExists(this.newContact.address)) {
      this.sendError = 'Ya existe un contacto con esta dirección';
      return;
    }
    
    // Create contact using the service
    const contactData: ContactCreateRequest = {
      name: this.newContact.name.trim(),
      address: this.newContact.address,
      notes: this.newContact.notes.trim() || undefined
    };

    this.contactService.createContact(contactData).subscribe({
      next: (newContact) => {
        this.recipientAddress = newContact.address;
        this.selectedContactId = newContact.id;
        this.resetNewContact();
        this.showAddContact = false;
        this.sendError = '';
      },
      error: (error) => {
        this.sendError = error.message;
      }
    });
  }

  toggleContractUse(): void {
    this.useContract = !this.useContract;
    this.sendError = '';
  }

  async initializeContract(): Promise<void> {
    if (!this.isValidAddress(this.contractAddress)) {
      this.sendError = 'La dirección del contrato no es válida';
      return;
    }
    
    this.isSending = true;
    this.sendError = '';
    
    try {
      const success = await this.etherService.initContract(this.contractAddress);
      if (success) {
        this.isContractInitialized = true;
      } else {
        this.sendError = 'Error al inicializar el contrato';
      }
    } catch (error) {
      console.error('Error al inicializar contrato:', error);
      this.sendError = 'Error al inicializar el contrato';
    } finally {
      this.isSending = false;
    }
  }

  async depositToContract(): Promise<void> {
    if (!this.sendAmount || Number.parseFloat(this.sendAmount) <= 0) {
      this.sendError = 'Por favor ingresa un monto válido';
      return;
    }

    if (Number.parseFloat(this.sendAmount) > Number.parseFloat(this.balance)) {
      this.sendError = 'Saldo insuficiente';
      return;
    }

    this.isSending = true;
    this.sendError = '';

    try {
      const txHash = await this.etherService.depositToContract(this.sendAmount);
      if (txHash) {
        this.sendAmount = '';
        this.transactionSent.emit(txHash);
      } else {
        this.sendError = 'Error al realizar el depósito';
      }
    } catch (error) {
      console.error('Error en el depósito:', error);
      this.sendError = 'Error al realizar el depósito';
    } finally {
      this.isSending = false;
    }
  }

  async sendTransaction(): Promise<void> {
    if (!this.recipientAddress || !this.sendAmount) {
      this.sendError = 'Por favor, completa todos los campos';
      return;
    }

    if (!this.isValidAddress(this.recipientAddress)) {
      this.sendError = 'La dirección del destinatario no es válida';
      return;
    }

    if (Number.parseFloat(this.sendAmount) <= 0) {
      this.sendError = 'El monto debe ser mayor a 0';
      return;
    }

    if (Number.parseFloat(this.sendAmount) > Number.parseFloat(this.balance)) {
      this.sendError = 'Saldo insuficiente';
      return;
    }

    if (this.useContract && !this.isContractInitialized) {
      this.sendError = 'Primero debes inicializar el contrato';
      return;
    }

    this.isSending = true;
    this.sendError = '';

    try {
      let txHash: string | null;

      if (this.useContract) {
        txHash = await this.etherService.sendContractTransaction(this.recipientAddress, this.sendAmount);
      } else {
        txHash = await this.etherService.sendTransaction(this.recipientAddress, this.sendAmount);
      }

      if (txHash) {
        console.log('Transaction sent:', txHash);
        this.transactionSent.emit(txHash);
        this.closeTransactionModal();
        
        // Suggest adding contact if address is not saved and user is logged in
        const contactExists = this.contacts().some(c => c.address.toLowerCase() === this.recipientAddress.toLowerCase());
        
        if (!contactExists && this.authService.isLoggedIn()) {
          setTimeout(() => {
            if (confirm('¿Deseas guardar esta dirección como un nuevo contacto?')) {
              this.newContact.address = this.recipientAddress;
              this.showAddContact = true;
            }
          }, 1000);
        }
      } else {
        this.sendError = 'Error al enviar la transacción';
      }
    } catch (error) {
      console.error('Error sending transaction:', error);
      this.sendError = 'Error al enviar la transacción';
    } finally {
      this.isSending = false;
    }
  }

  closeTransactionModal(): void {
    this.recipientAddress = '';
    this.sendAmount = '';
    this.sendError = '';
    this.isSending = false;
    this.selectedContactId = '';
    this.showAddContact = false;
    this.resetNewContact();
    this.closeModal.emit();
  }

  isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  shortenAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  get formattedBalance(): string {
    const bal = Number.parseFloat(this.balance);
    return bal.toFixed(4);
  }

  get formattedContractBalance(): string {
    const bal = Number.parseFloat(this.contractBalance);
    return bal.toFixed(4);
  }

  // Getters for template
  get contactsList(): Contact[] {
    return this.contacts();
  }

  get hasContacts(): boolean {
    return this.contacts().length > 0;
  }

  get isUserLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }
}