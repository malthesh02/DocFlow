from django.db import models
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError


class Document(models.Model):
    """
    Core Document model for DocFlow.
    Represents a managed document in the workflow system.
    """
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('in_review', 'In Review'),
        ('approved', 'Approved'),
        ('archived', 'Archived'),
    )

    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='documents',
        null=True,
        blank=True,
        help_text="User who owns and created this document"
    )
    title = models.CharField(
        max_length=200,
        help_text="Title or name of the document"
    )
    description = models.TextField(
        blank=True,
        default='',
        help_text="Description or content overview of the document"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft',
        help_text="Current lifecycle status of the document"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when the document was created"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Timestamp when the document was last updated"
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Document'
        verbose_name_plural = 'Documents'

    def clean(self):
        super().clean()
        if self.title is not None and not self.title.strip():
            raise ValidationError({'title': 'Document title cannot be blank.'})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} ({self.get_status_display()})"
