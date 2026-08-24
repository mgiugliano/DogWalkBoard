<?php
declare(strict_types=1);

/**
 * Reads, merges, and writes a JSON file under a single exclusive lock held for the
 * whole read-modify-write, so concurrent/rapid requests can never race or corrupt it.
 *
 * @param callable(array):array $merge Receives the current decoded content (empty array
 *   if the file was empty/new) and returns the new content to persist.
 */
function mca_update_json_locked(string $path, callable $merge): array
{
    $fh = fopen($path, 'c+');
    if ($fh === false) {
        throw new RuntimeException("Impossibile aprire il file: {$path}");
    }

    try {
        if (!flock($fh, LOCK_EX)) {
            throw new RuntimeException("Impossibile bloccare il file: {$path}");
        }

        $raw = stream_get_contents($fh);
        $current = $raw !== false && $raw !== '' ? json_decode($raw, true) : null;
        if (!is_array($current)) {
            $current = [];
        }

        $updated = $merge($current);

        $json = json_encode($updated, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if ($json === false) {
            throw new RuntimeException('Impossibile serializzare i dati.');
        }

        rewind($fh);
        ftruncate($fh, 0);
        fwrite($fh, $json);
        fflush($fh);

        return $updated;
    } finally {
        flock($fh, LOCK_UN);
        fclose($fh);
    }
}
