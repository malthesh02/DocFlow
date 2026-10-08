# DocFlow

DocFlow is a modern full-stack document and workflow management platform built with an **Angular 19** frontend and a **Python / Django REST Framework** backend, utilizing **MySQL** for persistence and **JWT (JSON Web Tokens)** for stateless authentication.

---

## 1. Project Overview

DocFlow enables teams and professionals to securely create, organize, edit, and track workflow documents (such as proposals, audit reports, and standard operating procedures) through a fast, responsive single-page application. It provides complete user isolation, ensuring that every user has private, authenticated access strictly to their own data.

---

## 2. Features

- **User Registration**: Secure account creation with email format validation and password confirmation.
- **JWT Authentication**: Stateless authentication with short-lived access tokens and refresh tokens.
- **Protected Routes**: Client-side Angular Route Guards and backend DRF permissions ensuring private page access.
- **User-Specific Data Isolation**: Django ORM queryset scoping guarantees users can only access and manipulate records they own.
- **Full CRUD Operations**: Create, view, list, update, and delete workflow documents in real time.
- **Automatic Token Refresh**: Seamless HTTP interceptor that detects expired access tokens and refreshes them without disrupting the user.
- **Responsive Angular UI**: Clean, accessible, mobile-first interface with real-time feedback, status badges, and loading states.
- **Secure Logout**: Instant session invalidation and route redirection.

---

## 3. Technology Stack

### Frontend
- **Framework**: Angular 19
- **Language**: TypeScript 5.7+
- **Architecture**: Standalone Components, Reactive Forms, Angular Signals
- **Routing**: Angular Router with functional guards (`CanActivateFn`)
- **HTTP Client**: `@angular/common/http` with functional interceptors (`HttpInterceptorFn`)

### Backend
- **Language**: Python 3.10+
- **Framework**: Django 5.1+
- **API Engine**: Django REST Framework (DRF) 3.15+
- **Authentication**: `djangorestframework-simplejwt` (PBKDF2-SHA256 password hashing)
- **CORS Handling**: `django-cors-headers`

### Database
- **Primary Database**: MySQL 8.0+ (via `PyMySQL` and `cryptography`)
- **Development Fallback**: SQLite (automatic seamless fallback when local MySQL service is inactive)

---

## 4. Architecture Overview

```
Angular Frontend (Browser / Single-Page App)
       │
       ▼  (HTTP / JSON with Bearer JWT via Angular HttpInterceptor)
Django REST Framework API (Views, Serializers, Permissions)
       │
       ▼  (User-scoped QuerySets)
Django ORM (Object-Relational Mapping & Validation)
       │
       ▼  (SQL Queries)
MySQL Database (Relational Persistence & Foreign Keys)
```

### Interview Questions & Technical Explanations

#### Why Angular?
Angular provides an enterprise-ready, opinionated framework with built-in dependency injection, a powerful type-safe HTTP client, functional routing guards, and reactive forms. In this project, Angular Signals ensure fast, lightweight reactivity without the complexity of external state management libraries.

#### Why Django REST Framework?
Django REST Framework (DRF) accelerates API development by combining Django’s robust ORM, model serializers, declarative permission classes (`IsAuthenticated`), and pluggable authentication schemes (`JWTAuthentication`). It provides enterprise-grade data validation and secure defaults out of the box.

#### How JWT Authentication Works
1. When a user submits credentials to `POST /api/auth/login/`, Django validates the username and hashed password.
2. Upon successful authentication, Django issues two signed tokens: an **access token** (short lifespan: 60 minutes) and a **refresh token** (longer lifespan: 1 day).
3. The Angular client stores these tokens in `localStorage`.
4. The Angular `authInterceptor` automatically attaches `Authorization: Bearer <access_token>` to every subsequent API request.
5. If the backend responds with `401 Unauthorized` due to token expiry, the interceptor automatically calls `POST /api/auth/refresh/` using the refresh token, obtains a new access token, and retries the original request without user interruption.

#### How CRUD Operations Work
- **Create**: The user opens the document modal in Angular, fills the reactive form, and submits. `DocumentService` executes `POST /api/documents/`. DRF's `perform_create` automatically assigns `owner = request.user` from the validated JWT token before saving to the database.
- **Read**: `DocumentService` executes `GET /api/documents/`. Django queries only the records where `owner == request.user` and returns them as JSON.
- **Update**: `DocumentService` executes `PUT /api/documents/<id>/`. Django verifies ownership and updates the specific fields.
- **Delete**: `DocumentService` executes `DELETE /api/documents/<id>/`. Django deletes the record and returns HTTP 204 No Content.

#### How User Data Isolation is Enforced
Security is **never** left solely to the frontend. In [`backend/core/views.py`](file:///d:/DocFlow/backend/core/views.py), `DocumentViewSet` overrides `get_queryset()`:
```python
def get_queryset(self):
    return Document.objects.filter(owner=self.request.user)
```
If User B attempts to access, modify, or delete a document owned by User A by guessing its primary key (e.g. `GET /api/documents/10/`), Django cannot find that record within User B's filtered queryset and automatically returns **`404 Not Found`**. This prevents ID enumeration attacks and data leakage.

---

## 5. Project Structure

```
DocFlow/
├── backend/                       # Django Backend
│   ├── backend/
│   │   ├── __init__.py            # PyMySQL installation hook
│   │   ├── settings.py            # SimpleJWT, CORS, and Database settings
│   │   ├── urls.py                # Top-level API routing
│   │   └── wsgi.py
│   ├── core/                      # Main Domain Application
│   │   ├── models.py              # Document model with owner FK
│   │   ├── serializers.py         # User, Register, and Document serializers
│   │   ├── views.py               # Auth views and DocumentViewSet
│   │   ├── urls.py                # /api/ routes
│   │   └── tests.py               # 19 automated tests
│   ├── manage.py                  # Django CLI entrypoint
│   ├── requirements.txt           # Frozen Python dependencies
│   ├── .env.example               # Environment template
│   └── .gitignore
├── frontend/                      # Angular 19 Single-Page App
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/        # Reusable UI components (Navbar, DocumentModal, Alert)
│   │   │   ├── pages/             # Application views (Login, Register, Dashboard)
│   │   │   ├── services/          # Services (AuthService, DocumentService, ApiService)
│   │   │   ├── guards/            # Navigation guards (authGuard, guestGuard)
│   │   │   ├── interceptors/      # authInterceptor (JWT injection & auto-refresh)
│   │   │   ├── models/            # TypeScript interfaces (document.model.ts, user.model.ts)
│   │   │   ├── app.component.ts   # Root container
│   │   │   ├── app.config.ts      # Router & HTTP client configuration
│   │   │   └── app.routes.ts      # Route declarations
│   │   ├── environments/          # environment.ts & environment.prod.ts
│   │   ├── index.html
│   │   ├── main.ts
│   │   └── styles.css             # Base modern styling
│   ├── angular.json               # Angular CLI configuration
│   ├── package.json               # npm scripts & dependencies
│   ├── proxy.conf.json            # Development proxy (/api -> http://localhost:8000)
│   ├── tsconfig.json              # TypeScript compiler configuration
│   └── .gitignore
├── .env.example                   # Root environment template
├── .gitignore                     # Root repository ignore rules
└── README.md                      # Documentation
```

---

## 6. System Requirements

- **Node.js**: v22.19.0+ (or active LTS)
- **npm**: v10.9.0+
- **Python**: v3.10+
- **MySQL**: v8.0+ (Optional for local dev due to SQLite fallback)
- **Git**

---

## 7. Setup & Execution Guide

### Step 1: Backend Setup (Django)

1. Open a terminal and navigate to the backend directory:
   ```bash
   cd d:\DocFlow\backend
   ```

2. Activate the Python virtual environment:
   - **Windows (PowerShell)**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - **Windows (CMD)**:
     ```cmd
     .\venv\Scripts\activate.bat
     ```
   - **Linux / macOS**:
     ```bash
     source venv/bin/activate
     ```

3. Install required Python packages (if setting up fresh):
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Update database credentials and secret key if desired.

5. Apply database migrations:
   ```bash
   python manage.py migrate
   ```

6. Start the Django development server:
   ```bash
   python manage.py runserver 8000
   ```
   - API Base URL: `http://127.0.0.1:8000/api/`
   - Health Check: `http://127.0.0.1:8000/api/health/`

---

### Step 2: Frontend Setup (Angular 19)

1. Open a second terminal and navigate to the frontend directory:
   ```bash
   cd d:\DocFlow\frontend
   ```

2. Install npm dependencies (if setting up fresh):
   ```bash
   npm install
   ```

3. Start the Angular development server:
   ```bash
   npm start
   ```
   - Open your browser to: **`http://localhost:4200/`**
   - The development server automatically proxies all `/api/*` requests to the Django backend on port 8000 via `proxy.conf.json`.

---

### Step 3: Database Setup (MySQL)

1. Ensure MySQL service is running on `127.0.0.1:3306`.
2. Open your MySQL client and create the database:
   ```sql
   CREATE DATABASE docflow_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
3. In `backend/.env`, configure your database credentials:
   ```env
   DB_NAME=docflow_db
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_HOST=127.0.0.1
   DB_PORT=3306
   ```
4. Run migrations in `backend/`:
   ```bash
   python manage.py migrate
   ```

> **Note on Resilient Local Development**: If MySQL is not running on port 3306, the Django server automatically falls back to local SQLite (`db.sqlite3`), ensuring uninterrupted local development. Once MySQL is started, it seamlessly connects to MySQL.

---

## 8. API Documentation

| Method | Endpoint | Authentication | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health/` | Public | System health check returning status and API version |
| `POST` | `/api/auth/register/` | Public | Register new user account with email and password confirmation |
| `POST` | `/api/auth/login/` | Public | Authenticate user credentials and receive JWT access and refresh tokens |
| `POST` | `/api/auth/refresh/` | Public | Exchange an expired access token using a valid refresh token |
| `GET` | `/api/auth/me/` | **Bearer Token** | Retrieve currently authenticated user profile |
| `GET` | `/api/documents/` | **Bearer Token** | List all workflow documents owned by the logged-in user |
| `POST` | `/api/documents/` | **Bearer Token** | Create a new workflow document (automatically assigned to owner) |
| `GET` | `/api/documents/<id>/` | **Bearer Token** | Retrieve specific document details by ID |
| `PUT` | `/api/documents/<id>/` | **Bearer Token** | Update an existing document (title, description, status) |
| `DELETE` | `/api/documents/<id>/` | **Bearer Token** | Permanently delete a document |

---

## 9. Authentication & Request Flow

```
1. User enters credentials in LoginComponent
2. AuthService.login() calls POST /api/auth/login/
3. Backend verifies credentials via Django PBKDF2
4. Tokens stored in localStorage (access_token, refresh_token)
5. Angular Router redirects to /dashboard
6. On protected calls, authInterceptor injects: Authorization: Bearer <access_token>
7. If 401 received: authInterceptor calls POST /api/auth/refresh/ and replays the original request
8. On logout: AuthService clears localStorage and navigates to /login
```

---

## 10. CRUD Request Flow

```
1. User creates or edits document in DocumentModalComponent
2. DocumentService sends POST / PUT to /api/documents/
3. authInterceptor adds Authorization header
4. Django DRF DocumentViewSet verifies token & enforces user ownership
5. Django ORM saves record to MySQL database
6. Angular DocumentService updates reactive Signal state in-place without page reload
```

---

## 11. Testing & Verification

Run the automated backend test suite:
```powershell
cd backend
python manage.py test core
```
*Result: 19/19 tests passed (Authentication, Token Refresh, CRUD, Boundary Validation, User Data Isolation).*

Run the frontend production build:
```powershell
cd frontend
npm run build
```
*Result: Clean production bundle compiled in ~10s with 0 errors and 0 warnings.*
