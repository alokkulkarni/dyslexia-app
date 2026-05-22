# Dyslexia Flashcards App - Implementation Plan

This plan details the architecture and development phases for a serverless, gamified web application designed to help individuals with dyslexia (ages 6-18) learn by generating flashcards from uploaded documents using Amazon Bedrock.

## User Review Required

> [!IMPORTANT]
> **AWS Environment Setup**: This architecture requires an active AWS account. We will be provisioning resources like S3, CloudFront, API Gateway, Lambda, and DynamoDB. 
> You will also need to manually request access to specific Foundation Models within the Amazon Bedrock console (I recommend Anthropic Claude 3 Haiku for the best balance of quality, speed, and cost).

## Approved Requirements

- **Authentication:** Amazon Cognito will be used for user sign-in and progress saving.
- **Gamification:** Will include points for creating/reviewing cards, unlocking avatars, and daily streaks.
- **Framework:** React via Vite will be used for the frontend.
- **Dyslexia Accommodations:** UI will feature OpenDyslexic font support, specific color contrasts, and text-to-speech capabilities.

## Document Upload & Vectorization (Open Questions)

> [!WARNING]
> You mentioned vectorizing the document in S3 before passing it to the model. S3 is only for storage, so vectorization requires a Vector Database. We have two options for this:
> 
> **Option A: Amazon Bedrock Knowledge Bases (Fully Managed RAG)**
> S3 documents are automatically chunked and vectorized into an Amazon OpenSearch Serverless vector store. The model then queries this vector store to create flashcards.
> *Pros*: Highly scalable, handles massive documents natively.
> *Cons*: OpenSearch Serverless has a base cost of ~$150/month even when idle, which conflicts with keeping costs strictly low.
> 
> **Option B: Serverless In-Memory Processing (Recommended for low cost)**
> The user uploads the document to S3. A Lambda function triggers, downloads the document, extracts the text, splits it into chunks, and passes those chunks directly to the Bedrock Converse API to generate flashcards.
> *Pros*: True serverless (pay exactly $0 when idle), keeps costs extremely low.
> *Cons*: Less suited for massive textbooks (1000+ pages) without additional orchestration.
> 
> **Which option would you prefer for the vectorization/document processing?**

## Proposed Architecture

### Frontend (Web App)
- **Framework:** React with Vite.
- **Styling:** Vanilla CSS focusing on a rich, accessible aesthetic. We will use dynamic micro-animations for gamification and ensure high readability.
- **Hosting:** Amazon S3 bucket configured for static website hosting, distributed globally via Amazon CloudFront for low latency and high scalability.

### Backend (Serverless AWS)
- **API Gateway:** Provides secure REST API endpoints for the frontend to communicate with the backend.
- **API Gateway:** Provides secure REST API endpoints for the frontend to communicate with the backend.
- **AWS Lambda:** Serverless compute to execute logic (e.g., generating S3 presigned URLs, handling document parsing, triggering AI generation).
- **Amazon S3 (Document Uploads):** The frontend will request a presigned URL from API Gateway/Lambda and upload the document securely and directly to S3.
- **Amazon DynamoDB:** A highly scalable NoSQL database to store user profiles, gamification points, and generated flashcards.
- **Amazon Bedrock:** The core AI engine. Depending on the vectorization choice (Option A or B), we will either use the `RetrieveAndGenerate` API (Knowledge Bases) or the `Converse` API to process the document text and generate flashcards.

## Cost Optimization Strategy

To ensure the solution is scalable without incurring high model costs:
1. **Model Selection:** Use a fast, low-cost model like Claude 3 Haiku on Bedrock.
2. **Prompt Engineering:** Structure prompts to strictly return JSON without conversational filler, minimizing output tokens. Adjust complexity based on age range (e.g., simpler extraction for ages 6-10, more complex conceptual extraction for 11-18).
3. **Text Pre-processing:** If a user uploads a large document, we will chunk it and only process the most relevant sections or limit the number of cards generated per request.
4. **Caching:** Save all generated flashcards to DynamoDB. If a user wants to review the same document or deck, it's served from the database (pennies per million reads) rather than invoking Bedrock again.
5. **Serverless Infrastructure:** Lambda, API Gateway, and DynamoDB are pay-per-use and scale automatically, ensuring zero cost when idle.

## Proposed Implementation Steps

### Phase 1: AWS Infrastructure Setup & Backend Foundation
- Initialize a local project directory: `/Users/alokkulkarni/Documents/Development/dyslexia-app`.
- Set up an AWS Serverless Application Model (SAM) or AWS CDK project to define the infrastructure as code.
- Provision DynamoDB tables, S3 buckets, and API Gateway.
- Develop the core Lambda function to handle Bedrock Converse API integration.

### Phase 2: Frontend Development & UI Design
- Scaffold the Vite React application.
- Implement the design system (CSS variables, accessible fonts, gamification styling tokens).
- Build the document upload component.
- Build the interactive flashcard viewer (with flip animations, swipe interactions, and gamification feedback like point popups).

### Phase 3: Integration & Testing
- Connect the React frontend to the API Gateway.
- Implement the end-to-end flow: Upload Document -> Lambda -> Bedrock -> Lambda -> DynamoDB -> Frontend.
- Refine Bedrock prompts based on testing to ensure high educational quality for dyslexic users.

## Verification Plan

### Automated/Manual Testing
- **Local Testing:** Test the frontend flow using mock data to ensure accessibility and gamification features work smoothly.
- **AWS Testing:** Deploy the backend to AWS and verify that document uploads correctly trigger Bedrock and store results in DynamoDB.
- **Performance/Cost Review:** Monitor Lambda execution times and Bedrock token usage during testing to ensure cost optimizations are effective.
