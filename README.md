# Levo Applicaton Schema API

A Node.js API and command-line tool for uploading, versioning, and retrieving API schemas. This project provides a robust system for managing API specifications, inspired by the CI/CD workflows used in modern API testing tools.

## About The Project

This project builds a persistent, versioned storage system for OpenAPI schemas. It lets developers upload new schema versions, retrieve past versions, and view all available versions—similar to the core infrastructure used in automated pen-testing tools like Levo.ai

Problem Statement: https://doc.clickup.com/10505733/d/h/a0kg5-661/f845f8c6bd3c8f4

---

## Project Demo Video : https://drive.google.com/file/d/1ubbAVC6bRKlRiX51pZipnBlA9KXHYBod/view?usp=sharing

---
## Tech Stack

* **Backend**: Node.js, Express.js, TypeScript
* **Database**: SQLite (`better-sqlite3`)
* **CLI**: `yargs` (for cli implementation)
* **Testing**: Jest, Supertest

---


## Installation & Setup

1.  **Install NPM packages**:
    ```bash
    npm install
    ```

2.  **Run the development server**:
    ```bash
    npm run dev
    ```
    The API will now be running on `http://localhost:3000`.

---

## Complete Walkthrough

This guide will walk you through a complete scenario for an application named `e-commerce-platform`.

### Step 1: Uploading Schemas (Versioning in Action)

The `import` command uploads a schema. If a schema for the given application/service already exists, this will create a new, incremented version, preserving the old one.

**A. Upload Version 1 for the main application**
This schema represents the main API for the entire platform.

* **Using the CLI:**
    ```bash
    npx ts-node levo.ts import --spec ./openapi.yaml --application e-commerce-platform
    ```
    *You will see a success message with `"version": 1`.*

* **Using `curl`:**
    ```bash
    curl -F "file=@./openapi.yaml" -F "application=e-commerce-platform" http://localhost:3000/upload
    ```

**B. Upload Version 2 for the main application**
Now, let's say you've updated the main API. Uploading the same file again creates a new version.

* **Using the CLI:**
    ```bash
    npx ts-node levo.ts import --spec ./openapi.yaml --application e-commerce-platform
    ```
    *You will see a success message with `"version": 2`.*

* **Using `curl`:**
    ```bash
    curl -F "file=@./openapi.yaml" -F "application=e-commerce-platform" http://localhost:3000/upload
    ```

**C. Upload Version 1 for a specific `payment-service`**
This schema is only for the payment service within the e-commerce platform.

* **Using the CLI:**
    ```bash
    npx ts-node levo.ts import --spec ./payment.json --application e-commerce-platform --service payment-service
    ```
    *(Note: We can create a dummy `payment.json` file for this example.)*

* **Using `curl`:**
    ```bash
    curl -F "file=@./payment.json" -F "application=e-commerce-platform" -F "service=payment-service" http://localhost:3000/upload
    ```

### Step 2: Listing All Available Versions

The `GET /schema/versions` endpoint allows you to see all historical versions for an application or service.

**A. List versions for the main application**

* **Using `curl`:**
    ```bash
    curl "http://localhost:3000/schema/versions?application=e-commerce-platform"
    ```
    *This will return a list containing both version 2 and version 1.*

**B. List versions for the `payment-service`**

* **Using `curl`:**
    ```bash
    curl "http://localhost:3000/schema/versions?application=e-commerce-platform&service=payment-service"
    ```
    *This will return a list containing only version 1 for the payment service.*

### Step 3: Retrieving a Specific Schema

The `get` command retrieves a schema's full content and metadata.

**A. Get the LATEST version for the main application**
This will retrieve version 2, as it was the last one uploaded.

* **Using the CLI:**
    ```bash
    npx ts-node levo.ts get --application e-commerce-platform
    ```

* **Using `curl`:**
    ```bash
    # You can specify 'latest' or omit the version parameter entirely
    curl "http://localhost:3000/schema?application=e-commerce-platform&version=latest"
    ```

**B. Get an OLDER version for the main application**
Let's retrieve the original version 1.

* **Using the CLI:**
    ```bash
    npx ts-node levo.ts get --application e-commerce-platform --schema-version 1
    ```

* **Using `curl`:**
    ```bash
    curl "http://localhost:3000/schema?application=e-commerce-platform&version=1"
    ```

**C. Get the LATEST version for the `payment-service`**

* **Using the CLI:**
    ```bash
    npx ts-node levo.ts get --application e-commerce-platform --service payment-service
    ```

* **Using `curl`:**
    ```bash
    curl "http://localhost:3000/schema?application=e-commerce-platform&service=payment-service"
    ```

---

## Testing

Have added automated tests to ensure the API's functionality and reliability.

* **Run all tests:**
    ```bash
    npm test
    ```

---

## Code Quality

Code style is enforced by ESLint and Prettier to ensure consistency and readability.

* **Run the linter:**
    ```bash
    npm run lint
    ```
