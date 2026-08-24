<?php
declare(strict_types=1);

// config.php è generato da bin/setup.php (vedi config.example.php per il
// modello) — non esiste finché non lo esegui, così un deploy senza setup
// fallisce subito con un errore chiaro invece di usare un fuso orario a caso.
$configPath = __DIR__ . '/config.php';
if (!is_file($configPath)) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Configurazione mancante: esegui 'php bin/setup.php' dalla radice del progetto e ricarica i file su webroot/, poi riprova.\n" .
        "Missing configuration: run 'php bin/setup.php' from the project root and re-upload webroot/, then retry.\n";
    exit;
}
$mcaConfig = require $configPath;

date_default_timezone_set($mcaConfig['timezone']);

// webroot/api/lib -> webroot/api -> webroot
define('MCA_DATA_DIR', dirname(__DIR__, 2) . '/data');
