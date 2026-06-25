import { getAllPresets } from '../dist/catalog/presets.js';
import { scrapeSpotifyFromLink } from '../dist/spotify/scraper.js';
import { ScrapeError } from '../dist/spotify/scraper.js';

async function testPreset(preset) {
  const start = Date.now();
  try {
    const result = await scrapeSpotifyFromLink(preset.url, 'preset-test');
    const ms = Date.now() - start;
    return {
      id: preset.id,
      name: preset.name,
      ok: true,
      tracks: result.tracks.length,
      sourceName: result.sourceName,
      truncated: result.truncated ?? false,
      ms,
    };
  } catch (e) {
    const ms = Date.now() - start;
    const message = e instanceof ScrapeError ? e.message : e instanceof Error ? e.message : String(e);
    return { id: preset.id, name: preset.name, ok: false, error: message, ms };
  }
}

async function main() {
  const presets = getAllPresets();
  console.log(`Testing ${presets.length} presets...\n`);

  for (const preset of presets) {
    const result = await testPreset(preset);
    if (result.ok) {
      console.log(
        `OK  ${result.id.padEnd(20)} ${String(result.tracks).padStart(4)} tracks${result.truncated ? ' (truncated)' : ''}  ${result.ms}ms  ${result.sourceName}`,
      );
    } else {
      console.log(`FAIL ${result.id.padEnd(20)} ${result.error}  (${result.ms}ms)`);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
