<?php
/**
 * Endpoint simples para receber os leads das LPs (assets/oasys.js -> enviarLead()).
 *
 * O que faz:
 *   1. Recebe o JSON enviado pelo fetch() do oasys.js.
 *   2. Grava uma linha em leads/leads.csv (a pasta é protegida por leads/.htaccess).
 *   3. Tenta avisar por e-mail (reaproveita as credenciais SMTP do enviar.php / .env).
 *      Se o e-mail falhar, o lead continua salvo no CSV normalmente.
 *
 * Configuração: copie .env.example para .env e preencha EMAIL_USERNAME,
 * EMAIL_PASSWORD e EMAIL_ADDRESS (mesmas variáveis já usadas pelo enviar.php).
 * Sem isso, o endpoint ainda funciona e salva no CSV — só não manda e-mail.
 */

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'erro' => 'Método não permitido.']);
    exit;
}

$corpo = json_decode(file_get_contents('php://input'), true);
if (!is_array($corpo)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'erro' => 'JSON inválido.']);
    exit;
}

$limpa = function ($v) {
    return is_string($v) ? trim(str_replace(["\r", "\n"], ' ', $v)) : '';
};

$nome    = $limpa($corpo['nome'] ?? '');
$whats   = $limpa($corpo['whatsapp'] ?? '');
$empresa = $limpa($corpo['empresa'] ?? '');
$email   = $limpa($corpo['email'] ?? '');
$lp      = $limpa($corpo['lp'] ?? '');
$pagina  = $limpa($corpo['pagina'] ?? '');

if ($nome === '' && $email === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'erro' => 'Informe ao menos nome ou e-mail.']);
    exit;
}

// Tudo que não é um dos campos fixos acima (ex.: respostas da calculadora,
// UTMs) vai inteiro numa coluna extra, pra não perder nenhum dado enviado.
$fixos = ['nome', 'whatsapp', 'empresa', 'email', 'lp', 'pagina', 'enviado_em', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'];
$extra = array_diff_key($corpo, array_flip($fixos));

$linha = [
    date('Y-m-d H:i:s'),
    $lp,
    $pagina,
    $nome,
    $whats,
    $empresa,
    $email,
    $corpo['utm_source'] ?? '',
    $corpo['utm_medium'] ?? '',
    $corpo['utm_campaign'] ?? '',
    $corpo['utm_content'] ?? '',
    $corpo['utm_term'] ?? '',
    json_encode($extra, JSON_UNESCAPED_UNICODE),
];

$pastaLeads = __DIR__ . '/leads';
if (!is_dir($pastaLeads)) {
    mkdir($pastaLeads, 0755, true);
}

$arquivo = $pastaLeads . '/leads.csv';
$novo = !file_exists($arquivo);

$fh = fopen($arquivo, 'a');
if ($fh === false) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'erro' => 'Não foi possível salvar o lead.']);
    exit;
}

flock($fh, LOCK_EX);
if ($novo) {
    fputcsv($fh, ['data_hora', 'lp', 'pagina', 'nome', 'whatsapp', 'empresa', 'email', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'dados_extra']);
}
fputcsv($fh, $linha);
flock($fh, LOCK_UN);
fclose($fh);

// Aviso por e-mail (opcional — se faltar configuração ou der erro, não quebra o salvamento acima).
if (file_exists(__DIR__ . '/vendor/autoload.php')) {
    require_once __DIR__ . '/vendor/autoload.php';
    try {
        if (file_exists(__DIR__ . '/.env')) {
            $dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
            $dotenv->load();
        }
        if (!empty($_ENV['EMAIL_USERNAME']) && !empty($_ENV['EMAIL_PASSWORD']) && !empty($_ENV['EMAIL_ADDRESS'])) {
            $mail = new PHPMailer\PHPMailer\PHPMailer(true);
            $mail->isSMTP();
            $mail->Host = 'smtp.gmail.com';
            $mail->SMTPAuth = true;
            $mail->Username = $_ENV['EMAIL_USERNAME'];
            $mail->Password = $_ENV['EMAIL_PASSWORD'];
            $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port = 587;
            $mail->setFrom($mail->Username, 'Oasys — Leads do site');
            $mail->addAddress($_ENV['EMAIL_ADDRESS']);
            $mail->isHTML(true);
            $mail->Subject = 'Novo lead · ' . ($lp ?: 'site') . ($nome ? ' · ' . $nome : '');
            $mail->Body = nl2br(
                "LP: $lp\n" .
                "Página: $pagina\n" .
                "Nome: $nome\n" .
                "WhatsApp: $whats\n" .
                "Empresa: $empresa\n" .
                "E-mail: $email\n" .
                ($extra ? "Outros dados: " . json_encode($extra, JSON_UNESCAPED_UNICODE) . "\n" : '')
            );
            $mail->send();
        }
    } catch (\Throwable $e) {
        // Falha no e-mail não impede o lead de já estar salvo no CSV acima.
    }
}

echo json_encode(['ok' => true]);
