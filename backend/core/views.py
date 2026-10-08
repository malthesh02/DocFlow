from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Document
from .serializers import (
    UserSerializer,
    RegisterSerializer,
    CustomTokenObtainPairSerializer,
    DocumentSerializer,
)


@api_view(['GET'])
@permission_classes([AllowAny])
@authentication_classes([])
def health_check(request):
    """
    Basic public health check endpoint to verify backend and DRF setup.
    """
    return Response({
        'status': 'healthy',
        'message': 'DocFlow API is running smoothly',
        'version': '1.0.0'
    })


class RegisterView(APIView):
    """
    User registration endpoint.
    Creates a new user account with hashed password and returns initial JWT tokens.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'message': 'User registered successfully.',
                'user': UserSerializer(user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Login endpoint: authenticates user credentials and returns access, refresh tokens, and user info.
    """
    permission_classes = [AllowAny]
    serializer_class = CustomTokenObtainPairSerializer


class CurrentUserView(APIView):
    """
    Retrieves the currently authenticated user's profile details.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class DocumentViewSet(viewsets.ModelViewSet):
    """
    Protected CRUD API viewset for Document resources.
    Enforces user data isolation:
      - Users can only list, view, modify, and delete documents they own.
      - Automatically sets document owner on creation.
    """
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Users can only see and access their own documents
        return Document.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        # Associate created document with the authenticated user
        serializer.save(owner=self.request.user)
