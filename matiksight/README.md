This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3001](http://localhost:3001) with your browser to see the result. Port `3000` is reserved for the backend API.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Backend integration

The frontend uses the NestJS API from the `backend` branch. Set `NEXT_PUBLIC_API_BASE_URL` to the backend origin (default `http://localhost:3000`) in `matiksight/.env.local`; do not put credentials in this public variable. The backend must allow the frontend origin in `CORS_ORIGINS`. The frontend development server runs on port `3001` to match the backend branch's example CORS origin.

Authentication uses the backend's one-hour bearer JWT. The access token is kept in session storage unless “Ingat saya” is selected, in which case it is kept in local storage. Dataset records, previews, profile data, visualizations, and deletions are fetched from the API; only UI preferences and the selected dataset ID are stored locally. Existing workspace data in older local-storage keys is left untouched and is not treated as server data.

CSV, XLSX, and XLS uploads are sent to `POST /datasets` and processed by the backend. Excel files use the first worksheet. The image option remains visible, but photo-to-dataset upload is unavailable because the dataset endpoint accepts only CSV/XLSX/XLS and OCR is not implemented. Dataset lists, paginated previews, deletions, chart data, aggregation, and saved visualizations use their corresponding backend endpoints. The reports screen lists saved visualizations; the separate saved-report API does not currently have a matching create/edit workflow in this UI.

### Run the backend and frontend

The backend implementation is on a separate branch. Keep it in a second worktree so the frontend branch can remain checked out:

```bash
git worktree add ../matiksight-backend backend
cd ../matiksight-backend/backend
npm install
npm run prisma:generate
# Configure backend/.env with the PostgreSQL URL and a private JWT_SECRET first.
npm run prisma:deploy
npm run start:dev
```

`prisma:deploy` applies the committed migrations and does not reset the database. It is still pending until explicitly run against a configured PostgreSQL database.

In another terminal, from the frontend worktree:

```bash
cd matiksight
cp api.env.example .env.local
# Set NEXT_PUBLIC_API_BASE_URL=http://localhost:3000 in .env.local if the API uses another origin.
npm install
npm run dev
```

The frontend can also be started without `.env.local` when the backend is at `http://localhost:3000`.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
