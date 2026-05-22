# Dyslexia Flashcards App Tasks

- `[x]` **Phase 1: Project & Backend Initialization**
  - `[x]` Create project directory `/Users/alokkulkarni/Documents/Development/dyslexia-app`.
  - `[x]` Initialize AWS Serverless Application Model (SAM) project for the backend.
  - `[x]` Define DynamoDB tables (Users, Flashcards) and S3 buckets in `template.yaml`.
  - `[x]` Create Lambda function for Document Upload & Bedrock Invocation.
  - `[x]` Set up Amazon Cognito User Pool in SAM for authentication.

- `[x]` **Phase 2: Frontend Initialization**
  - `[x]` Scaffold React Vite application.
  - `[x]` Setup accessibility-first CSS system (OpenDyslexic font, high contrast colors).
  - `[x]` Implement Cognito authentication flow (Sign Up / Sign In).

- `[x]` **Phase 3: Core Features Development**
  - `[x]` Build Document Upload component (Presigned URL + S3 Vectorization logic).
  - `[x]` Build Flashcard Viewer with animations (flip, swipe).
  - `[x]` Implement Text-to-Speech (using Web Speech API).
  - `[x]` Implement Gamification System (Points, Streaks, Avatars UI).

- `[ ]` **Phase 4: Integration & Polish**
  - `[ ]` Connect Frontend to API Gateway endpoints (Awaiting SAM Deploy).
  - `[ ]` Test end-to-end flow (Awaiting SAM Deploy).
  - `[x]` Add premium styling touches and micro-animations.
