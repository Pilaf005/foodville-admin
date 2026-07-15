# Auth Feature

## Purpose
Authentication scaffold — login, logout, register, and session management.
**Not yet implemented.** Infrastructure is in place; UI and pages are pending.

## Structure
```
features/auth/
├── components/    ← Empty — LoginModal, SignupModal to be built here
├── constants/     ← Empty — form field configs, validation messages
├── hooks/         ← Empty — useAuth, useSession to be built here
├── services/
│   └── auth.service.js  — API stubs (login/logout/register/getCurrentUser)
├── types/         ← Empty — User, AuthState types
└── utils/         ← Empty — token helpers, session validators
```

## Dependencies (planned)
- `@/lib/api` — axios instance with withCredentials
- `@/store/authStore` — Zustand auth state slice
- `@/constants/api` — API_ENDPOINTS.AUTH
- `@/components/ui/Modal` — for login modal
- React Hook Form + Zod for form validation

## Public API (planned)
```js
import { LoginModal } from "@/features/auth/components";
import { useAuth } from "@/features/auth/hooks";
```

## Future Work
1. Implement `LoginModal` and `SignupModal` components
2. Wire `auth.service.js` methods to real API
3. Create `useAuth` hook over `authStore`
4. Add `AuthProvider` to `src/providers/index.js`
5. Update `ProfileButton` in navbar to open LoginModal or navigate to /profile
6. Add `/login`, `/signup`, `/profile` pages in `src/app/`
