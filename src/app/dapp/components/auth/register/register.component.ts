import { Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { AuthService, RegisterRequest } from "../../../services/auth.service";

@Component({
  selector: "app-register",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./register.component.html",
  styleUrl: "./register.component.css",
})
export class RegisterComponent {
  @Input() showModal = false;
  @Output() showModalChange = new EventEmitter<boolean>();
  @Output() switchToLogin = new EventEmitter<void>();

  // Register form data
  registerData: RegisterRequest & { confirmPassword: string } = {
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    metamaskAddress: "" // Opcional
  };

  registerErrorMessage = "";
  registerSuccessMessage = "";
  isLoading = false;

  constructor(private authService: AuthService) {}

  register(): void {
    this.registerErrorMessage = "";
    this.registerSuccessMessage = "";

    // Validación de campos obligatorios
    if (!this.registerData.email?.trim() || 
        !this.registerData.username?.trim() || 
        !this.registerData.password?.trim() || 
        !this.registerData.confirmPassword?.trim()) {
      this.registerErrorMessage = "Todos los campos son obligatorios";
      return;
    }

    // Validación de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.registerData.email)) {
      this.registerErrorMessage = "Por favor ingrese un correo electrónico válido";
      return;
    }

    // Validación de username
    if (this.registerData.username.length < 3) {
      this.registerErrorMessage = "El nombre de usuario debe tener al menos 3 caracteres";
      return;
    }

    // Validación de contraseña
    if (this.registerData.password.length < 6) {
      this.registerErrorMessage = "La contraseña debe tener al menos 6 caracteres";
      return;
    }

    // Validación de confirmación de contraseña
    if (this.registerData.password !== this.registerData.confirmPassword) {
      this.registerErrorMessage = "Las contraseñas no coinciden";
      return;
    }

    // Validación de dirección MetaMask (opcional)
    if (this.registerData.metamaskAddress && 
        !this.isValidMetamaskAddress(this.registerData.metamaskAddress)) {
      this.registerErrorMessage = "La dirección de MetaMask no es válida";
      return;
    }

    // Preparar datos para envío
    const { confirmPassword, ...requestData } = this.registerData;
    
    // Limpiar campos vacíos opcionales
    if (!requestData.metamaskAddress?.trim()) {
      delete requestData.metamaskAddress;
    }

    this.isLoading = true;

    this.authService.register(requestData).subscribe({
      next: (response) => {
        console.log('Usuario registrado exitosamente:', response);
        this.isLoading = false;
        this.registerSuccessMessage = "Cuenta creada exitosamente. Ahora puedes iniciar sesión.";
        
        // Esperar un momento antes de cerrar para mostrar el mensaje
        setTimeout(() => {
          this.clearRegisterForm();
          this.closeModal();
        }, 2000);
      },
      error: (error) => {
        console.error('Error en registro:', error);
        this.isLoading = false;
        this.registerErrorMessage = error.message || "No se pudo registrar la cuenta";
      }
    });
  }

  closeModal(): void {
    this.showModal = false;
    this.showModalChange.emit(false);
    this.clearRegisterForm();
  }

  clearRegisterForm(): void {
    this.registerData = {
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
      metamaskAddress: ""
    };
    this.registerErrorMessage = "";
    this.registerSuccessMessage = "";
    this.isLoading = false;
  }

  onSwitchToLogin(): void {
    this.closeModal();
    this.switchToLogin.emit();
  }

  // Método para manejar Enter key
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !this.isLoading && this.isFormValid) {
      this.register();
    }
  }

  // Validación de dirección MetaMask
  private isValidMetamaskAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  // Validación del formulario
  get isFormValid(): boolean {
    return this.registerData.email.trim().length > 0 &&
           this.registerData.username.trim().length >= 3 &&
           this.registerData.password.trim().length >= 6 &&
           this.registerData.confirmPassword.trim().length > 0 &&
           this.registerData.password === this.registerData.confirmPassword;
  }

  // Validación de email en tiempo real
  get isValidEmail(): boolean {
    if (!this.registerData.email.trim()) return true; // No mostrar error si está vacío
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(this.registerData.email);
  }

  // Validación de username en tiempo real
  get isValidUsername(): boolean {
    if (!this.registerData.username.trim()) return true; // No mostrar error si está vacío
    return this.registerData.username.length >= 3;
  }

  // Validación de contraseña en tiempo real
  get isValidPassword(): boolean {
    if (!this.registerData.password.trim()) return true; // No mostrar error si está vacío
    return this.registerData.password.length >= 6;
  }

  // Validación de confirmación de contraseña en tiempo real
  get isValidPasswordConfirmation(): boolean {
    if (!this.registerData.confirmPassword.trim()) return true; // No mostrar error si está vacío
    return this.registerData.password === this.registerData.confirmPassword;
  }

  // Validación de dirección MetaMask en tiempo real
  get isValidMetamaskAddressInput(): boolean {
    if (!this.registerData.metamaskAddress?.trim()) return true; // Es opcional
    return this.isValidMetamaskAddress(this.registerData.metamaskAddress);
  }
}