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
yarn test                  # unit tests (rootDir: src, pattern: **/*.spec.ts)
yarn test:watch            # watch mode
yarn test:cov              # with coverage
yarn test:e2e              # end-to-end (config: test/jest-e2e.json)
yarn test:debug            # with Node inspector

# Seed database
yarn seed:users
```

The server runs on port `4000` by default (override with `PORT` env var). All routes are prefixed `/api`. Swagger UI is served at `/api`.

## Environment Variables

Copy `.env.example` to `.env`. Required variables:

| Variable | Purpose |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` / `JWT_EXPIRATION_TIME` | JWT signing |
| `EMAIL_HOST/PORT/USER/PASSWORD/SECURE/FROM` | Nodemailer (Gmail SMTP) |
| `FORGOT_PASSWORD_LINK` | Frontend reset-password URL |
| `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` / `STRIPE_API_VERSION` | Stripe |
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
    load-data/     # Admin endpoint to bulk-seed DB from src/data/ fixtures
  common/          # Reusable NestJS building blocks
    document/      # AbstractDocument (Mongoose base schema with _id + timestamps)
    repository/    # AbstractRepository<T> with standard CRUD + aggregate helpers
    guards/        # AuthGuard (JWT Bearer)
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
- **Videos**: `VideoUploadStrategy` interface implemented by `VimeoVideoUploadStrategy`, `CloudinaryVideoUploadStrategy`, and `MulterVideoUploadStrategy`.

The `/api/webhook` route receives raw body (`express.raw`) to support Stripe webhook signature verification; body-parser JSON limit is 100 MB globally.

### Authentication flow

`AuthGuard` (`src/common/guards/auth.guard.ts`) validates JWT Bearer tokens and attaches the decoded payload to `request['user']`. Protected routes use `@UseGuards(AuthGuard)`. Signup automatically creates a Stripe customer via `StripeCustomerService`.

### Data hierarchy

Course → Section → Lesson (one-to-many at each level). A `Teacher` document is separate from `User` and is linked to a `Course`. Comments can be attached to either a course or a lesson (`source` discriminator field).
