import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  isEdge: boolean;
  isSafari: boolean;
  userAgent: string;
}

export interface MetaMaskInstallUrls {
  androidPlayStore: string;
  iosAppStore: string;
  chromeExtension: string;
  firefoxAddon: string;
  edgeExtension: string;
  generalDownload: string;
}

export interface MetaMaskRedirectOptions {
  showConfirmDialog?: boolean;
  customMessage?: string;
  autoRedirect?: boolean;
  redirectDelay?: number;
}

@Injectable({
  providedIn: 'root'
})
export class DeviceDetectionService {
  
  private readonly METAMASK_URLS: MetaMaskInstallUrls = {
    androidPlayStore: 'https://play.google.com/store/apps/details?id=io.metamask',
    iosAppStore: 'https://apps.apple.com/app/metamask/id1438144202',
    chromeExtension: 'https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn',
    firefoxAddon: 'https://addons.mozilla.org/firefox/addon/ether-metamask/',
    edgeExtension: 'https://microsoftedge.microsoft.com/addons/detail/metamask/ejbalbakoplchlghecdalmeeeajnimhm',
    generalDownload: 'https://metamask.io/download/'
  };

  private deviceInfo: DeviceInfo | null = null;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      this.deviceInfo = this.detectDevice();
    }
  }

  /**
   * Detecta el tipo de dispositivo y navegador del usuario
   */
  private detectDevice(): DeviceInfo {
    const userAgent = navigator.userAgent;

    // Detección de dispositivos móviles
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTablet = /iPad|Android(?=.*\bMobile\b)/i.test(userAgent) && !/iPhone/i.test(userAgent);
    const isDesktop = !isMobile;

    // Detección de sistemas operativos móviles
    const isAndroid = /Android/i.test(userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);

    // Detección de navegadores
    const isChrome = /Chrome/i.test(userAgent) && !/Edg/i.test(userAgent);
    const isFirefox = /Firefox/i.test(userAgent);
    const isEdge = /Edg/i.test(userAgent);
    const isSafari = /Safari/i.test(userAgent) && !/Chrome/i.test(userAgent);

    return {
      isMobile,
      isTablet,
      isDesktop,
      isAndroid,
      isIOS,
      isChrome,
      isFirefox,
      isEdge,
      isSafari,
      userAgent
    };
  }

  /**
   * Obtiene la información del dispositivo
   */
  getDeviceInfo(): DeviceInfo | null {
    return this.deviceInfo;
  }

  /**
   * Verifica si MetaMask está instalado
   */
  isMetaMaskInstalled(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }
    return typeof window !== 'undefined' && !!window.ethereum;
  }

  /**
   * Obtiene la URL de instalación apropiada según el dispositivo/navegador
   */
  getMetaMaskInstallUrl(): string {
    if (!this.deviceInfo) {
      return this.METAMASK_URLS.generalDownload;
    }

    // Para dispositivos móviles
    if (this.deviceInfo.isMobile) {
      if (this.deviceInfo.isAndroid) {
        return this.METAMASK_URLS.androidPlayStore;
      } else if (this.deviceInfo.isIOS) {
        return this.METAMASK_URLS.iosAppStore;
      }
      return this.METAMASK_URLS.generalDownload;
    }

    // Para navegadores de escritorio
    if (this.deviceInfo.isChrome) {
      return this.METAMASK_URLS.chromeExtension;
    } else if (this.deviceInfo.isFirefox) {
      return this.METAMASK_URLS.firefoxAddon;
    } else if (this.deviceInfo.isEdge) {
      return this.METAMASK_URLS.edgeExtension;
    }

    return this.METAMASK_URLS.generalDownload;
  }

  /**
   * Obtiene un mensaje personalizado según el dispositivo
   */
  getInstallMessage(): string {
    if (!this.deviceInfo) {
      return 'Para usar esta aplicación necesitas instalar MetaMask.';
    }

    if (this.deviceInfo.isMobile) {
      if (this.deviceInfo.isAndroid) {
        return 'Para usar esta aplicación necesitas instalar MetaMask desde Google Play Store.';
      } else if (this.deviceInfo.isIOS) {
        return 'Para usar esta aplicación necesitas instalar MetaMask desde App Store.';
      }
      return 'Para usar esta aplicación necesitas instalar la aplicación MetaMask en tu dispositivo móvil.';
    }

    // Para escritorio
    const browserName = this.getBrowserName();
    return `Para usar esta aplicación necesitas instalar la extensión MetaMask en ${browserName}.`;
  }

  /**
   * Obtiene el nombre del navegador
   */
  private getBrowserName(): string {
    if (!this.deviceInfo) return 'tu navegador';

    if (this.deviceInfo.isChrome) return 'Chrome';
    if (this.deviceInfo.isFirefox) return 'Firefox';
    if (this.deviceInfo.isEdge) return 'Edge';
    if (this.deviceInfo.isSafari) return 'Safari';
    
    return 'tu navegador';
  }

  /**
   * Redirige al usuario a la instalación de MetaMask
   */
  redirectToMetaMaskInstall(options: MetaMaskRedirectOptions = {}): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.warn('Redirección no disponible en este entorno');
      return;
    }

    const {
      showConfirmDialog = true,
      customMessage,
      autoRedirect = false,
      redirectDelay = 0
    } = options;

    const installUrl = this.getMetaMaskInstallUrl();
    const message = customMessage || this.getInstallMessage();

    if (autoRedirect) {
      // Redirección automática después del delay
      setTimeout(() => {
        this.openInstallUrl(installUrl);
      }, redirectDelay);
      return;
    }

    if (showConfirmDialog) {
      const confirmMessage = `${message}\n\n¿Deseas continuar con la instalación?`;
      
      if (confirm(confirmMessage)) {
        this.openInstallUrl(installUrl);
        
        // Mostrar mensaje adicional para escritorio
        if (this.deviceInfo?.isDesktop) {
          setTimeout(() => {
            alert('Después de instalar MetaMask, recarga esta página para continuar.');
          }, 1000);
        }
      }
    } else {
      this.openInstallUrl(installUrl);
    }
  }

  /**
   * Abre la URL de instalación
   */
  private openInstallUrl(url: string): void {
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error al abrir la URL de instalación:', error);
      // Fallback: intentar redirigir en la misma ventana
      window.location.href = url;
    }
  }

  /**
   * Verifica si MetaMask se instaló y recarga la página
   */
  recheckMetaMaskInstallation(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Esperar un momento antes de verificar
    setTimeout(() => {
      if (this.isMetaMaskInstalled()) {
        alert('¡MetaMask detectado! La página se recargará automáticamente.');
        window.location.reload();
      } else {
        const retryMessage = 'MetaMask aún no se detecta. Asegúrate de haber instalado y habilitado la extensión, luego recarga la página manualmente.';
        alert(retryMessage);
      }
    }, 1000);
  }

  /**
   * Obtiene información detallada del dispositivo para debugging
   */
  getDetailedDeviceInfo(): any {
    if (!this.deviceInfo || !isPlatformBrowser(this.platformId)) {
      return null;
    }

    return {
      ...this.deviceInfo,
      isMetaMaskInstalled: this.isMetaMaskInstalled(),
      recommendedInstallUrl: this.getMetaMaskInstallUrl(),
      installMessage: this.getInstallMessage(),
      browserName: this.getBrowserName(),
      screenWidth: window.screen?.width,
      screenHeight: window.screen?.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight
    };
  }

  /**
   * Maneja la lógica completa de detección y redirección automática
   */
  handleMetaMaskInstallation(autoCheck: boolean = true): Promise<boolean> {
    return new Promise((resolve) => {
      if (!isPlatformBrowser(this.platformId)) {
        resolve(false);
        return;
      }

      const isInstalled = this.isMetaMaskInstalled();
      
      if (isInstalled) {
        resolve(true);
        return;
      }

      if (autoCheck) {
        // Pequeño delay para que se complete la detección del dispositivo
        setTimeout(() => {
          this.redirectToMetaMaskInstall({
            showConfirmDialog: true,
            autoRedirect: false
          });
          resolve(false);
        }, 500);
      } else {
        resolve(false);
      }
    });
  }

  /**
   * Método de conveniencia para verificar si el dispositivo es móvil
   */
  isMobileDevice(): boolean {
    return this.deviceInfo?.isMobile || false;
  }

  /**
   * Método de conveniencia para verificar si el dispositivo es de escritorio
   */
  isDesktopDevice(): boolean {
    return this.deviceInfo?.isDesktop || false;
  }

  /**
   * Obtiene las URLs de MetaMask
   */
  getMetaMaskUrls(): MetaMaskInstallUrls {
    return { ...this.METAMASK_URLS };
  }
}