# ⚛️ Webpack React 19 + TypeScript Starter

A modern, production-ready **React 19 + TypeScript** starter template powered by **Webpack 5**. Designed for rapid development with an emphasis on developer experience, robust production builds, and built-in deployment pipelines.

---

## ✨ Features

- **React 19 & TypeScript** — Latest React with full strict TypeScript support.
- **Webpack 5 Architecture** — Modularized configs (`common`, `dev`, `prod`) via `webpack-merge`.
- **Next-Gen Developer Experience (DX)**:
  - **Code Inspector**: Click any element in the browser to instantly open its source code in your editor.
  - **Path Aliasing**: Import cleanly using `@/` (e.g., `import Component from '@/components/Component'`).
  - **Typed CSS Modules**: Full autocomplete and type-safety for your `.module.css` files.
- **Advanced Environment Management**:
  - Build-time `.env` support with safe defaults (`dotenv-webpack`).
  - Runtime configuration injection (change variables without rebuilding!).
  - Compile-time globals (`__DEV__`, `__PROD__`, `__VERSION__`).
- **Production Ready Optimizations**:
  - Code obfuscation available out of the box to protect your source code.
  - Automatic vendor chunking and dead-code elimination (Terser).
  - CSS Minification and extraction.
  - Optional asset organization into separate folders (`js/`, `css/`, etc.).
- **Built-in Quality Control**:
  - Pre-configured ESLint (Flat Config) & Prettier.
  - Git Hooks (Husky + lint-staged) to enforce quality on commit.
  - Built-in Error Boundaries and Suspense Higher-Order Components (HOCs).
- **Automated CI/CD** — GitHub Actions workflow for zero-config GitHub Pages deployments.
- **Legacy Browser Support** — Babel setup with `core-js` polyfills targeting Chrome 49+, Firefox 52+, Safari 10+, Edge 14+.

---

## 📁 Folder Structure

```text
.
├── .babelrc / babel.config.json # Babel configs & polyfill targets
├── .env.defaults                # Fallback environment variables
├── .env.example                 # Example environment schema
├── eslint.config.mjs            # ESLint flat config
├── tsconfig.json                # TypeScript & path alias configs
├── webpack.config.*.ts          # Webpack configurations (common, dev, prod)
├── .github/workflows/deploy.yml # GitHub Pages automated deployment
├── scripts/                     # Utility scripts (Clean, ConfigWebpackPlugin)
└── src/
    ├── index.tsx                # App entry point
    ├── config.ts                # Runtime configuration
    ├── declarations.d.ts        # TypeScript typings
    ├── assets/                  # Static assets (fonts, images)
    ├── components/              # Reusable React components
    └── HOC/                     # Higher-Order Components (Error Boundary, etc.)
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 20 (recommended)
- **npm** ≥ 9

### Installation & Setup

1. **Clone and Install:**

   ```sh
   git clone <repository-url> webpack-templet
   cd webpack-templet
   npm install
   ```

2. **Environment Variables:**
   Copy the example environment file to `.env`:

   ```sh
   cp .env.example .env
   ```

3. **Start Development Server:**
   ```sh
   npm start
   ```
   Opens at [http://localhost:3000](http://localhost:3000) with Hot Module Replacement. **Bonus:** Hold `Alt/Option`/`Shift` and click on any UI element in the browser to instantly open the corresponding React component in your IDE!

---

## 📜 Available Scripts

| Command            | Description                                                          |
| ------------------ | -------------------------------------------------------------------- |
| `npm start`        | Start the dev server at `localhost:3000` with HMR and Code Inspector |
| `npm run dev:ssr`  | Start the dev server at `localhost:3000` with SSR + HMR              |
| `npm run build`    | Create an optimized production build in `dist/client/`                    |
| `npm run build:ssr`| Build client (`dist/client/`) and SSR server (`dist/server/`)        |
| `npm run start:ssr`| Run the production SSR server (`PORT`, default `3000`)               |
| `npm run preview`  | Preview the production build locally                                 |
| `npm run lint`     | Run ESLint across the project                                        |
| `npm run lint:fix` | Run ESLint and auto-fix issues                                       |
| `npm run clean`    | Reset `src/` to a minimal template (removes demo components & HOCs)  |
| `npm run prepare`  | Install Husky Git hooks (runs automatically after `npm install`)     |

> **Tip:** Running `npm run clean` is highly recommended if you are starting a fresh project from this template. It cleans up the boilerplate UI components.

---

## ⚙️ Configuration & Architecture

### 1. Environment Variables

Managed via `dotenv-webpack`.

| File            | Purpose                                                |
| --------------- | ------------------------------------------------------ |
| `.env`          | Your local overrides (git-ignored)                     |
| `.env.defaults` | Fallback values used when a key is missing from `.env` |
| `.env.example`  | Documents available keys — used as a safe schema       |

**Built-in Build-Time Variables:**
| Variable | Type | Description |
| -------------------- | --------- | ------------------------------------------------------------------------------------------------------------------ |
| `APP_NAME` | `string` | The name of the application. |
| `SEPERATE_FOLDERS` | `boolean` | If `true`, groups emitted assets into separate folders (`chunk/`, `css/`, `fonts/`, `images/`) inside `dist/client/`. |
| `WEBPACK_OBFUSCATOR` | `boolean` | If `true`, applies code obfuscation to the production JavaScript build (excluding vendor chunks). |

**Compile-Time Globals:**
Available in all files (injected via Webpack `DefinePlugin`):

- `__DEV__` (boolean)
- `__PROD__` (boolean)
- `__VERSION__` (string)
- `__BUILD_DATE__` (string)

**Runtime Configuration (`src/config.ts`):**
Values that need to change **without rebuilding** the app (e.g., API URLs changing per environment). This compiles to `config.js` and is injected into the `<head>`, meaning you can swap this single file on your server to change environments without redeploying.

### 2. Path Aliasing

No more `../../../components`. The project uses `@/` to map to the `src` directory automatically via `tsconfig.json` and Webpack resolve aliases.

```tsx
// Instead of this:
import Button from '../../components/Button';
// Do this:
import Button from '@/components/Button';
```

### 3. Typed CSS Modules

Any file named `*.module.css` or `*.module.scss` is treated as a CSS Module. Thanks to `typescript-plugin-css-modules` in `tsconfig.json`, your IDE will provide autocomplete for class names!

```tsx
import styles from './App.module.css';

// IDE will autocomplete `styles.container`
const App = () => <div className={styles.container}>Hello</div>;
```

### 4. Production Optimizations (`webpack.config.prod.ts`)

- **Vendor Splitting:** Each `node_modules` package gets its own chunk.
- **Minification:** Multi-pass Terser compression + CSS Minimizer.
- **Obfuscation:** Protect your source code using `WEBPACK_OBFUSCATOR`.
- **Bundle Analysis:** A visual report is automatically generated at `dist/client/report.html` on every build.

---

## 🧪 Linting & Formatting

The project ensures code quality using:

- **ESLint** (Flat config) for logic and React rules.
- **Prettier** for formatting.
- **Husky & lint-staged**: Hooks into `git commit` to automatically format and fix your staged files before they are committed.

---

## 🌐 Browser Targets

Configured in `babel.config.json` utilizing `@babel/preset-env` and `core-js 3` usage-based polyfills.

- Chrome ≥ 49
- Firefox ≥ 52
- Safari ≥ 10
- Edge ≥ 14

---

## 🚢 Deployment (GitHub Pages)

A GitHub Actions workflow (`.github/workflows/deploy.yml`) is included.

1. Go to your repository **Settings → Pages**.
2. Set **Source** to **GitHub Actions**.
3. Push to `main` — the workflow runs automatically, building and deploying your app!

---

## License

[ISC](LICENSE)
