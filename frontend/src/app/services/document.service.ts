import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { DocumentItem, DocumentFormData } from '../models/document.model';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/documents/`;

  private documentsSignal = signal<DocumentItem[]>([]);
  private loadingSignal = signal<boolean>(false);

  readonly documents = this.documentsSignal.asReadonly();
  readonly isLoading = this.loadingSignal.asReadonly();

  /**
   * Fetch all documents owned by the currently authenticated user
   */
  getDocuments(): Observable<DocumentItem[]> {
    this.loadingSignal.set(true);
    return this.http.get<DocumentItem[]>(this.API_URL).pipe(
      tap({
        next: (docs) => {
          this.documentsSignal.set(docs);
          this.loadingSignal.set(false);
        },
        error: () => {
          this.loadingSignal.set(false);
        }
      })
    );
  }

  /**
   * Retrieve a single document by ID
   */
  getDocument(id: number): Observable<DocumentItem> {
    return this.http.get<DocumentItem>(`${this.API_URL}${id}/`);
  }

  /**
   * Create a new document for the authenticated user
   */
  createDocument(data: DocumentFormData): Observable<DocumentItem> {
    return this.http.post<DocumentItem>(this.API_URL, data).pipe(
      tap((newDoc) => {
        this.documentsSignal.update(docs => [newDoc, ...docs]);
      })
    );
  }

  /**
   * Update an existing document
   */
  updateDocument(id: number, data: DocumentFormData): Observable<DocumentItem> {
    return this.http.put<DocumentItem>(`${this.API_URL}${id}/`, data).pipe(
      tap((updatedDoc) => {
        this.documentsSignal.update(docs =>
          docs.map(doc => doc.id === id ? updatedDoc : doc)
        );
      })
    );
  }

  /**
   * Delete a document by ID
   */
  deleteDocument(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}${id}/`).pipe(
      tap(() => {
        this.documentsSignal.update(docs => docs.filter(doc => doc.id !== id));
      })
    );
  }
}
