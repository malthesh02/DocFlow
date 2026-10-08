import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { AlertComponent } from '../../components/alert/alert.component';

export function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');
  if (password && confirmPassword && password.value !== confirmPassword.value) {
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, AlertComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);

  registerForm: FormGroup = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: passwordMatchValidator });

  submitted = false;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  get f() {
    return this.registerForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (this.registerForm.invalid) {
      return;
    }

    this.isLoading = true;
    const formVal = this.registerForm.value;

    const payload = {
      username: formVal.username.trim(),
      email: formVal.email.trim(),
      password: formVal.password,
      password_confirm: formVal.confirmPassword,
      confirm_password: formVal.confirmPassword
    };

    this.authService.register(payload).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = 'Account created successfully! Redirecting to login...';

        setTimeout(() => {
          this.router.navigate(['/login'], {
            queryParams: { registered: 'true', username: payload.username }
          });
        }, 1200);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = this.extractErrorMessage(err);
      }
    });
  }

  private extractErrorMessage(error: any): string {
    if (!error || !error.error) {
      if (error.status === 0) {
        return 'Backend server is unreachable. Please verify the Django server is running.';
      }
      return 'Registration failed. Please check your network and try again.';
    }

    const errData = error.error;
    if (typeof errData === 'string') {
      return errData;
    }

    if (errData.detail) {
      return errData.detail;
    }

    const messages: string[] = [];
    for (const key of Object.keys(errData)) {
      const fieldErrors = errData[key];
      if (Array.isArray(fieldErrors)) {
        messages.push(`${key}: ${fieldErrors.join(' ')}`);
      } else if (typeof fieldErrors === 'string') {
        messages.push(`${key}: ${fieldErrors}`);
      }
    }

    return messages.length > 0 ? messages.join(' | ') : 'Registration failed. Please verify your inputs.';
  }
}
