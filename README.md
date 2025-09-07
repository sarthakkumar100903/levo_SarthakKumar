# Schema Versioning API

This project provides a simple yet powerful API for uploading, versioning, and retrieving OpenAPI schemas. It's designed to mimic a core piece of functionality for a CI/CD-based API testing tool.

## Tech Stack

-   **Backend**: Node.js, Express.js, TypeScript
-   **Database**: SQLite (using `better-sqlite3`)
-   **File Handling**: `multer` for multipart/form-data
-   **Testing**: Jest & Supertest
-   **CLI Tool**: `yargs`

---

## Getting Started

### Prerequisites

-   Node.js (v20.x or higher recommended)
-   npm

### Setup

1.  **Clone the repository** (if applicable)

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Run the development server**:
    ```bash
    npm run dev
    ```
    The server will start on `http://localhost:3000` and automatically restart when you make changes.

---

## API Endpoints

### 1. Upload a Schema

Uploads a schema file and creates a new version for the specified application/service.

-   **Endpoint**: `POST /upload`
-   **Method**: `POST`
-   **Content-Type**: `multipart/form-data`

**Parameters**:
-   `file` (file, required): The OpenAPI spec file (`.json` or `.yaml`).
-   `application` (string, required): The name of the application.
-   `service` (string, optional): The name of the service within the application.

**Example `curl`**:
```bash
curl -F "file=@./openapi.yaml" -F "application=ecom" -F "service=checkout" http://localhost:3000/upload