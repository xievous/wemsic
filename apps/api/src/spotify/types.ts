export interface SpotifyTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface SpotifyPlaylistSummary {
  id: string;
  name: string;
  trackCount: number;
  imageUrl: string | null;
}

export interface SpotifyTrackRaw {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: { images: Array<{ url: string }> };
  duration_ms: number;
}
