# Dyslexia Flashcards App - Scaffolding Walkthrough

The foundational scaffolding for the Dyslexia Flashcards application has been successfully completed! This includes both the serverless backend infrastructure definition and the accessible, gamified React frontend.

## 1. Backend Infrastructure (AWS SAM)

The backend has been designed around a scalable, pay-per-use serverless architecture to keep costs minimal:

- **SAM Template**: We've created a `template.yaml` defining:
  - An **Amazon DynamoDB** table (`FlashcardsTable`) to cache users' generated flashcards, saving on Bedrock API calls.
  - An **Amazon Cognito User Pool** to manage user authentication and save progress/streaks.
  - An **AWS Lambda Function** (`GenerateFlashcardsFunction`) integrated with API Gateway.
- **Bedrock Integration**: The Lambda function includes code to call `Anthropic Claude 3 Haiku` via the Bedrock Converse API. It uses dynamic prompting based on the age group to ensure the output is simple and educational.

## 2. Frontend Development (React + Vite)

The frontend is a lightning-fast React application built with Vite, emphasizing accessibility and gamification.

- **Accessibility First**:
  - Integrated the **OpenDyslexic** font from a CDN to immediately improve readability for users with dyslexia.
  - Defined high-contrast, glare-reducing CSS variables (e.g., an off-white background with very dark grey text).
  - Increased letter-spacing and line-height.
- **Gamification Elements**:
  - Created a visually rich "glassmorphism" design style for the UI components.
  - Added placeholders for a Daily Streak (🔥), Total Points (⭐), and an Avatar unlocking system.
  - Included CSS micro-animations (`animate-pop`) to make interactions feel rewarding.
- **Interactive Flashcards**:
  - Implemented a 3D-flipping flashcard component.
  - Integrated the **Web Speech API** for Text-to-Speech capabilities (the "🔊 Listen" buttons).

## Next Steps

We have successfully completed Phase 1 and Phase 2 (Initialization). The next steps would be:
1. Connect the frontend to the AWS Cognito User Pool for actual sign-in.
2. Implement the document upload logic (parsing PDF/text files).
3. Deploy the backend to AWS using SAM to get a live API endpoint.

> [!TIP]
> **View the Application**
> To see the UI in action, you can set your active workspace to the newly created directory and run the frontend development server:
> 
> ```bash
> cd /Users/alokkulkarni/Documents/Development/dyslexia-app/frontend
> npm run dev
> ```
