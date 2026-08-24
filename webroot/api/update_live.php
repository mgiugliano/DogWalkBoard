<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/lib/bootstrap.php';
require __DIR__ . '/lib/auth.php';
require __DIR__ . '/lib/storage.php';

function mca_fail(int $code, string $message)
{
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

function mca_validate_point($point): ?array
{
    if (!is_array($point) || !isset($point['lat'], $point['lon'])) {
        return null;
    }
    if (!is_numeric($point['lat']) || !is_numeric($point['lon'])) {
        return null;
    }
    $lat = (float)$point['lat'];
    $lon = (float)$point['lon'];
    if ($lat < -90 || $lat > 90 || $lon < -180 || $lon > 180) {
        return null;
    }
    return ['lat' => $lat, 'lon' => $lon];
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        mca_fail(405, 'Metodo non consentito.');
    }

    $body = json_decode((string)file_get_contents('php://input'), true);
    if (!is_array($body) || !isset($body['u']) || !is_string($body['u'])) {
        mca_fail(400, 'Richiesta non valida.');
    }

    $userId = mca_resolve_user($body['u']);
    if ($userId === null) {
        mca_fail(403, 'Utente sconosciuto.');
    }

    $hasActive = array_key_exists('active', $body);
    if ($hasActive && !is_bool($body['active'])) {
        mca_fail(400, 'Campo "active" non valido.');
    }

    $hasPosition = array_key_exists('position', $body);
    $position = null;
    if ($hasPosition && $body['position'] !== null) {
        $position = mca_validate_point($body['position']);
        if ($position === null) {
            mca_fail(400, 'Posizione non valida.');
        }
    }

    $hasRoute = array_key_exists('route', $body);
    $route = null;
    if ($hasRoute) {
        if (!is_array($body['route'])) {
            mca_fail(400, 'Percorso non valido.');
        }
        if (count($body['route']) > 50) {
            mca_fail(400, 'Percorso troppo lungo (massimo 50 punti).');
        }
        $route = [];
        foreach ($body['route'] as $rawPoint) {
            $point = mca_validate_point($rawPoint);
            if ($point === null) {
                mca_fail(400, 'Punto del percorso non valido.');
            }
            $route[] = $point;
        }
    }

    $path = MCA_DATA_DIR . "/live_{$userId}.json";
    $now = date('c');

    $updated = mca_update_json_locked($path, function (array $current) use ($hasActive, $body, $hasPosition, $position, $hasRoute, $route, $now): array {
        $current += [
            'active' => false,
            'updated_at' => null,
            'position' => null,
            'position_updated_at' => null,
            'route' => [],
            'route_updated_at' => null,
            'active_since' => null,
        ];

        if ($hasActive) {
            $wasActive = !empty($current['active']);
            $current['active'] = $body['active'];
            // Segna l'inizio solo al passaggio spento->acceso (non lo azzera se era
            // già acceso), e lo pulisce quando si spegne — così la durata mostrata
            // parte sempre dall'inizio vero della passeggiata in corso.
            if ($body['active'] && !$wasActive) {
                $current['active_since'] = $now;
            } elseif (!$body['active']) {
                $current['active_since'] = null;
            }
        }
        if ($hasPosition) {
            $current['position'] = $position;
            // Timestamp dedicato, distinto da updated_at: quest'ultimo cambia anche
            // per un semplice toggle "fuori ora" o un nuovo percorso, quindi da solo
            // non basta a dire da quanto la POSIZIONE mostrata è davvero aggiornata.
            $current['position_updated_at'] = $now;
        }
        if ($hasRoute) {
            $current['route'] = $route;
            $current['route_updated_at'] = $now;
        }
        $current['updated_at'] = $now;

        return $current;
    });

    echo json_encode([
        'ok' => true,
        'updated_at' => $updated['updated_at'],
        'position_updated_at' => $updated['position_updated_at'],
        'active_since' => $updated['active_since'],
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    mca_fail(500, 'Errore del server.');
}
