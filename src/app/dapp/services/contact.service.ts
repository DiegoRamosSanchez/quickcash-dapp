import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { environment } from 'src/enviroments/enviroment';

// Interfaces para Contact
export interface Contact {
  id: string;
  name: string;
  address: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactCreateRequest {
  name: string;
  address: string;
  notes?: string;
}

export interface ContactUpdateRequest {
  name?: string;
  address?: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContactService {
  private readonly API_URL = `${environment.urlMeta}/api/contacts`;
  
  // Signals
  contacts = signal<Contact[]>([]);
  isLoading = signal<boolean>(false);
  
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  constructor() {
    // Cargar contactos al inicializar si hay usuario logueado
    if (this.authService.isLoggedIn()) {
      this.loadUserContacts();
    }
  }

  // Cargar todos los contactos del usuario logueado
  loadUserContacts(): Observable<Contact[]> {
    const userId = this.authService.getUserId();
    if (!userId) {
      return throwError(() => new Error('No hay usuario logueado'));
    }

    this.isLoading.set(true);
    
    return this.http.get<Contact[]>(`${this.API_URL}/user/${userId}`)
      .pipe(
        tap(contacts => {
          this.contacts.set(contacts);
          this.isLoading.set(false);
        }),
        catchError(error => {
          this.isLoading.set(false);
          return this.handleError(error);
        })
      );
  }

  // Obtener contactos (desde signal)
  getContacts(): Contact[] {
    return this.contacts();
  }

  // Obtener contacto por ID
  getContactById(contactId: string): Observable<Contact> {
    const userId = this.authService.getUserId();
    if (!userId) {
      return throwError(() => new Error('No hay usuario logueado'));
    }

    return this.http.get<Contact>(`${this.API_URL}/${contactId}/user/${userId}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Buscar contacto por dirección en los contactos locales
  getContactByAddress(address: string): Contact | undefined {
    return this.contacts().find(contact => 
      contact.address.toLowerCase() === address.toLowerCase()
    );
  }

  // Crear nuevo contacto
  createContact(contactData: ContactCreateRequest): Observable<Contact> {
    const userId = this.authService.getUserId();
    if (!userId) {
      return throwError(() => new Error('No hay usuario logueado'));
    }

    return this.http.post<Contact>(`${this.API_URL}/user/${userId}`, contactData)
      .pipe(
        tap(newContact => {
          // Agregar el nuevo contacto a la lista local
          this.contacts.update(contacts => [...contacts, newContact]);
        }),
        catchError(this.handleError)
      );
  }

  // Actualizar contacto
  updateContact(contactId: string, updateData: ContactUpdateRequest): Observable<Contact> {
    const userId = this.authService.getUserId();
    if (!userId) {
      return throwError(() => new Error('No hay usuario logueado'));
    }

    return this.http.put<Contact>(`${this.API_URL}/${contactId}/user/${userId}`, updateData)
      .pipe(
        tap(updatedContact => {
          // Actualizar el contacto en la lista local
          this.contacts.update(contacts => 
            contacts.map(contact => 
              contact.id === contactId ? updatedContact : contact
            )
          );
        }),
        catchError(this.handleError)
      );
  }

  // Eliminar contacto
  deleteContact(contactId: string): Observable<void> {
    const userId = this.authService.getUserId();
    if (!userId) {
      return throwError(() => new Error('No hay usuario logueado'));
    }

    return this.http.delete<void>(`${this.API_URL}/${contactId}/user/${userId}`)
      .pipe(
        tap(() => {
          // Remover el contacto de la lista local
          this.contacts.update(contacts => 
            contacts.filter(contact => contact.id !== contactId)
          );
        }),
        catchError(this.handleError)
      );
  }

  // Verificar si una dirección ya existe
  addressExists(address: string): boolean {
    return this.contacts().some(contact => 
      contact.address.toLowerCase() === address.toLowerCase()
    );
  }

  // Verificar si un nombre ya existe
  nameExists(name: string): boolean {
    return this.contacts().some(contact => 
      contact.name.toLowerCase() === name.toLowerCase()
    );
  }

  // Limpiar contactos (útil para logout)
  clearContacts(): void {
    this.contacts.set([]);
  }

  // Verificar si está cargando
  isLoadingContacts(): boolean {
    return this.isLoading();
  }

  private handleError = (error: HttpErrorResponse) => {
    let errorMessage = 'Ha ocurrido un error desconocido';
    
    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del lado del servidor
      switch (error.status) {
        case 400:
          errorMessage = error.error?.message || 'Datos inválidos para el contacto';
          break;
        case 401:
          errorMessage = 'No autorizado. Inicia sesión nuevamente.';
          this.authService.logout();
          break;
        case 403:
          errorMessage = 'No tienes permisos para realizar esta acción';
          break;
        case 404:
          errorMessage = 'Contacto no encontrado';
          break;
        case 409:
          errorMessage = 'El contacto ya existe o hay un conflicto';
          break;
        case 500:
          errorMessage = 'Error interno del servidor';
          break;
        default:
          errorMessage = error.error?.message || `Error del servidor: ${error.status}`;
      }
    }
    
    console.error('ContactService Error:', error);
    return throwError(() => new Error(errorMessage));
  };
}