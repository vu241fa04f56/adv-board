# OneNote Large-PDF Final Upgrade

## Included
- Real-time Google Drive transfer meter: percent, transferred, remaining, speed, ETA.
- 32 MiB resumable Google Drive uploads for fewer round trips on 500 MB+ files.
- 16 MiB IndexedDB PDF blocks.
- 2-3 concurrent HTTP Range downloads for faster Drive imports while keeping memory bounded.
- Source PDF Drive IDs are persisted so unchanged source PDFs are not re-uploaded on every Save/Sync.
- Single untouched imported PDFs use a direct source-to-Drive sync path and skip the expensive 3000-page raster export.
- 3000+ page virtualized document rendering remains limited to a small visible window.
- Modern glass/3D UI treatment and a single transfer surface.
- Redundant Import PDF / Manage Pages / Drive-open sidebar action buttons were removed; the header is the primary action surface.

## Local setup
1. Create `.env` from `.env.example`.
2. Run `npm install`.
3. Run `npm run dev`.

## Validation
- TypeScript/TSX syntax parsing passed for all modified files.
- Full dependency build was not run in the packaging sandbox because the provided node_modules was incomplete and package downloads were unavailable. Run `npm install` and then `npm run lint` / `npm run build` locally before deployment.

## Security
- No `.env`, Google secret, or JWT secret is included in this ZIP.
