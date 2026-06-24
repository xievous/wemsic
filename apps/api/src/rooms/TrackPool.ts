import type { NormalizedTrack } from '@wemsic/shared';

export class TrackPool {
  private buckets = new Map<string, NormalizedTrack[]>();
  private usedIds = new Set<string>();
  /** Rounds credited to each contributor (not inferred from used track ids). */
  private playedCount = new Map<string, number>();

  constructor(tracks: NormalizedTrack[]) {
    // Dedupe within each player's contribution only so overlapping tracks
    // across playlists still count toward every contributor's rotation.
    const byPlayer = new Map<string, Map<string, NormalizedTrack>>();
    for (const t of tracks) {
      let playerTracks = byPlayer.get(t.contributedBy);
      if (!playerTracks) {
        playerTracks = new Map();
        byPlayer.set(t.contributedBy, playerTracks);
      }
      if (!playerTracks.has(t.spotifyTrackId)) {
        playerTracks.set(t.spotifyTrackId, t);
      }
    }
    for (const [playerId, playerTracks] of byPlayer) {
      const bucket = [...playerTracks.values()];
      shuffle(bucket);
      this.buckets.set(playerId, bucket);
    }
  }

  pickNext(): NormalizedTrack | null {
    const candidates: Array<{ playerId: string; picks: number }> = [];

    for (const [playerId, bucket] of this.buckets) {
      const available = bucket.filter((t) => !this.usedIds.has(t.spotifyTrackId));
      if (available.length === 0) continue;
      candidates.push({ playerId, picks: this.playedCount.get(playerId) ?? 0 });
    }

    if (candidates.length === 0) return null;

    const minPicks = Math.min(...candidates.map((c) => c.picks));
    const tied = candidates.filter((c) => c.picks === minPicks);
    const playerId = tied[Math.floor(Math.random() * tied.length)]!.playerId;

    const bucket = this.buckets.get(playerId)!;
    const available = bucket.filter((t) => !this.usedIds.has(t.spotifyTrackId));
    const track = available[Math.floor(Math.random() * available.length)]!;
    this.usedIds.add(track.spotifyTrackId);
    this.playedCount.set(playerId, (this.playedCount.get(playerId) ?? 0) + 1);
    return track;
  }

  /** Return a picked track to the pool when it has no playable preview. */
  releaseTrack(trackId: string): void {
    if (!this.usedIds.delete(trackId)) return;
    for (const [playerId, bucket] of this.buckets) {
      if (!bucket.some((t) => t.spotifyTrackId === trackId)) continue;
      const count = this.playedCount.get(playerId) ?? 0;
      if (count > 0) this.playedCount.set(playerId, count - 1);
      break;
    }
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
