## Preact frontend

Our UI is built with **Preact + TypeScript** and bundled with **Vite**.

- **Language & stack**
  - **Language**: TypeScript
  - **View library**: `preact`
  - **Bundler/dev server**: `vite` via `@preact/preset-vite`.

- **Project layout & entry points**
  - **Entry**: `frontend/src/main.tsx` mounts `<App />` into the `#app` element.
  - **Routing**: `frontend/src/app.tsx` uses `LocationProvider`, `Router`, and `Route` from `preact-iso` to wire pages like `Home`, `Projects`, `About`, etc. These live in `frontend/src/pages`
  - **Shared UI** lives under `frontend/src/components/`.

- **Usage**
`cd frontend` first, then:
  - **Start dev server**: `npm run dev` (default Vite dev server on port 5173).
  - **Build for production**: `npm run build` → outputs to `frontend/dist` (this is what Firebase Hosting serves).
  - **Preview prod build**: `npm run preview`.

- **Tips & conventions**
  - **Routing**: Use `<Route path="/foo" component={FooPage} />` in `app.tsx`. Prefer **page components** for route-level concerns and **leaf components** in `components/` for reusable pieces.
  - **State**: Use `useState`/`useEffect` from `preact/hooks`. For cross-page state, keep it in Firestore or pass props down from route-level components.
  - **Styling**: We currently use vanilla CSS files under `frontend/src/css/` plus some Tailwind tooling; prefer **existing CSS files** for now instead of introducing a new styling system.
