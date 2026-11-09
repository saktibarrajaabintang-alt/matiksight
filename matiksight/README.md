# MatikSight frontend

## Local development

1. Start PostgreSQL and the backend using the instructions in
   [`backend/SETUP_GUIDE.md`](../backend/SETUP_GUIDE.md). The backend listens on
   `http://localhost:3000`.
2. Apply pending migrations to the intended development database from
   `backend` with `npm run prisma:deploy`.
3. Copy `.env.example` to `.env.local` if you need to change the API origin.
   The default is `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000`. The previous
   `NEXT_PUBLIC_API_URL` variable is still accepted for existing local setups.
4. Install frontend dependencies and run `npm run dev`. The frontend runs at
   `http://localhost:3001`; the backend `CORS_ORIGINS` must include that exact
   origin.

The UI registers and authenticates accounts through the backend. Dataset files,
preview rows, and saved visualizations are stored through API endpoints; only
display preferences and the selected dataset remain in browser storage. The
reports screen follows the frontend design and manages saved visualizations;
the separate saved-report API remains available in the backend but is not
surfaced in this UI. Upload accepts CSV, XLS, and XLSX files up to 20 MB.

## Validation

```sh
npm run lint
npm run build
```
