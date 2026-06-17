import type { NormalizedTrack } from '@wemsic/shared';

export class TrackPool {
  private buckets = new Map<string, NormalizedTrack[]>();
  private usedIds = new Set<string>();

  constructor(tracks: NormalizedTrack[]) {
    const deduped = new Map<string, NormalizedTrack>();
    for (const t of tracks) {
      if (!deduped.has(t.spotifyTrackId)) {
        deduped.set(t.spotifyTrackId, t);
      }
    }
    for (const track of deduped.values()) {
      const bucket = this.buckets.get(track.contributedBy) ?? [];
      bucket.push(track);
      this.buckets.set(track.contributedBy, bucket);
    }
    for (const bucket of this.buckets.values()) {
      shuffle(bucket);
    }
  }

  pickNext(): NormalizedTrack | null {
    const candidates: Array<{ playerId: string; ratio: number }> = [];

    for (const [playerId, bucket] of this.buckets) {
      const available = bucket.filter((t) => !this.usedIds.has(t.spotifyTrackId));
      if (available.length === 0) continue;
      const usedFromPlayer = bucket.filter((t) =>
        this.usedIds.has(t.spotifyTrackId),
      ).length;
      candidates.push({ playerId, ratio: usedFromPlayer / bucket.length });
    }

    if (candidates.length === 0) return null;

    const minRatio = Math.min(...candidates.map((c) => c.ratio));
    const tied = candidates.filter((c) => c.ratio === minRatio);
    const playerId = tied[Math.floor(Math.random() * tied.length)]!.playerId;

    const bucket = this.buckets.get(playerId)!;
    const available = bucket.filter((t) => !this.usedIds.has(t.spotifyTrackId));
    const track = available[Math.floor(Math.random() * available.length)]!;
    this.usedIds.add(track.spotifyTrackId);
    return track;
  }

  getAllTracks(): NormalizedTrack[] {
    return [...this.buckets.values()].flat();
  }
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}
