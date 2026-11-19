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

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Site search

The header search opens `/search`. Results show documents and forms first, then
pages and sections, then matches in general page copy. District results open the
matching card in the district directory.

MiniSearch indexes localized public page copy and document metadata from the
existing Google Drive catalogs. Searchable document fields include titles,
descriptions, and categories. File contents and scanned text are outside the
index. Document previews and downloads use the existing file-access workflow,
including password checks.

## Deploy to Cloudflare

Deploy the application with the repository script:

```bash
pnpm deploy:production
```

This builds the OpenNext Worker, applies all pending production D1 migrations,
and deploys the Worker in that order. Do not run `pnpm deploy` or `wrangler
deploy` directly: the former invokes pnpm's unrelated workspace command, while
the latter bypasses migrations and can deploy code against an outdated schema.

Before or after a production deploy, confirm that no migrations remain pending:

```bash
pnpm exec wrangler d1 migrations list DB --remote
```
