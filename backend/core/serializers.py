from rest_framework import serializers
from django.contrib.auth.models import User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Document


class UserSerializer(serializers.ModelSerializer):
    """
    Public profile representation of a User.
    Excludes sensitive attributes such as passwords or permissions.
    """
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'date_joined']
        read_only_fields = ['id', 'date_joined']


class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration with validation and password hashing.
    """
    email = serializers.EmailField(
        required=True,
        help_text="Valid email address is required."
    )
    password = serializers.CharField(
        write_only=True,
        required=True,
        min_length=8,
        style={'input_type': 'password'},
        help_text="Password must be at least 8 characters long."
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=False,
        style={'input_type': 'password'},
        help_text="Confirm your password (optional, checked if provided)."
    )
    confirm_password = serializers.CharField(
        write_only=True,
        required=False,
        style={'input_type': 'password'},
        help_text="Confirm your password (alternative field name)."
    )

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'password_confirm', 'confirm_password']
        read_only_fields = ['id']

    def validate_username(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Username cannot be empty or blank.")
        if len(value.strip()) < 3:
            raise serializers.ValidationError("Username must be at least 3 characters long.")
        if User.objects.filter(username__iexact=value.strip()).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value.strip()

    def validate_email(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Email address cannot be blank.")
        clean_email = value.strip().lower()
        if User.objects.filter(email__iexact=clean_email).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return clean_email

    def validate(self, attrs):
        password = attrs.get('password')
        password_confirm = attrs.get('password_confirm') or attrs.get('confirm_password')
        if password_confirm is not None and password != password_confirm:
            raise serializers.ValidationError({'password_confirm': "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm', None)
        validated_data.pop('confirm_password', None)
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT login serializer that includes basic user profile with the tokens.
    """
    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data


class DocumentSerializer(serializers.ModelSerializer):
    """
    Serializer for Document model providing validation, ownership, and JSON representation.
    """
    owner = serializers.ReadOnlyField(source='owner.username')

    class Meta:
        model = Document
        fields = ['id', 'title', 'description', 'status', 'owner', 'created_at', 'updated_at']
        read_only_fields = ['id', 'owner', 'created_at', 'updated_at']

    def validate_title(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Title cannot be empty or whitespace.")
        if len(value.strip()) < 3:
            raise serializers.ValidationError("Title must be at least 3 characters long.")
        return value.strip()
