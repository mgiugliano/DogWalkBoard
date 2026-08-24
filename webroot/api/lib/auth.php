<?php
declare(strict_types=1);

/**
 * Verifica che l'id utente fornito sia uno di quelli configurati in
 * data/public_users.json — l'unico controllo rimasto, dato che non c'è più un
 * token segreto (app pensata per un piccolo gruppo fisso, link non condivisi
 * pubblicamente). Restituisce l'id se valido/conosciuto, altrimenti null.
 */
function mca_resolve_user(string $userId): ?string
{
    if (!preg_match('/^[a-z0-9_-]+$/i', $userId)) {
        return null;
    }

    $path = MCA_DATA_DIR . '/public_users.json';
    if (!is_readable($path)) {
        return null;
    }

    $raw = file_get_contents($path);
    $data = json_decode((string)$raw, true);
    if (!is_array($data) || !isset($data['users']) || !is_array($data['users'])) {
        return null;
    }

    foreach ($data['users'] as $user) {
        if (isset($user['id']) && is_string($user['id']) && $user['id'] === $userId) {
            return $userId;
        }
    }

    return null;
}
