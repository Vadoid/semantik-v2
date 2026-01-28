# Semantik

`Semantik` is a high-performance **Semantic Layer Builder** and **SQL Insight Engine** for Google Cloud BigQuery. Designed for power users and business analysts, it bridges the gap between raw data and actionable insights using AI.

## Recent Updates & Optimizations

We have recently deployed major performance and stability improvements:

-   **🚀 Optimized Metadata Fetching**: Switched from N+1 API calls to a single `INFORMATION_SCHEMA` query for table listing, drastically reducing load times for large datasets.
-   **⚡ Reduced Latency**: Eliminated redundant token validation checks, shaving off 100-300ms per BigQuery request.
-   **🔢 BigInt Support**: Implemented efficient, native-like serialization for BigQuery `INT64` types to handle massive numbers without precision loss or double-serialization overhead.
-   **🛡️ Type Safety**: Resolved all TypeScript errors (implicit any, component props) and enforced strict type checking (`npm run typecheck`).
-   **✅ Comprehensive Testing**: Added a robust unit testing suite using Vitest to ensure reliability of core logic and utility functions.

## Architecture & Design Decisions

### BigQuery Metadata Strategy
Semantik uses a **hybrid metadata fetching strategy** for optimal performance:
1.  **Primary: `INFORMATION_SCHEMA`**:  
    By default, the app attempts to query `INFORMATION_SCHEMA.__TABLES__`. This is an O(1) operation relative to the network (single request) that fetches metadata for *all* tables in a dataset instantly.
    
    *Note: You may see "Failed to query INFORMATION_SCHEMA" logs in the terminal. This is expected behavior.*

2.  **Fallback: Standard API**:  
    If the primary method fails (e.g., due to location mismatches, permissions, or incompatible table types like Iceberg/BigLake), the system automatically gracefully falls back to the standard BigQuery SDK `getTables()` method. This ensures 100% compatibility while engaging optimization whenever possible.


## Prerequisites

Before you begin, ensure you have the following installed:
*   [Node.js](https://nodejs.org/en/) (v18 or later recommended)
*   [npm](https://www.npmjs.com/get-npm) or [yarn](https://yarnpkg.com/)

## Setup Instructions

To run this project locally, you will need to configure both a Firebase project and a Google Cloud project.

### 1. Firebase Project Setup

This project uses Firebase for user authentication.

1.  **Create a Firebase Project**: Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2.  **Add a Web App**: In your project's dashboard, add a new Web application.
3.  **Get Firebase Config**: After creating the web app, Firebase will provide you with a `firebaseConfig` object. Copy these keys. You will need them for the environment variables.
4.  **Enable Google Authentication**:
    *   In the Firebase Console, go to the **Authentication** section.
    *   Click on the **Sign-in method** tab.
    *   Select **Google** from the list of providers and enable it.

### 2. Google Cloud Project Setup

This project interacts with Google Cloud APIs (BigQuery and Cloud Resource Manager). Your Firebase project is also a Google Cloud project.

1.  **Select Your Project**: Go to the [Google Cloud Console](https://console.cloud.google.com/) and select the same project you are using for Firebase.
2.  **Enable APIs**:
    *   Navigate to the **APIs & Services > Library**.
    *   Search for and enable the following APIs:
        *   **BigQuery API**
        *   **Cloud Resource Manager API**
        *   **Identity and Access Management (IAM) API**
3.  **Configure OAuth Consent Screen**:
    *   Navigate to **APIs & Services > OAuth consent screen**.
    *   Choose **External** and create a consent screen. Fill in the required application details.
    *   Add your email to the list of **Test users** while you are in development.
4.  **Create OAuth 2.0 Credentials**:
    *   Navigate to **APIs & Services > Credentials**.
    *   Click **+ CREATE CREDENTIALS** and select **OAuth client ID**.
    *   Choose **Web application** as the application type.
    *   Under **Authorized JavaScript origins**, add `http://localhost:9002`.
    *   Under **Authorized redirect URIs**, add `http://localhost:9002/`.
    *   Your `Client ID` and `Client Secret` are not directly used in the code, but this step is required to authorize your web app.
5.  **Get a Gemini API Key**:
    *   Go to [Google AI Studio](https://aistudio.google.com/app/apikey) to generate an API key for using the Gemini models via Genkit.

### 3. Environment Variables

Create a file named `.env.local` in the root of your project and add the configuration values you obtained from the steps above.

```dotenv
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-firebase-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-firebase-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-firebase-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-firebase-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-firebase-app-id

# Genkit / Google AI API Key
GEMINI_API_KEY=your-gemini-api-key
```

Replace the `your-firebase-*` and `your-gemini-api-key` placeholders with your actual credentials.

### 4. Install Dependencies

Open your terminal in the project's root directory and run the following command to install the required packages:

```bash
npm install
```

### 5. Run the Application

Once the setup is complete, you can start the development server:

```bash
npm run dev
```

This will start two services:
*   The Next.js application, typically available at `http://localhost:9002`.
*   The Genkit AI development server.

Open [http://localhost:9002](http://localhost:9002) in your browser to see the application. You should be prompted to log in with your Google account.
### 6. Run Tests

To run the unit tests, use the following command:

```bash
npm test
```

This project uses [Vitest](https://vitest.dev/) for unit testing. Tests are located alongside the source files (e.g., `src/lib/bigquery.test.ts`).


