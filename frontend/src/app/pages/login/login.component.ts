import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { AlertComponent } from '../../components/alert/alert.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, AlertComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);

  loginForm: FormGroup = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(4)]]
  });

  submitted = false;
  isLoading = false;
  errorMessage = '';
  infoMessage = '';

  ngOnInit(): void {
    // Check if redirected after successful registration
    this.route.queryParams.subscribe(params => {
      if (params['registered'] === 'true') {
        this.infoMessage = 'Account created successfully! Please enter your credentials to log in.';
        if (params['username']) {
          this.loginForm.patchValue({ username: params['username'] });
        }
      }
    });
  }

  get f() {
    return this.loginForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';
    this.infoMessage = '';

    if (this.loginForm.invalid) {
      return;
    }

    this.isLoading = true;
    const { username, password } = this.loginForm.value;

    this.authService.login({
      username: username.trim(),
      password: password
    }).subscribe({
      next: () => {
        this.isLoading = false;
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
        this.router.navigateByUrl(returnUrl);
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
      return 'Login failed. Please check your credentials and try again.';
    }

    const errData = error.error;
    if (typeof errData === 'string') {
      return errData;
    }

    if (errData.detail) {
      return errData.detail;
    }

    if (errData.non_field_errors) {
      return Array.isArray(errData.non_field_errors)
        ? errData.non_field_errors.join(' ')
        : errData.non_field_errors;
    }

    const messages: string[] = [];
    for (const key of Object.keys(errData)) {
      const val = errData[key];
      messages.push(`${key}: ${Array.isArray(val) ? val.join(' ') : val}`);
    }

    return messages.length > 0 ? messages.join(' | ') : 'Invalid credentials. Please verify your username and password.';
  }
}
