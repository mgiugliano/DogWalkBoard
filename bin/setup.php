<?php
declare(strict_types=1);

/**
 * Wizard di configurazione locale — da eseguire UNA VOLTA sul tuo computer,
 * PRIMA di caricare webroot/ sul tuo hosting via FTP. Chiede il centro della
 * mappa, il fuso orario e l'elenco di chi porta a spasso il cane, poi genera
 * i file di configurazione e i dati "puliti" di partenza.
 *
 * Setup wizard — run this ONCE on your own computer, BEFORE uploading
 * webroot/ to your hosting via FTP. It asks for the map center, timezone,
 * and the list of dog-walkers, then generates the config and starting data
 * files.
 *
 * Uso / usage:  php bin/setup.php [--force]
 */

$root = dirname(__DIR__);
$webroot = $root . '/webroot';
$jsConfigPath = $webroot . '/assets/js/config.js';
$phpConfigPath = $webroot . '/api/lib/config.php';
$dataDir = $webroot . '/data';

$force = in_array('--force', $argv, true);

if (is_file($jsConfigPath) && !$force) {
    fwrite(STDERR, "webroot/assets/js/config.js esiste già — per rigenerarlo rilancia con --force.\n");
    fwrite(STDERR, "webroot/assets/js/config.js already exists — re-run with --force to regenerate it.\n");
    exit(1);
}

function ask(string $prompt, ?string $default = null): string
{
    $hint = $default !== null ? " [{$default}]" : '';
    fwrite(STDOUT, "{$prompt}{$hint}: ");
    $line = fgets(STDIN);
    $value = $line === false ? '' : trim($line);
    return $value === '' && $default !== null ? $default : $value;
}

function askFloat(string $prompt, float $default): float
{
    while (true) {
        $raw = ask($prompt, (string)$default);
        if (is_numeric($raw)) {
            return (float)$raw;
        }
        fwrite(STDOUT, "Numero non valido / not a valid number.\n");
    }
}

function askInt(string $prompt, int $default): int
{
    while (true) {
        $raw = ask($prompt, (string)$default);
        if (ctype_digit($raw)) {
            return (int)$raw;
        }
        fwrite(STDOUT, "Numero intero non valido / not a valid integer.\n");
    }
}

function jsString(string $s): string
{
    return json_encode($s, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

echo "== DogWalkBoard — configurazione / setup ==\n\n";

echo "-- Bacheca / Board --\n";
$boardName = ask('Nome del quartiere/bacheca (es. "Cogoleto") / Neighborhood or board name', 'My Neighborhood');

echo "\n-- Mappa / Map --\n";
echo "Trova le coordinate del centro su openstreetmap.org: cerca il punto, tasto\n" .
    "destro -> \"Mostra indirizzo\" mostra lat/lon.\n" .
    "Find the center coordinates on openstreetmap.org: search the spot, right-click\n" .
    "-> \"Show address\" reveals lat/lon.\n";
$lat = askFloat('Latitudine del centro / Center latitude', 44.395650);
$lon = askFloat('Longitudine del centro / Center longitude', 8.654534);
$zoom = askInt('Livello di zoom iniziale / Initial zoom level (14-19)', 17);
$radiusMeters = askFloat('Raggio dell\'area (metri) entro cui muovere la mappa / Map pan radius (meters)', 1300);
$privacyMeters = askFloat('Raggio "zona abituale" per lo stop automatico del GPS (metri) / GPS auto-stop privacy radius (meters)', 1500);

echo "\n-- Fuso orario / Timezone --\n";
$guessedTz = date_default_timezone_get() ?: 'UTC';
$timezone = ask('Identificatore fuso orario PHP (elenco: https://www.php.net/manual/en/timezones.php) / PHP timezone identifier', $guessedTz);
if (!in_array($timezone, DateTimeZone::listIdentifiers(), true)) {
    fwrite(STDERR, "Fuso orario sconosciuto: {$timezone}\nUnknown timezone: {$timezone}\n");
    exit(1);
}

echo "\n-- Lingua di default / Default language --\n";
$lang = '';
while ($lang !== 'it' && $lang !== 'en') {
    $lang = strtolower(ask('Lingua iniziale, "it" o "en" (chi visita può comunque cambiarla) / Initial language, "it" or "en" (visitors can still switch it)', 'en'));
}

echo "\n-- Partecipanti / Participants --\n";
echo "Aggiungi almeno 2 persone. Lascia vuoto l'id per finire.\n" .
    "Add at least 2 people. Leave the id blank to finish.\n";
$users = [];
while (true) {
    echo "\nPartecipante " . (count($users) + 1) . " / Participant " . (count($users) + 1) . "\n";
    $id = ask('  Id (solo lettere minuscole/numeri/trattini, es. "anna") / Id (lowercase letters/digits/dashes only, e.g. "anna")', '');
    if ($id === '') {
        break;
    }
    if (!preg_match('/^[a-z0-9_-]+$/', $id)) {
        echo "  Id non valido, riprova / Invalid id, try again.\n";
        continue;
    }
    if (isset($users[$id])) {
        echo "  Id già usato, riprova / Id already used, try again.\n";
        continue;
    }
    $name = ask('  Nome mostrato / Display name', ucfirst($id));
    $color = ask('  Colore esadecimale / Hex color', '#1565c0');
    if (!preg_match('/^#[0-9a-fA-F]{6}$/', $color)) {
        echo "  Colore non valido, uso #1565c0 / Invalid color, using #1565c0.\n";
        $color = '#1565c0';
    }
    $users[$id] = ['id' => $id, 'name' => $name, 'color' => $color];
}

if (count($users) < 2) {
    echo "\nAttenzione: l'app presuppone almeno 2 partecipanti — continuo comunque,\n" .
        "ma probabilmente vuoi aggiungerne altri più tardi modificando\n" .
        "webroot/data/public_users.json a mano.\n" .
        "Warning: the app assumes at least 2 participants — continuing anyway, but\n" .
        "you'll probably want to add more later by hand-editing\n" .
        "webroot/data/public_users.json.\n";
}

// --- Scrittura dei file / Write the files ---

@mkdir(dirname($jsConfigPath), 0777, true);
@mkdir(dirname($phpConfigPath), 0777, true);
@mkdir($dataDir, 0777, true);

$radiusDeg = round($radiusMeters / 111320, 6);
$boardNameJs = jsString($boardName);

$jsConfig = <<<JS
// Generato da bin/setup.php — non tracciato da git (vedi .gitignore).
// Generated by bin/setup.php — not tracked by git (see .gitignore).
const MCA_BOARD_NAME = {$boardNameJs};
const MCA_MAP_CENTER = [{$lat}, {$lon}];
const MCA_MAP_ZOOM = {$zoom};
const MCA_MAP_MIN_ZOOM = 14;
const MCA_MAP_BOUNDS_RADIUS_DEG = {$radiusDeg};
const MCA_PRIVACY_RADIUS_METERS = {$privacyMeters};

JS;
file_put_contents($jsConfigPath, $jsConfig);

$phpConfig = "<?php\n" .
    "declare(strict_types=1);\n\n" .
    "// Generato da bin/setup.php — non tracciato da git (vedi .gitignore).\n" .
    "// Generated by bin/setup.php — not tracked by git (see .gitignore).\n" .
    "return [\n" .
    "    'timezone' => " . var_export($timezone, true) . ",\n" .
    "];\n";
file_put_contents($phpConfigPath, $phpConfig);

$publicUsers = ['users' => array_values(array_map(
    fn ($u) => ['id' => $u['id'], 'name' => $u['name'], 'color' => $u['color']],
    $users
))];
file_put_contents($dataDir . '/public_users.json', json_encode($publicUsers, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n");

$prisineLive = [
    'active' => false,
    'updated_at' => null,
    'position' => null,
    'position_updated_at' => null,
    'route' => [],
    'route_updated_at' => null,
    'active_since' => null,
];
$pristineSchedule = ['updated_at' => null, 'slots' => []];

foreach ($users as $u) {
    file_put_contents($dataDir . '/live_' . $u['id'] . '.json', json_encode($prisineLive, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n");
    file_put_contents($dataDir . '/schedule_' . $u['id'] . '.json', json_encode($pristineSchedule, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n");
}

// La lingua di default scelta qui non cambia il codice: è solo il valore che
// mcaDetectDefaultLang() userebbe comunque per un browser non italiano/non
// riconosciuto, quindi non serve altro file — lo segnaliamo e basta.
echo "\n== Fatto / Done ==\n";
echo "Scritti / Written:\n";
echo "  - webroot/assets/js/config.js\n";
echo "  - webroot/api/lib/config.php\n";
echo "  - webroot/data/public_users.json (" . count($users) . " partecipanti/participants)\n";
foreach ($users as $u) {
    echo "  - webroot/data/live_{$u['id']}.json, webroot/data/schedule_{$u['id']}.json\n";
}
echo "\nProssimi passi / Next steps:\n";
echo "  1. Rivedi i file generati (soprattutto config.js/config.php).\n" .
    "     Review the generated files (especially config.js/config.php).\n";
echo "  2. Carica TUTTO il contenuto di webroot/ sul tuo hosting via FTP.\n" .
    "     Upload the ENTIRE contents of webroot/ to your hosting via FTP.\n";
echo "  3. Verifica che webroot/data/ sia scrivibile dal processo PHP del tuo host.\n" .
    "     Confirm webroot/data/ is writable by your host's PHP process.\n";
echo "  4. Apri board.html per controllare che tutto funzioni.\n" .
    "     Open board.html to confirm everything works.\n";
echo "\nVedi DEPLOYMENT.md per i dettagli / See DEPLOYMENT.md for details.\n";
