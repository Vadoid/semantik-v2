# Semantik

`Semantik` is a high-performance **Semantic Layer Builder** and **SQL Insight Engine** for Google Cloud BigQuery. Designed for power users and business analysts, it bridges the gap between raw data and actionable insights using AI.

## Recent Updates & Optimizations

We have recently deployed major performance and stability improvements:

-   **🚀 Optimized Metadata Fetching**: Switched from N+1 API calls to a single `INFORMATION_SCHEMA` query for table listing, drastically reducing load times for large datasets.
-   **⚡ Reduced Latency**: Eliminated redundant token validation checks, shaving off 100-300ms per BigQuery request.
-   **🔢 BigInt Support**: Implemented efficient, native-like serialization for BigQuery `INT64` types to handle massive numbers without precision loss or double-serialization overhead.
-   **🛡️ Type Safety**: Resolved all TypeScript errors (implicit any, component props) and enforced strict type checking (`npm run typecheck`).
-   **✅ Comprehensive Testing**: Added a robust unit testing suite using Vitest to ensure reliability of core logic and utility functions.
-   **✅ Comprehensive Testing**: Added a robust unit testing suite using Vitest to ensure reliability of core logic and utility functions.

## 🌟 Key Features

### 🧠 Semantic Layer Builder
Turn complex data relationships into clear, manageable views without writing a single line of JOIN code.
-   **Visual Modeling**: Drag-and-drop tables onto an infinite canvas to build your data model visually.
-   **AI-Assisted Relationships**: Click "Suggest Joins" to let Gemini 1.5 Pro analyze your schemas and propose logical connections (Foreign Keys, Common Columns) automatically.
-   **One-Click SQL Generation**: Converting your visual diagram into a production-ready BigQuery `CREATE VIEW` statement with optimized JOINs and column selections.

### ⚡ AI-Powered Query Editor
A professional-grade SQL environment designed for BigQuery power users.
-   **Intelligent Auto-Completion**: Powered by Monaco Editor (VS Code engine) for robust syntax highlighting.
-   **Real-Time Cost Estimation**: "Dry Run" logic runs automatically as you type, warning you of query costs (bytes billed) *before* you execute.
-   **AI Optimizer**: The "Improve with AI" agent analyzes your query for performance bottlenecks and suggests cost-saving optimizations or readability improvements in real-time.

### 🔎 Interactive Schema Explorer
-   **Hybrid Metadata Engine**: Instantly load thousands of tables using `INFORMATION_SCHEMA` acceleration.
-   **Deep Inspection**: View detailed partition info, clustering data, and row counts at a glance.
-   **Context-Aware**: Drag tables directly from the sidebar into the SQL Editor or Semantic Layer to start working immediately.
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

To run this project locally, you will need to configure a Google Cloud project with OAuth 2.0.

### 1. Google Cloud Project Setup

1.  **Select Project**: Use your Google Cloud Project ID.
2.  **Enable APIs**:
    *   BigQuery API
    *   Cloud Resource Manager API
    *   IAM API
3.  **Configure OAuth 2.0**:
    *   Go to **APIs & Services > Credentials**.
    *   Click **+ CREATE CREDENTIALS** -> **OAuth client ID**.
    *   Type: **Web application**.
    *   **Authorized Redirect URIs**: `http://localhost:9002/api/auth/callback`
    *   Save your `Client ID` and `Client Secret`.

### 2. Environment Variables

Create `.env` (or `.env.local`):

```dotenv
# Google Auth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
NEXT_PUBLIC_BASE_URL=http://localhost:9002

# Genkit
GEMINI_API_KEY=your-key
```

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

This will start the Next.js application, typically available at `http://localhost:9002`.

Open [http://localhost:9002](http://localhost:9002) in your browser to see the application. You should be prompted to log in with your Google account.

### 6. Testing

**Unit Tests**:
Run the Vitest unit test suite (including new AI flow tests):

```bash
npm test
```

**Type Checking**:
Verify TypeScript types across the entire project:

```bash
npm run typecheck
```

This project uses [Vitest](https://vitest.dev/) for unit testing. Tests are located alongside the source files (e.g., `src/ai/flows/__tests__/*.test.ts`).


