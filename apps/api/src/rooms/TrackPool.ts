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
    const playerIds = [...this.buckets.keys()].filter((id) => {
      const bucket = this.buckets.get(id)!;
      return bucket.some((t) => !this.usedIds.has(t.spotifyTrackId));
    });
    if (playerIds.length === 0) return null;

    const playerId = playerIds[Math.floor(Math.random() * playerIds.length)]!;
    const bucket = this.buckets.get(playerId)!;
    const available = bucket.filter((t) => !this.usedIds.has(t.spotifyTrackId));
    if (available.length === 0) return this.pickNext();

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
