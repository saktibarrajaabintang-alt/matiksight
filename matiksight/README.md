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

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Dataset processing

CSV, XLS, and XLSX files are parsed in the browser by `lib/spreadsheet-utils.ts`. Workbook uploads expose their available sheets, and the selected sheet's original headers and values drive the preview, profile, and visualizations. Parsed datasets are kept in the local workspace store so they remain available while navigating the application.

There are no dataset API routes in this project. Uploads are not sent to a server; connect a typed service to the actual backend contract when one is available rather than treating local data as a server response.

Successfully parsed spreadsheet datasets also create dynamic entries under Google Ads. Labels come from each filename, and distinct datasets with the same label receive separate numbered entries. Re-uploading the same file and parsed content reuses the existing workspace dataset; deleting a dataset removes its navigation entry. Each entry opens the shared visualization experience scoped to that dataset, including its dynamic profile summaries, chart recommendations, and data preview.

The current frontend has no AI insight endpoint, so these dataset pages show existing locally computed statistical insights rather than backend-generated AI content.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
