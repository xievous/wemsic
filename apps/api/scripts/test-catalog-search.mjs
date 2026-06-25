import { searchCatalog } from '../dist/catalog/search.js';

async function main() {
  const results = await searchCatalog('disney');
  console.log(`Found ${results.length} results:\n`);
  for (const r of results) {
    console.log(
      `[${r.source}] ${r.name}${r.trackCount != null ? ` (${r.trackCount} tracks)` : ''}`,
    );
    if (r.description) console.log(`  ${r.description}`);
    console.log(`  ${r.url}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
