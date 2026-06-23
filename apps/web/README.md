# LimitWear Web

Next.js and TypeScript frontend for LimitWear.

## Environment

Copy the environment template:

```bash
cp .env.example .env.local
```

On PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Only public browser configuration may use the `NEXT_PUBLIC_` prefix. Never put
passwords, tokens, or private keys in frontend environment variables.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verification

```bash
npm run lint
npm run typecheck
npm run build
```
