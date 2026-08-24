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

    if (!isset($body['slots']) || !is_array($body['slots'])) {
        mca_fail(400, 'Elenco orari non valido.');
    }
    if (count($body['slots']) > 10) {
        mca_fail(400, 'Troppe fasce orarie (massimo 10).');
    }

    $timeRe = '/^([01]\d|2[0-3]):[0-5]\d$/';
    $slots = [];
    foreach ($body['slots'] as $slot) {
        if (!is_array($slot) || !isset($slot['start'], $slot['end'])
            || !is_string($slot['start']) || !is_string($slot['end'])) {
            mca_fail(400, 'Fascia oraria non valida.');
        }
        if (!preg_match($timeRe, $slot['start']) || !preg_match($timeRe, $slot['end'])) {
            mca_fail(400, 'Formato orario non valido (usare HH:MM).');
        }
        if ($slot['start'] >= $slot['end']) {
            mca_fail(400, 'L\'orario di inizio deve precedere quello di fine.');
        }
        $slots[] = ['start' => $slot['start'], 'end' => $slot['end']];
    }

    $path = MCA_DATA_DIR . "/schedule_{$userId}.json";
    $now = date('c');

    mca_update_json_locked($path, function (array $current) use ($slots, $now): array {
        return ['updated_at' => $now, 'slots' => $slots];
    });

    echo json_encode(['ok' => true, 'updated_at' => $now], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    mca_fail(500, 'Errore del server.');
}
