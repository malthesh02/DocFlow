import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DocumentItem, DocumentFormData, DocumentStatus } from '../../models/document.model';

@Component({
  selector: 'app-document-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './document-modal.component.html',
  styleUrl: './document-modal.component.css'
})
export class DocumentModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() document: DocumentItem | null = null;
  @Input() isSubmitting = false;

  @Output() save = new EventEmitter<DocumentFormData>();
  @Output() cancel = new EventEmitter<void>();

  form: FormGroup;
  submitted = false;

  statuses: { value: DocumentStatus; label: string }[] = [
    { value: 'draft', label: 'Draft' },
    { value: 'in_review', label: 'In Review' },
    { value: 'approved', label: 'Approved' },
    { value: 'archived', label: 'Archived' }
  ];

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      status: ['draft', [Validators.required]]
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['document'] || changes['isOpen']) {
      if (this.isOpen) {
        this.submitted = false;
        if (this.document) {
          this.form.patchValue({
            title: this.document.title,
            description: this.document.description || '',
            status: this.document.status
          });
        } else {
          this.form.reset({
            title: '',
            description: '',
            status: 'draft'
          });
        }
      }
    }
  }

  get f() {
    return this.form.controls;
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.form.invalid) {
      return;
    }

    const value = this.form.value;
    this.save.emit({
      title: value.title.trim(),
      description: (value.description || '').trim(),
      status: value.status
    });
  }

  onCancel(): void {
    this.form.reset();
    this.submitted = false;
    this.cancel.emit();
  }
}
