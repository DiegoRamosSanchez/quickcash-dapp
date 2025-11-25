import { Injectable, Inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from 'src/enviroments/enviroment';

export interface User {
  id: string;
  username: string;
  email: string;
  metamaskAddress?: string;
  ethBalance?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  metamaskAddress?: string;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  password?: string;
  metamaskAddress?: string;
  ethBalance?: number;
  isActive?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = `${environment.urlMeta}/api/auth`;
  
  // Signals para el estado reactivo
  currentUser = signal<User | null>(null);
  isAuthenticated = signal<boolean>(false);
  
  // BehaviorSubject para compatibilidad con observables
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    if (isPlatformBrowser(this.platformId)) {
      const savedUser = localStorage.getItem('quickcash_user');
      
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser);
          this.currentUser.set(user);
          this.currentUserSubject.next(user);
          this.isAuthenticated.set(true);
        } catch (error) {
          console.error('Error parsing saved user:', error);
          this.clearStorage();
        }
      }
    }
  }

  private saveUserToStorage(user: User): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('quickcash_user', JSON.stringify(user));
    }
  }

  private clearStorage(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('quickcash_user');
    }
  }

  register(registerData: RegisterRequest): Observable<{ message: string; user: User }> {
    return this.http.post<{ message: string; user: User }>(`${this.API_URL}/register`, registerData)
      .pipe(
        catchError(this.handleError)
      );
  }

  // La API solo devuelve el usuario, no token
  login(loginData: LoginRequest): Observable<User> {
    return this.http.post<User>(`${this.API_URL}/login`, loginData)
      .pipe(
        tap(user => {
          // Guardar usuario y establecer autenticación
          this.currentUser.set(user);
          this.currentUserSubject.next(user);
          this.isAuthenticated.set(true);
          this.saveUserToStorage(user);
        }),
        catchError(this.handleError)
      );
  }

  logout(): void {
    this.currentUser.set(null);
    this.currentUserSubject.next(null);
    this.isAuthenticated.set(false);
    this.clearStorage();
  }

  getCurrentUser(): Observable<User> {
    const user = this.currentUser();
    if (!user) {
      return throwError(() => new Error('No user logged in'));
    }
    
    return this.http.get<User>(`${this.API_URL}/user/${user.id}`)
      .pipe(
        tap(updatedUser => {
          this.currentUser.set(updatedUser);
          this.currentUserSubject.next(updatedUser);
          this.saveUserToStorage(updatedUser);
        }),
        catchError(this.handleError)
      );
  }

  updateUser(userId: string, updateData: UpdateUserRequest): Observable<User> {
    return this.http.put<User>(`${this.API_URL}/user/${userId}`, updateData)
      .pipe(
        tap(updatedUser => {
          this.currentUser.set(updatedUser);
          this.currentUserSubject.next(updatedUser);
          this.saveUserToStorage(updatedUser);
        }),
        catchError(this.handleError)
      );
  }

  updateUserBalance(userId: string, balance: number): Observable<User> {
    return this.updateUser(userId, { ethBalance: balance });
  }

  updateMetamaskAddress(userId: string, address: string): Observable<User> {
    return this.updateUser(userId, { metamaskAddress: address });
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }

  getUserId(): string | null {
    const user = this.currentUser();
    return user ? user.id : null;
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
          errorMessage = error.error?.message || 'Datos inválidos';
          break;
        case 401:
          errorMessage = 'Credenciales inválidas';
          this.logout(); // Limpiar sesión si las credenciales son inválidas
          break;
        case 403:
          errorMessage = 'No tienes permisos para realizar esta acción';
          break;
        case 404:
          errorMessage = 'Usuario no encontrado';
          break;
        case 409:
          errorMessage = error.error?.message || 'El usuario ya existe';
          break;
        case 500:
          errorMessage = 'Error interno del servidor';
          break;
        default:
          errorMessage = error.error?.message || `Error del servidor: ${error.status}`;
      }
    }
    
    console.error('AuthService Error:', error);
    return throwError(() => new Error(errorMessage));
  };
}