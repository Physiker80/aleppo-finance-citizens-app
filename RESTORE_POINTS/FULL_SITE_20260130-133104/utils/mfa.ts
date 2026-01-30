import { Employee, MfaSetupData, MfaVerificationRequest, MfaAttempt, MfaFactorType } from '../types';

// Simplified TOTP implementation for demonstration purposes
// In production, use a proper library like 'otplib' or similar
class TOTPGenerator {
  private static base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

  // Generate a random base32 secret
  static generateSecret(length: number = 32): string {
    const bytes = new Uint8Array(length);
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(bytes);
    } else {
      // Fallback for Node.js or older browsers
      for (let i = 0; i < length; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
    let result = '';
    for (let i = 0; i < length; i++) {
      result += this.base32Chars[bytes[i] % this.base32Chars.length];
    }
    return result;
  }

  // Simple hash function for demo (use proper HMAC-SHA256 in production)
  private static simpleHash(key: string, message: string): number {
    let hash = 0;
    const combined = key + message;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Generate TOTP code (simplified version)
  static generateTOTP(secret: string, window: number = 0): string {
    const time = Math.floor(Date.now() / 1000 / 30) + window;
    const hash = this.simpleHash(secret, time.toString());
    const code = hash % 1000000;
    return code.toString().padStart(6, '0');
  }

  // Verify TOTP code with tolerance window
  static verifyTOTP(secret: string, inputCode: string, tolerance: number = 1): boolean {
    const cleanCode = inputCode.replace(/\s/g, '');
    if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      return false;
    }

    for (let window = -tolerance; window <= tolerance; window++) {
      const expectedCode = this.generateTOTP(secret, window);
      if (expectedCode === cleanCode) {
        return true;
      }
    }
    return false;
  }
}

// MFA Management class
export class MFAManager {
  private static readonly STORAGE_KEY = 'employee_mfa_data';

  // Generate backup codes
  static generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      // Generate 8-character hex code
      let code = '';
      for (let j = 0; j < 8; j++) {
        code += Math.floor(Math.random() * 16).toString(16).toUpperCase();
      }
      codes.push(code);
    }
    return codes;
  }

  // Simple encryption for storage (in production use proper encryption)
  private static encrypt(data: string, key: string): string {
    // This is a simple XOR cipher - in production use AES-GCM
    let result = '';
    for (let i = 0; i < data.length; i++) {
      result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return btoa(result);
  }

  private static decrypt(encryptedData: string, key: string): string {
    const data = atob(encryptedData);
    let result = '';
    for (let i = 0; i < data.length; i++) {
      result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  }

  // Setup MFA for employee
  static setupMFA(employee: Employee): MfaSetupData {
    const secret = TOTPGenerator.generateSecret();
    const backupCodes = this.generateBackupCodes();
    
    // Generate QR code URL for authenticator apps
    const issuer = encodeURIComponent('مديرية مالية حلب');
    const accountName = encodeURIComponent(`${employee.name} (${employee.username})`);
    const qrCodeUrl = `otpauth://totp/${issuer}:${accountName}?secret=${secret}&issuer=${issuer}&algorithm=SHA256&digits=6&period=30`;

    return {
      secret,
      qrCodeUrl,
      backupCodes
    };
  }

  // Enable MFA for employee
  static enableMFA(employee: Employee, secret: string, backupCodes: string[]): Employee {
    const encryptionKey = employee.username + employee.password.slice(0, 8);
    
    return {
      ...employee,
      mfaEnabled: true,
      mfaSecret: this.encrypt(secret, encryptionKey),
      mfaBackupCodes: backupCodes.map(code => this.encrypt(code, encryptionKey)),
      mfaUsedBackupCodes: [],
      mfaEnabledAt: new Date()
    };
  }

  // Disable MFA for employee
  static disableMFA(employee: Employee): Employee {
    return {
      ...employee,
      mfaEnabled: false,
      mfaSecret: undefined,
      mfaBackupCodes: undefined,
      mfaUsedBackupCodes: undefined,
      lastTotpCode: undefined,
      lastTotpTime: undefined,
      biometricEnabled: false
    };
  }

  // Verify MFA code
  static verifyMFA(employee: Employee, request: MfaVerificationRequest): { success: boolean; factorUsed?: MfaFactorType; error?: string } {
    if (!employee.mfaEnabled) {
  return { success: false, error: 'المصادقة متعددة العوامل غير مفعّلة لهذا المستخدم' };
    }

    const encryptionKey = employee.username + employee.password.slice(0, 8);

    // Verify TOTP code
    if (request.totpCode) {
      if (!employee.mfaSecret) {
        return { success: false, error: 'TOTP غير مُعد' };
      }

      // Prevent code reuse
      const currentTime = Math.floor(Date.now() / 1000 / 30);
      if (employee.lastTotpCode === request.totpCode && employee.lastTotpTime === currentTime) {
        return { success: false, error: 'تم استخدام هذا الرمز مسبقاً' };
      }

      try {
        const secret = this.decrypt(employee.mfaSecret, encryptionKey);
        const isValid = TOTPGenerator.verifyTOTP(secret, request.totpCode);
        
        if (isValid) {
          return { success: true, factorUsed: MfaFactorType.TOTP };
        }
      } catch (error) {
        return { success: false, error: 'خطأ في التحقق من رمز TOTP' };
      }
    }

    // Verify backup code
    if (request.backupCode) {
      if (!employee.mfaBackupCodes || employee.mfaBackupCodes.length === 0) {
        return { success: false, error: 'لا توجد رموز احتياطية' };
      }

      const cleanCode = request.backupCode.replace(/\s/g, '').toUpperCase();
      
      // Check if code was already used
      if (employee.mfaUsedBackupCodes?.some(usedCode => {
        try {
          return this.decrypt(usedCode, encryptionKey) === cleanCode;
        } catch {
          return false;
        }
      })) {
        return { success: false, error: 'تم استخدام هذا الرمز الاحتياطي مسبقاً' };
      }

      // Check if code is valid
      const isValidBackupCode = employee.mfaBackupCodes.some(encryptedCode => {
        try {
          return this.decrypt(encryptedCode, encryptionKey) === cleanCode;
        } catch {
          return false;
        }
      });

      if (isValidBackupCode) {
        return { success: true, factorUsed: MfaFactorType.RECOVERY_CODE };
      }
    }

    return { success: false, error: 'رمز التحقق غير صحيح' };
  }

  // Mark backup code as used
  static markBackupCodeUsed(employee: Employee, backupCode: string): Employee {
    const encryptionKey = employee.username + employee.password.slice(0, 8);
    const encryptedCode = this.encrypt(backupCode.replace(/\s/g, '').toUpperCase(), encryptionKey);
    
    return {
      ...employee,
      mfaUsedBackupCodes: [...(employee.mfaUsedBackupCodes || []), encryptedCode]
    };
  }

  // Update last TOTP usage to prevent reuse
  static updateLastTotpUsage(employee: Employee, totpCode: string): Employee {
    return {
      ...employee,
      lastTotpCode: totpCode,
      lastTotpTime: Math.floor(Date.now() / 1000 / 30)
    };
  }

  // Check if employee needs password change (90 days for sensitive accounts)
  static needsPasswordChange(employee: Employee): boolean {
    if (!employee.passwordLastChanged) return true;
    
    const daysSinceChange = Math.floor((Date.now() - employee.passwordLastChanged.getTime()) / (1000 * 60 * 60 * 24));
    
    // Admin/sensitive roles require change every 90 days
    const isAdminRole = employee.role === 'مدير' || employee.role === 'مشرف';
    const maxDays = isAdminRole ? 90 : 365; // Regular employees: 1 year
    
    return daysSinceChange >= maxDays;
  }

  // Check password history (prevent reuse of last 12 passwords)
  static canUseNewPassword(employee: Employee, newPasswordHash: string): boolean {
    if (!employee.passwordHistory) return true;
    
    const maxHistory = 12;
    const recentPasswords = employee.passwordHistory.slice(-maxHistory);
    
    return !recentPasswords.includes(newPasswordHash);
  }

  // Get remaining backup codes count
  static getRemainingBackupCodesCount(employee: Employee): number {
    if (!employee.mfaBackupCodes) return 0;
    
    const totalCodes = employee.mfaBackupCodes.length;
    const usedCodes = employee.mfaUsedBackupCodes?.length || 0;
    
    return Math.max(0, totalCodes - usedCodes);
  }

  // Generate new backup codes (regenerate)
  static regenerateBackupCodes(employee: Employee): { employee: Employee; newCodes: string[] } {
    const newCodes = this.generateBackupCodes();
    const encryptionKey = employee.username + employee.password.slice(0, 8);
    
    const updatedEmployee = {
      ...employee,
      mfaBackupCodes: newCodes.map(code => this.encrypt(code, encryptionKey)),
      mfaUsedBackupCodes: [] // Reset used codes
    };

    return { employee: updatedEmployee, newCodes };
  }
}

export { TOTPGenerator };