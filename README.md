# Synsite Website

A premium, high-performance website for Synsite, featuring a deep royal purple theme, glassmorphism design, and smooth animations.

## Setup

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Run Development Server**:
    ```bash
    npm run dev
    ```

3.  **Build for Production**:
    ```bash
    npm run build
    ```

## Convex Database Setup

To integrate the Convex backend database:

1. **Configure & Link Convex**:
   Run the following command in your terminal to log in to Convex and configure a new or existing project:
   ```bash
   npm run convex:dev
   ```
   Follow the interactive prompts in the terminal to log in and select/create a project. Once successfully linked, this command will automatically generate:
   - A `.env.local` file containing the `VITE_CONVEX_URL` environment variable.
   - The type-safe database query/mutation client files inside `convex/_generated/`.

2. **Running Local Frontend with Convex**:
   Keep `npm run convex:dev` running in one terminal (it pushes database functions to Convex and watches files for changes). Then, start your Vite frontend dev server in another terminal:
   ```bash
   npm run dev
   ```

3. **Production Deployment**:
   To deploy the database schema and backend functions to production, run:
   ```bash
   npm run convex:deploy
   ```

## Features

-   **Glassmorphism Identity**: Translucent panels, deep purple glows.
-   **Custom Cursor**: Interactive cursor with trailing glow.
-   **Scroll Animations**: Elements fade in and slide up on scroll.
-   **Interactive Form**: "SynPreview" demo request system.
-   **Responsive**: Optimized for all devices.
