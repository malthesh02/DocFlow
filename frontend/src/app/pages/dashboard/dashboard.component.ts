import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { DocumentService } from '../../services/document.service';
import { DocumentItem, DocumentFormData, DocumentStatus } from '../../models/document.model';
import { DocumentModalComponent } from '../../components/document-modal/document-modal.component';
import { AlertComponent } from '../../components/alert/alert.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DocumentModalComponent, AlertComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  authService = inject(AuthService);
  documentService = inject(DocumentService);

  // Modal controls
  isModalOpen = false;
  selectedDocument: DocumentItem | null = null;
  isSubmitting = false;

  // Alerts
  alertMessage = '';
  alertType: 'success' | 'error' | 'info' = 'info';

  // Delete confirmation
  deletingId: number | null = null;

  ngOnInit(): void {
    // Load current user profile from GET /api/auth/me/
    this.authService.getCurrentUser().subscribe();
    // Load user's records from GET /api/documents/
    this.loadDocuments();
  }

  get documents(): DocumentItem[] {
    return this.documentService.documents();
  }

  get isLoading(): boolean {
    return this.documentService.isLoading();
  }

  get approvedCount(): number {
    return this.documents.filter(d => d.status === 'approved').length;
  }

  get inReviewCount(): number {
    return this.documents.filter(d => d.status === 'in_review').length;
  }

  get draftCount(): number {
    return this.documents.filter(d => d.status === 'draft').length;
  }

  loadDocuments(): void {
    this.documentService.getDocuments().subscribe({
      error: (err) => {
        this.showAlert(this.extractErrorMessage(err), 'error');
      }
    });
  }

  openCreateModal(): void {
    this.selectedDocument = null;
    this.isModalOpen = true;
  }

  openEditModal(doc: DocumentItem): void {
    this.selectedDocument = { ...doc };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedDocument = null;
    this.isSubmitting = false;
  }

  onSaveDocument(data: DocumentFormData): void {
    this.isSubmitting = true;

    if (this.selectedDocument) {
      // Update existing document via PUT /api/documents/<id>/
      this.documentService.updateDocument(this.selectedDocument.id, data).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.closeModal();
          this.showAlert('Document updated successfully.', 'success');
        },
        error: (err) => {
          this.isSubmitting = false;
          this.showAlert(this.extractErrorMessage(err), 'error');
        }
      });
    } else {
      // Create new document via POST /api/documents/
      this.documentService.createDocument(data).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.closeModal();
          this.showAlert('Document created successfully.', 'success');
        },
        error: (err) => {
          this.isSubmitting = false;
          this.showAlert(this.extractErrorMessage(err), 'error');
        }
      });
    }
  }

  confirmDelete(id: number): void {
    this.deletingId = id;
  }

  cancelDelete(): void {
    this.deletingId = null;
  }

  executeDelete(id: number): void {
    this.documentService.deleteDocument(id).subscribe({
      next: () => {
        this.deletingId = null;
        this.showAlert('Document deleted successfully.', 'success');
      },
      error: (err) => {
        this.deletingId = null;
        this.showAlert(this.extractErrorMessage(err), 'error');
      }
    });
  }

  getStatusClass(status: DocumentStatus): string {
    switch (status) {
      case 'approved':
        return 'status-approved';
      case 'in_review':
        return 'status-in-review';
      case 'draft':
        return 'status-draft';
      case 'archived':
        return 'status-archived';
      default:
        return '';
    }
  }

  getStatusLabel(status: DocumentStatus): string {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'in_review':
        return 'In Review';
      case 'draft':
        return 'Draft';
      case 'archived':
        return 'Archived';
      default:
        return status;
    }
  }

  showAlert(message: string, type: 'success' | 'error' | 'info'): void {
    this.alertMessage = message;
    this.alertType = type;
    setTimeout(() => {
      if (this.alertMessage === message) {
        this.alertMessage = '';
      }
    }, 4500);
  }

  private extractErrorMessage(error: any): string {
    if (!error || !error.error) {
      if (error.status === 404) {
        return 'The requested document was not found or you do not have permission to access it.';
      }
      if (error.status === 0) {
        return 'Unable to reach backend server. Please verify the Django server is running.';
      }
      return 'Operation failed. Please try again.';
    }

    const errData = error.error;
    if (typeof errData === 'string') return errData;
    if (errData.detail) return errData.detail;

    const messages: string[] = [];
    for (const key of Object.keys(errData)) {
      const val = errData[key];
      messages.push(`${key}: ${Array.isArray(val) ? val.join(' ') : val}`);
    }
    return messages.length > 0 ? messages.join(' | ') : 'An unexpected error occurred.';
  }
}
