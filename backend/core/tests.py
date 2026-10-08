from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Document


class AuthAndCRUDTestCase(APITestCase):
    """
    Comprehensive test suite for DocFlow:
    Authentication, CRUD operations, Input Validation, Security, and Data Isolation.
    """

    def setUp(self):
        # User A
        self.user_a = User.objects.create_user(
            username="alice",
            email="alice@example.com",
            password="Password123!"
        )
        self.user_a_token = str(RefreshToken.for_user(self.user_a).access_token)

        # User B
        self.user_b = User.objects.create_user(
            username="bob",
            email="bob@example.com",
            password="Password123!"
        )
        self.user_b_token = str(RefreshToken.for_user(self.user_b).access_token)

        # User A's Document
        self.doc_a = Document.objects.create(
            owner=self.user_a,
            title="Alice Document",
            description="Alice private notes",
            status="draft"
        )

        # User B's Document
        self.doc_b = Document.objects.create(
            owner=self.user_b,
            title="Bob Document",
            description="Bob private notes",
            status="draft"
        )

        # URLs
        self.register_url = reverse('auth-register')
        self.login_url = reverse('auth-login')
        self.refresh_url = reverse('auth-refresh')
        self.me_url = reverse('auth-me')
        self.document_list_url = reverse('document-list')
        self.doc_a_detail_url = reverse('document-detail', kwargs={'pk': self.doc_a.pk})
        self.doc_b_detail_url = reverse('document-detail', kwargs={'pk': self.doc_b.pk})

    # ==========================================
    # 1. AUTHENTICATION & VALIDATION TESTS
    # ==========================================

    def test_health_check_public(self):
        """Public health check endpoint should be accessible without credentials."""
        response = self.client.get(reverse('health-check'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'healthy')

    def test_register_user_success(self):
        """Registering with valid details creates user, hashes password, and returns tokens."""
        payload = {
            "username": "charlie",
            "email": "charlie@example.com",
            "password": "SecurePassword123!",
            "password_confirm": "SecurePassword123!"
        }
        response = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['user']['username'], "charlie")
        self.assertIn('tokens', response.data)
        self.assertTrue(User.objects.filter(username="charlie").exists())
        user = User.objects.get(username="charlie")
        self.assertTrue(user.check_password("SecurePassword123!"))

    def test_register_duplicate_username(self):
        """Registration with existing username should return 400 Bad Request."""
        payload = {
            "username": "alice",
            "email": "unique_email@example.com",
            "password": "SecurePassword123!"
        }
        response = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('username', response.data)

    def test_register_duplicate_email(self):
        """Registration with existing email should return 400 Bad Request."""
        payload = {
            "username": "new_user",
            "email": "alice@example.com",
            "password": "SecurePassword123!"
        }
        response = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)

    def test_register_missing_fields(self):
        """Registration with missing required fields should return 400."""
        # Missing username
        res1 = self.client.post(self.register_url, {"email": "test@test.com", "password": "Password123!"}, format='json')
        self.assertEqual(res1.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('username', res1.data)

        # Missing email
        res2 = self.client.post(self.register_url, {"username": "testuser", "password": "Password123!"}, format='json')
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', res2.data)

        # Missing password
        res3 = self.client.post(self.register_url, {"username": "testuser", "email": "test@test.com"}, format='json')
        self.assertEqual(res3.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', res3.data)

    def test_register_password_mismatch(self):
        """Registration with mismatched passwords should return 400."""
        payload = {
            "username": "david",
            "email": "david@example.com",
            "password": "SecurePassword123!",
            "password_confirm": "DifferentPassword123!"
        }
        response = self.client.post(self.register_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password_confirm', response.data)

    def test_login_valid_credentials(self):
        """Login with valid credentials should return access and refresh tokens."""
        response = self.client.post(self.login_url, {
            "username": "alice",
            "password": "Password123!"
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['username'], "alice")

    def test_login_invalid_credentials(self):
        """Login with incorrect password should return 401 Unauthorized."""
        response = self.client.post(self.login_url, {
            "username": "alice",
            "password": "WrongPassword!"
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_refresh_valid(self):
        """Token refresh with valid refresh token returns new access token."""
        refresh = str(RefreshToken.for_user(self.user_a))
        response = self.client.post(self.refresh_url, {"refresh": refresh}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_token_refresh_invalid(self):
        """Token refresh with invalid token returns 401."""
        response = self.client.post(self.refresh_url, {"refresh": "fake.refresh.token"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_current_user_profile(self):
        """GET /api/auth/me/ returns current user profile when authenticated."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.user_a_token}')
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], "alice")
        self.assertNotIn('password', response.data)

    # ==========================================
    # 2. CRUD & VALIDATION BOUNDARY TESTS
    # ==========================================

    def test_create_valid_record(self):
        """Authenticated user can create a valid document."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.user_a_token}')
        payload = {
            "title": "Valid Project Plan",
            "description": "Comprehensive milestones",
            "status": "in_review"
        }
        response = self.client.post(self.document_list_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], "Valid Project Plan")
        self.assertEqual(response.data['owner'], "alice")

    def test_create_record_invalid_title(self):
        """Creating a document with empty, whitespace, or <3 char title is rejected with 400."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.user_a_token}')

        # Empty whitespace title
        res1 = self.client.post(self.document_list_url, {"title": "   "}, format='json')
        self.assertEqual(res1.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('title', res1.data)

        # Too short title
        res2 = self.client.post(self.document_list_url, {"title": "ab"}, format='json')
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('title', res2.data)

    def test_create_record_invalid_status_choice(self):
        """Creating a document with invalid status choice is rejected with 400."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.user_a_token}')
        res = self.client.post(self.document_list_url, {
            "title": "Good Title",
            "status": "non_existent_status"
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('status', res.data)

    def test_update_record_valid_and_invalid(self):
        """Updating document works with valid data, and rejects invalid data with 400."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.user_a_token}')

        # Valid update
        res1 = self.client.put(self.doc_a_detail_url, {
            "title": "Alice Document Renamed",
            "description": "Updated description",
            "status": "approved"
        }, format='json')
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        self.assertEqual(res1.data['title'], "Alice Document Renamed")

        # Invalid update: whitespace title
        res2 = self.client.put(self.doc_a_detail_url, {
            "title": "   ",
            "status": "approved"
        }, format='json')
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)

    def test_delete_record_success_and_non_existent(self):
        """Deleting existing record returns 204; deleting non-existent record returns 404."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.user_a_token}')

        # Valid delete
        res1 = self.client.delete(self.doc_a_detail_url)
        self.assertEqual(res1.status_code, status.HTTP_204_NO_CONTENT)

        # Deleting already deleted / non-existent record
        res2 = self.client.delete(self.doc_a_detail_url)
        self.assertEqual(res2.status_code, status.HTTP_404_NOT_FOUND)

        # Deleting arbitrary non-existent ID
        non_existent_url = reverse('document-detail', kwargs={'pk': 99999})
        res3 = self.client.delete(non_existent_url)
        self.assertEqual(res3.status_code, status.HTTP_404_NOT_FOUND)

    # ==========================================
    # 3. SECURITY & CROSS-USER ISOLATION TESTS
    # ==========================================

    def test_unauthenticated_requests_rejected(self):
        """All CRUD operations without a token are rejected with 401."""
        self.assertEqual(self.client.get(self.document_list_url).status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.client.post(self.document_list_url, {"title": "Doc"}).status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.client.get(self.doc_a_detail_url).status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.client.put(self.doc_a_detail_url, {"title": "Doc"}).status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.client.delete(self.doc_a_detail_url).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cross_user_isolation(self):
        """Users cannot list, view, update, or delete other users' records."""
        # Alice tries to view Bob's doc -> 404
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.user_a_token}')
        self.assertEqual(self.client.get(self.doc_b_detail_url).status_code, status.HTTP_404_NOT_FOUND)

        # Alice tries to update Bob's doc -> 404
        self.assertEqual(self.client.put(self.doc_b_detail_url, {"title": "Hacked", "status": "draft"}).status_code, status.HTTP_404_NOT_FOUND)

        # Alice tries to delete Bob's doc -> 404
        self.assertEqual(self.client.delete(self.doc_b_detail_url).status_code, status.HTTP_404_NOT_FOUND)

        # Verify Bob's document is intact
        self.doc_b.refresh_from_db()
        self.assertEqual(self.doc_b.title, "Bob Document")

    def test_invalid_jwt_rejected(self):
        """Requests with corrupted or invalid JWT are rejected with 401."""
        self.client.credentials(HTTP_AUTHORIZATION='Bearer corrupted.token.value')
        self.assertEqual(self.client.get(self.document_list_url).status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.client.get(self.me_url).status_code, status.HTTP_401_UNAUTHORIZED)
