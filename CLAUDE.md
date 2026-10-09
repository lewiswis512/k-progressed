# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
yarn install

# Development (watch mode)
yarn start:dev

# Build
yarn build

# Production (requires prior build)
yarn start:prod

# Lint with auto-fix
yarn lint

# Format
yarn format

# Tests
yarn test                  # unit tests (test/**/*.spec.ts)
yarn test:watch            # watch mode
yarn test:cov              # with coverage
yarn test:e2e              # end-to-end (config: test/jest-e2e.json)
yarn test:debug            # with Node inspector

# Seed database (deletes users, courses, sections, lessons, teachers, categories and FAQs; refused when NODE_ENV=production)
SEED_PASSWORD=... yarn seed --yes
```

The server runs on port `4000` by default (override with `PORT` env var). All routes are prefixed `/api`. Swagger UI is served publicly at `/api` in every environment, and `/` redirects to it. `GET /api/health` reports API and database status.

Unit tests (`test/**/*.spec.ts`, mirroring the `src/` tree; never put a spec in `src/`) and e2e tests (`test/**/*.e2e-spec.ts`) run against an in-memory MongoDB (mongodb-memory-server), never against `MONGO_URI`; Stripe, Cloudinary and the mailer are mocked.

## Environment Variables

Copy `.env.example` to `.env`. Required variables:

| Variable | Purpose |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` / `JWT_EXPIRATION_TIME` | JWT signing; `JWT_EXPIRATION_TIME` is the access token lifetime (`15m`) |
| `EMAIL_HOST/PORT/USER/PASSWORD/SECURE/FROM` | Nodemailer (Gmail SMTP) |
| `FORGOT_PASSWORD_LINK` | Frontend reset-password URL |
| `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` / `STRIPE_API_VERSION` | Stripe |
| `WEBHOOK_STRIPE_SECRET` | Stripe webhook signing secret (`POST /api/webhook`; listen to `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`, `charge.refunded`) |
| `NODE_ENV` | `production` disables `yarn seed` (the super admin endpoint still works) |
| `SEED_PASSWORD` / `SEED_SUPERADMIN_EMAIL` | Password of every seeded account and super admin email, for `yarn seed` and `POST /api/load-data` |
| `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` | Cloudinary image uploads |
| `FRONTEND_URL` | CORS allowed origin |
| `API_URL` | Public URL of this API (used to build asset URLs) |

## Architecture

### Module layout

```
src/
  modules/         # Feature modules
    auth/          # JWT auth, forgot/reset password, Stripe customer creation on signup
    users/         # User profile, checking (enrollment status)
    learning/      # Courses, sections, lessons, teachers, categories, mentoring
    comments/      # Comments on courses and lessons
    purchases/     # Purchase records
    payment/       # Stripe payment intent, webhook, config
    progress/      # Lesson completion, /learning, certificates
    statistic/     # Super admin dashboard stats (GET /api/admin/stats)
    faq/           # FAQ (public list, super admin CRUD and reorder)
    load-data/     # Seed service: POST /api/load-data (super admin, body { confirmation: 'LOAD DATA' }) and src/scripts/seed.ts
  common/          # Reusable NestJS building blocks
    document/      # AbstractDocument (Mongoose base schema with _id + timestamps)
    repository/    # AbstractRepository<T> with standard CRUD + aggregate helpers
    guards/        # AuthGuard, RolesGuard (+ @Roles decorator)
    auth/          # AuthenticatedRequest and IRequestUser types
    access/        # CourseAccessService: canManage (author or super admin), hasAccess (paid purchase)
    filters/       # AllExceptionsFilter (logs unexpected errors, hides internals)
    pipes/         # IsUnique (DB uniqueness validator), PasswordMatch validator
    decorators/    # @ImageFile, @VideoFile (Multer interceptors)
    validators/    # CustomUploadFileTypeValidator
  shared/
    mailer/        # SendMailModule (Nodemailer via @nestjs-modules/mailer)
    pagination/    # PaginationDto
    search/        # SearchDto
  interfaces/      # Pure TypeScript interfaces shared across modules
  data/            # Seed fixtures (courses, sections, lessons, teachers, users)
  templates/       # Email HTML templates (reset-password, booking notifications)
  utils/
    enums/         # RoleEnum (USER=1, ADMIN=2, SUPERADMIN=3), UserTypeEnum (STUDENT=1, TEACHER=2), LevelEnum
    uploads/       # Upload strategy implementations (see below)
    files/         # File helpers (upload-photo, update-photo, remove-file-if-exist)
    auths/         # hashPassword, validatePassword (bcrypt wrappers)
    dates/         # Date formatting helpers
    slugify.ts     # Slug generation
    pagination/    # Pagination utility function
```

### Repository pattern

Every Mongoose schema extends `AbstractDocument` (`src/common/document/abstract.document.ts`), which adds `_id` and timestamp fields. Each domain has a repository that extends `AbstractRepository<TDocument>` (`src/common/repository/abstract.repository.ts`), which provides: `find`, `findById`, `findOne`, `findOneOrNull`, `aggregate`, `create`, `insertMany`, `findByIdAndUpdate`, `findOneAndUpdate`, `updateMany`, `findByIdAndDelete`, `findOneAndDelete`, `deleteMany`, `countDocuments`.

All default `find` queries sort by `created_at: -1`.

### Service split pattern (learning module)

Operations with meaningful complexity get their own injectable service file rather than methods on a single service class. For example, the courses domain uses: `add.service.ts`, `delete.service.ts`, `list.service.ts`, `get-by-id.service.ts`, `get-by-slug.service.ts`, `update.service.ts`, `get-content.service.ts`, `get-with-rating.service.ts`, `is-author.service.ts`, etc. All are provided in `CoursesModule` and injected where needed.

### Typing

`any` is forbidden: ESLint `@typescript-eslint/no-explicit-any` is an error and `tsconfig.json` sets `noImplicitAny`. Use `unknown` and narrow it (`catch (error: unknown)` with `errorStack` / `errorMessage` / `isDuplicateKeyError` from `src/utils/errors.ts`). Controllers type `@Req()` as `AuthenticatedRequest` (behind `AuthGuard`) from `src/common/auth/authenticated-request.ts`. Schema references are typed with the referenced class (`author: User`, `section: Section`). Read the id with `String(ref._id)` (Mongoose adds `_id` to `ObjectId`, so it works populated or not). When creating a document, pass the referenced document, never an id (`course`, not `course._id`): Mongoose stores its `_id` but returns it populated in the creation response, so a user loaded only for that purpose is fetched with `UserRepository.findPublicById` (`PUBLIC_USER_FIELDS`: no e-mail, no Stripe id). In tests, type partial mocks as `as unknown as RealType`. No code comments.

### Database access

Services, guards and controllers always go through a repository (`private purchaseRepository: PurchaseRepository`), never through `@InjectModel`, `Model<X>`, `Connection` or raw `.collection(...)`. Only repositories inject a `Model`; a query that the `AbstractRepository` methods cannot express (aggregation, upsert, lean projection, populate + pagination) becomes a method of the concrete repository. There is no global repository module: each module registers in `MongooseModule.forFeature` the models it needs and lists the repositories it injects in its `providers`, including `UserRepository` for every module whose controllers use `AuthGuard` (Nest builds the guard in the controller's module) and `PurchaseRepository` for every module that provides `CourseAccessService`. Standalone scripts use `mongoose.model(X.name, XSchema)`; to update a field that is no longer in the schema, pass `{ strict: false }`.

### Field naming convention

All schema fields use a short entity prefix:
- `usr_` — User
- `crs_` — Course
- `sect_` — Section
- `lssn_` — Lesson
- `tchr_` — Teacher
- `ctgr_` — Category

### Upload strategies

Photo and video uploads follow the Strategy pattern under `src/utils/uploads/`:
- **Photos**: `PhotoUploaderContext` dispatches to `CloudinaryUploadStrategy` (default) or `LocalUploadStrategy` via `PhotoUploadStrategy` interface.
- **Videos**: `VideoUploadStrategy` with `CloudinaryVideoUploadStrategy` (Cloudinary returns the duration; the thumbnail is a Cloudinary-derived frame, no ffmpeg needed).

Uploads are checked on MIME type and file signature (magic bytes). The `/api/webhook` route receives raw body (`express.raw`) for Stripe signature verification; the JSON body limit is 1 MB.

### Authentication flow

`AuthGuard` validates the JWT Bearer token, reloads the user from the database (fresh role, deleted users rejected, tokens issued before `usr_password_changed_at` rejected) and sets `request['user']` = `{ id, username, email, firstname, lastname, slug, photo, type, role, customerId }`. Role checks use `@UseGuards(AuthGuard, RolesGuard)` + `@Roles(...)`. Ownership checks go through `CourseAccessService`.

The global `ValidationPipe` uses `whitelist` and `transform`: every accepted body field needs a class-validator decorator, otherwise it is silently dropped. Never spread a DTO into a document; pick the fields explicitly.

Sessions use a short-lived JWT access token plus an opaque refresh token (`SessionService`, `refresh-tokens` collection, 30 days, stored as SHA-256 hash). Login, email verification and password change return `{ accessToken, refreshToken }`. `POST /refresh-token` rotates the pair; replaying an already used refresh token deletes every refresh token of the user (all devices are logged out). `POST /logout` deletes the presented refresh token. A password change or reset (both call `SessionService.revokeAll`) or a deleted user invalidates every refresh token of the user.

Signup creates a Stripe customer and sends an email confirmation link (`usr_email_verified: false`); login is refused until `POST /verify-email/:token`. Users created before this flow have no `usr_email_verified` field and can log in. Reset and verification tokens are random, stored as SHA-256 hashes in `UserReset` and expire (TTL index). Rate limiting: `ThrottlerGuard` globally (120 req/min) with stricter `@Throttle` on auth routes.

### Payments

Prices are always computed server side. `POST /purchases` builds the order from the database, `POST /payment-intent/purchase/:id` creates the Stripe PaymentIntent from the stored total, and only the signed webhook (`payment_intent.succeeded`) marks a purchase paid, after checking the amount. Webhook events are deduplicated in the `stripe-events` collection. Refunds: `POST /payment-intent/refund/purchase/:id` (super admin) and `charge.refunded`. Free courses (total 0) are enrolled immediately. Mentoring bookings are held 15 minutes, confirmed by the webhook (unique index on confirmed slots), and refunded automatically on a slot conflict or a cancellation (student ≥ 24 h before, mentor anytime). Slot times are Europe/Paris.

### Data hierarchy

Course → Section → Lesson (one-to-many at each level). A `Teacher` document is separate from `User` and is linked to a `Course`. Comments can be attached to either a course or a lesson (`source` discriminator field).
