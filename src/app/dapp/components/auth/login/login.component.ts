import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, LoginRequest } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  @Input() showModal = false;
  @Output() showModalChange = new EventEmitter<boolean>();
  @Output() loginSuccess = new EventEmitter<void>();
  @Output() switchToRegister = new EventEmitter<void>();

  username = '';
  password = '';
  errorMessage = '';
  isLoading = false;

  constructor(private authService: AuthService) {}

  login(): void {
    if (!this.username?.trim()) {
      this.errorMessage = 'Por favor, introduce un nombre de usuario';
      return;
    }

    if (!this.password?.trim()) {
      this.errorMessage = 'Por favor, introduce una contraseña';
      return;
    }

    const loginData: LoginRequest = {
      username: this.username.trim(),
      password: this.password
    };

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(loginData).subscribe({
      next: (user) => {
        console.log('Usuario logueado exitosamente:', user);
        this.isLoading = false;
        this.closeModal();
        this.loginSuccess.emit();
      },
      error: (error) => {
        console.error('Error en login:', error);
        this.isLoading = false;
        this.errorMessage = error.message || 'Error al iniciar sesión';
      }
    });
  }

  closeModal(): void {
    this.showModal = false;
    this.showModalChange.emit(false);
    this.clearForm();
  }

  clearForm(): void {
    this.username = '';
    this.password = '';
    this.errorMessage = '';
    this.isLoading = false;
  }

  onSwitchToRegister(): void {
    this.closeModal();
    this.switchToRegister.emit();
  }

  // Método para manejar Enter key
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !this.isLoading) {
      this.login();
    }
  }

  // Validación en tiempo real
  get isFormValid(): boolean {
    return this.username.trim().length > 0 && this.password.trim().length > 0;
  }
}