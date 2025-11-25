import { Component, Input, OnInit, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContactService, Contact, ContactCreateRequest, ContactUpdateRequest } from '../../../services/contact.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contacts.component.html',
  styleUrl: './contacts.component.css'
})
export class ContactsComponent implements OnInit {
  @Input() isDarkMode = true;
  
  // Reactive state using signals from service
  contacts = signal<Contact[]>([]);
  filteredContacts = signal<Contact[]>([]);
  searchTerm = signal('');
  isLoading = signal(false);
  
  showAddContact = false;
  isEditing = false;
  currentContact: Contact | null = null;
  
  newContact = {
    name: '',
    address: '',
    notes: ''
  };
  
  error = '';
  success = '';

  constructor(
    private contactService: ContactService,
    private authService: AuthService
  ) {
    // React to contacts changes from service - permitir escrituras en signals
    effect(() => {
      const serviceContacts = this.contactService.contacts();
      this.contacts.set(serviceContacts);
      this.filterContacts();
    }, { allowSignalWrites: true });

    // React to loading state - permitir escrituras en signals
    effect(() => {
      this.isLoading.set(this.contactService.isLoadingContacts());
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    // Check if user is logged in
    if (!this.authService.isLoggedIn()) {
      this.error = 'Debes iniciar sesión para ver los contactos';
      return;
    }

    this.loadContacts();
  }

  loadContacts(): void {
    this.contactService.loadUserContacts().subscribe({
      next: (contacts) => {
        console.log('Contactos cargados:', contacts.length);
        this.success = contacts.length > 0 ? `${contacts.length} contactos cargados` : '';
        setTimeout(() => this.success = '', 2000);
      },
      error: (error) => {
        this.error = error.message;
        setTimeout(() => this.error = '', 5000);
      }
    });
  }

  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
    this.filterContacts();
  }

  private filterContacts(): void {
    const term = this.searchTerm().toLowerCase().trim();
    const allContacts = this.contacts();
    
    if (!term) {
      this.filteredContacts.set([...allContacts]);
      return;
    }
    
    const filtered = allContacts.filter(contact => 
      contact.name.toLowerCase().includes(term) || 
      contact.address.toLowerCase().includes(term) ||
      (contact.notes && contact.notes.toLowerCase().includes(term))
    );
    
    this.filteredContacts.set(filtered);
  }

  toggleAddContact(): void {
    this.showAddContact = !this.showAddContact;
    this.isEditing = false;
    this.error = '';
    this.success = '';
    this.resetNewContact();
  }

  editContact(contact: Contact): void {
    this.showAddContact = true;
    this.isEditing = true;
    this.currentContact = contact;
    this.newContact = {
      name: contact.name,
      address: contact.address,
      notes: contact.notes || ''
    };
    this.error = '';
    this.success = '';
  }

  resetNewContact(): void {
    this.newContact = {
      name: '',
      address: '',
      notes: ''
    };
    this.currentContact = null;
  }

  addOrUpdateContact(): void {
    if (!this.newContact.name.trim()) {
      this.error = 'El nombre es obligatorio';
      return;
    }
    
    if (!this.isValidAddress(this.newContact.address)) {
      this.error = 'La dirección no es válida';
      return;
    }
    
    if (this.isEditing && this.currentContact) {
      this.updateContact();
    } else {
      this.createContact();
    }
  }

  private createContact(): void {
    // Verificar duplicados localmente primero
    if (this.contactService.nameExists(this.newContact.name)) {
      this.error = 'Ya existe un contacto con este nombre';
      return;
    }
    
    if (this.contactService.addressExists(this.newContact.address)) {
      this.error = 'Ya existe un contacto con esta dirección';
      return;
    }

    const contactData: ContactCreateRequest = {
      name: this.newContact.name.trim(),
      address: this.newContact.address,
      notes: this.newContact.notes.trim() || undefined
    };

    this.contactService.createContact(contactData).subscribe({
      next: (newContact) => {
        this.success = `Contacto ${newContact.name} añadido correctamente`;
        this.resetNewContact();
        this.showAddContact = false;
        this.filterContacts();
        setTimeout(() => this.success = '', 3000);
      },
      error: (error) => {
        this.error = error.message;
        setTimeout(() => this.error = '', 5000);
      }
    });
  }

  private updateContact(): void {
    if (!this.currentContact) return;

    // Verificar duplicados localmente (excluyendo el contacto actual)
    const contacts = this.contacts();
    const nameExists = contacts.some(c => 
      c.id !== this.currentContact!.id && 
      c.name.toLowerCase() === this.newContact.name.toLowerCase()
    );
    
    if (nameExists) {
      this.error = 'Ya existe un contacto con este nombre';
      return;
    }
    
    const addressExists = contacts.some(c => 
      c.id !== this.currentContact!.id && 
      c.address.toLowerCase() === this.newContact.address.toLowerCase()
    );
    
    if (addressExists) {
      this.error = 'Ya existe un contacto con esta dirección';
      return;
    }

    const updateData: ContactUpdateRequest = {
      name: this.newContact.name.trim(),
      address: this.newContact.address,
      notes: this.newContact.notes.trim() || undefined
    };

    this.contactService.updateContact(this.currentContact.id, updateData).subscribe({
      next: (updatedContact) => {
        this.success = `Contacto ${updatedContact.name} actualizado correctamente`;
        this.resetNewContact();
        this.showAddContact = false;
        this.filterContacts();
        setTimeout(() => this.success = '', 3000);
      },
      error: (error) => {
        this.error = error.message;
        setTimeout(() => this.error = '', 5000);
      }
    });
  }

  deleteContact(contact: Contact): void {
    if (confirm(`¿Estás seguro de que deseas eliminar el contacto ${contact.name}?`)) {
      this.contactService.deleteContact(contact.id).subscribe({
        next: () => {
          this.success = `Contacto ${contact.name} eliminado correctamente`;
          this.filterContacts();
          setTimeout(() => this.success = '', 3000);
        },
        error: (error) => {
          this.error = error.message;
          setTimeout(() => this.error = '', 5000);
        }
      });
    }
  }

  isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  shortenAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.success = 'Dirección copiada al portapapeles';
      setTimeout(() => this.success = '', 2000);
    }).catch(() => {
      this.error = 'No se pudo copiar la dirección';
      setTimeout(() => this.error = '', 2000);
    });
  }

  // Método para obtener un contacto por dirección (útil para otros componentes)
  getContactByAddress(address: string): Contact | undefined {
    return this.contactService.getContactByAddress(address);
  }

  // Método para refrescar contactos manualmente
  refreshContacts(): void {
    this.loadContacts();
  }

  // Getters para template
  get contactsList(): Contact[] {
    return this.filteredContacts();
  }

  get isLoadingContacts(): boolean {
    return this.isLoading();
  }

  get hasContacts(): boolean {
    return this.contacts().length > 0;
  }

  get hasFilteredContacts(): boolean {
    return this.filteredContacts().length > 0;
  }
}