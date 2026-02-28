# Contributing to Kinetic SQL

First off, thank you for considering contributing to Kinetic SQL!

The goal for this library is to be the fastest, most intuitive SQL engine for the Node.js ecosystem. To achieve this, we have to be ruthlessly protective of the core architecture and query latency.

Before you write any code, please read this guide to understand the engineering philosophy and how you can best contribute to the project.

## 🛡️ The Golden Rule: Plugins > Core Modifications

Kinetic SQL guarantees a **sub-4 ms query execution path**. Every `if` statement, array allocation, and closure inside the core `KineticClient` affects this benchmark.

Because of this, **I humbly request to be highly resistant to adding new features directly to the core engine** (Except the upcoming native MSSQL support I am currently working on).

If you want to add custom behavior – such as APM tracing, query logging, Redis caching, or data masking – **do not modify the core execution path**. Instead, build an Official Plugin using our [Middleware API](../README.md#uplugins-middleware-apiu-)

## <u>How You Can Contribute</u> 💡

I am looking for contributions in three main areas:

### 1. Building Ecosystem Plugins (Highly Encouraged)

It would be great to grow the `kinetic-sql` plugin ecosystem! 

To maintain the core high-speed performance, **third-party plugins will not be merged directly into the core repository.** Instead, the **Kinetic SQL** ecosystem relies on standalone NPM packages powered by the **Middleware API**.

Here is how you can contribute and get your plugin linked to the Ecosystem:

* **Build Independently:** Create and publish your custom middleware plugin as its own separate NPM package (e.g., `kinetic-sql-logger` or `kinetic-apm-tracer`).
* **Get your plugin listed on the main repository:** Submit a Pull Request to the repository updating the `README.md` and official documentation. I would be more than happy to add your repository and NPM link to the **"Ecosystem & Plugins"** list to advertise your hard work
  to the community!

### 2. Core Latency Optimizations

If you find a way to shave microseconds off the V8 execution path, optimize memory allocation, or improve the database driver bridging, I would love to see those PRs. Please include benchmarking data in your pull request.

### 3. Framework Adapters

Library currently has a native NestJS module (`KineticModule`). It would be great to have more of the clean, zero-dependency adapters for other frameworks (e.g., SvelteKit).

### 4. Bug Fixes

If you find a bug in the type generator, the schema parser, or the core execution flow, please open an issue first to discuss the proposed fix before writing the code.

## 🛠️ Local Development Setup

1. **Fork the repository** and clone it locally.
2. **Install dependencies:**
   ```bash
   npm install
    ```
3. **Run the test suite:** Make sure all existing tests pass before you start developing
    ```bash
   npm run test
    ```
4. **Lint your code:** Linting is enforced to maintain codebase consistency.
    ```bash
   npm run lint
    ```
## ✅ Pull Request Process

1. **Keep it small:** Smaller PRs make it easier to understand the changes and are quick to review.
2. **Write tests:** If you fix a bug, please add a test that prevents it from happening again. If you add an adapter, include unit tests.
3. **Use the PR Template:** When you open a PR, GitHub will automatically provide a checklist. Please fill it out. Incomplete PRs will be closed automatically to save bandwidth.

Thank you for helping me make database interactions in Node.js blazingly fast!
