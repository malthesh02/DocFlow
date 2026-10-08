from django.contrib import admin
from .models import Document


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'owner', 'status', 'created_at', 'updated_at')
    list_filter = ('status', 'owner', 'created_at')
    search_fields = ('title', 'description', 'owner__username')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at')
