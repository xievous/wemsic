import type { CatalogSearchResult } from '@wemsic/shared';
import { useState } from 'react';
import { importMusic, removePlaylist as removePlaylistRequest } from '../../api/client';
import { useSocket } from '../../socket/SocketContext';

/**
 * Adding and removing this player's playlists, plus the status message shown
 * at the top of the lobby. The picker dialog and the paste-a-link field share
 * one `importing` flag so only one import runs at a time.
 */
export function usePlaylistImport(roomCode: string, playerId: string) {
  const { playlistImportProgress, clearPlaylistImportProgress } = useSocket();
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [removingPlaylistId, setRemovingPlaylistId] = useState<string | null>(null);

  const progress =
    importing && playlistImportProgress?.playerId === playerId
      ? playlistImportProgress
      : null;

  async function runImport(url: string, ytmBrowseId?: string) {
    setImporting(true);
    clearPlaylistImportProgress();
    try {
      const res = await importMusic(roomCode, playerId, url, ytmBrowseId);
      const truncatedNote = res.truncated
        ? ' (some tracks could not be loaded)'
        : '';
      setMessage(
        `Added ${res.trackCount} tracks from ${res.playlistName}${truncatedNote} · ${res.totalTrackCount} total`,
      );
    } finally {
      setImporting(false);
      clearPlaylistImportProgress();
    }
  }

  /** Resolves true on success so the caller can clear its input. */
  async function importFromUrl(url: string): Promise<boolean> {
    try {
      await runImport(url);
      return true;
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Import failed');
      return false;
    }
  }

  /** Rethrows so the picker dialog can show the error inline too. */
  async function importFromCatalog(item: CatalogSearchResult) {
    if (!item.url) throw new Error('This playlist cannot be imported.');
    try {
      await runImport(item.url, item.ytmBrowseId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Import failed';
      setMessage(msg);
      throw e instanceof Error ? e : new Error(msg);
    }
  }

  async function removePlaylist(playlistId: string) {
    setRemovingPlaylistId(playlistId);
    try {
      await removePlaylistRequest(roomCode, playerId, playlistId);
      setMessage(null);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not remove playlist');
    } finally {
      setRemovingPlaylistId(null);
    }
  }

  return {
    importing,
    progress,
    message,
    setMessage,
    removingPlaylistId,
    importFromUrl,
    importFromCatalog,
    removePlaylist,
  };
}

export type PlaylistImport = ReturnType<typeof usePlaylistImport>;
