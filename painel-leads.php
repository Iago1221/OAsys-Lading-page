<?php
/**
 * Painel simples pra ver e baixar os leads salvos em leads/leads.csv,
 * protegido por senha (defina LEADS_SENHA no .env).
 */

session_start();

if (file_exists(__DIR__ . '/vendor/autoload.php')) {
    require_once __DIR__ . '/vendor/autoload.php';
}
if (file_exists(__DIR__ . '/.env') && class_exists('Dotenv\\Dotenv')) {
    $dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
    $dotenv->load();
}

$senhaConfigurada = $_ENV['LEADS_SENHA'] ?? '';

if ($senhaConfigurada === '') {
    http_response_code(500);
    exit('Defina LEADS_SENHA no arquivo .env antes de usar este painel.');
}

$erroLogin = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['senha'])) {
    if (hash_equals($senhaConfigurada, $_POST['senha'])) {
        session_regenerate_id(true);
        $_SESSION['leads_ok'] = true;
    } else {
        sleep(1);
        $erroLogin = 'Senha incorreta.';
    }
}

if (isset($_GET['saida'])) {
    unset($_SESSION['leads_ok']);
    session_destroy();
    header('Location: painel-leads.php');
    exit;
}

$autenticado = !empty($_SESSION['leads_ok']);
$arquivoCsv = __DIR__ . '/leads/leads.csv';

if ($autenticado && isset($_GET['acao']) && $_GET['acao'] === 'download') {
    if (!file_exists($arquivoCsv)) {
        http_response_code(404);
        exit('Nenhum lead salvo ainda.');
    }
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="leads.csv"');
    header('Content-Length: ' . filesize($arquivoCsv));
    readfile($arquivoCsv);
    exit;
}

$linhas = [];
$cabecalho = [];
if ($autenticado && file_exists($arquivoCsv)) {
    $fh = fopen($arquivoCsv, 'r');
    if ($fh !== false) {
        $cabecalho = fgetcsv($fh) ?: [];
        while (($linha = fgetcsv($fh)) !== false) {
            $linhas[] = $linha;
        }
        fclose($fh);
    }
    $linhas = array_reverse($linhas);
}

function h($v) { return htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8'); }
?>
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Painel de leads — Oasys</title>
<meta name="robots" content="noindex, nofollow">
<link rel="icon" href="assets/favicon.ico">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@500;600;700;800&family=Source+Sans+3:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="assets/oasys.css">
<style>
  body{background:var(--fundo);font-family:'Source Sans 3',system-ui,sans-serif;color:var(--texto);margin:0}
  .topo{background:#FFFFFF;border-bottom:1px solid var(--linha)}
  .topo-in{max-width:1200px;margin:0 auto;padding:14px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px}
  .topo-in img{height:32px;width:auto;display:block}
  .wrap{max-width:1200px;margin:0 auto;padding:40px 24px 80px}
  .login{max-width:360px;margin:80px auto;background:#fff;border:1px solid var(--linha);border-radius:14px;padding:32px}
  .login h1{font-family:'Schibsted Grotesk',sans-serif;font-weight:800;font-size:22px;margin:0 0 20px;letter-spacing:-.02em}
  .login input{width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid var(--linha);border-radius:10px;font-size:16px;margin-bottom:14px}
  .login button{width:100%;background:var(--azul);color:#fff;border:0;border-radius:10px;padding:13px;font-weight:700;font-size:16px;cursor:pointer}
  .erro{color:#B42318;font-size:14px;margin:-6px 0 14px}
  h1.titulo{font-family:'Schibsted Grotesk',sans-serif;font-weight:800;font-size:clamp(24px,3vw,32px);letter-spacing:-.02em;margin:0 0 4px}
  .sub{color:var(--suave);font-size:15px;margin:0 0 24px}
  .acoes{display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap}
  .btn{display:inline-flex;align-items:center;gap:6px;text-decoration:none;font-weight:700;font-size:14px;padding:10px 16px;border-radius:9px;border:1px solid var(--linha);color:var(--texto);background:#fff}
  .btn.primario{background:var(--azul);color:#fff;border-color:var(--azul)}
  .tabela-wrap{overflow-x:auto;background:#fff;border:1px solid var(--linha);border-radius:14px}
  table{border-collapse:collapse;width:100%;font-size:14px;white-space:nowrap}
  th,td{text-align:left;padding:10px 14px;border-bottom:1px solid var(--linha)}
  th{color:var(--suave);font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.03em;background:#FAFBFD}
  tr:last-child td{border-bottom:0}
  .vazio{padding:40px;text-align:center;color:var(--suave)}
</style>
</head>
<body>

<header class="topo">
<div class="topo-in">
<a href="/" aria-label="Oasys — página inicial" style="display:inline-flex;align-items:center;text-decoration:none"><img src="assets/logohorizontal.png" alt="Oasys"></a>
<?php if ($autenticado): ?><a href="?saida=1" class="btn">Sair</a><?php endif; ?>
</div>
</header>

<?php if (!$autenticado): ?>
<div class="login">
  <h1>Painel de leads</h1>
  <?php if ($erroLogin): ?><p class="erro"><?= h($erroLogin) ?></p><?php endif; ?>
  <form method="post">
    <input type="password" name="senha" placeholder="Senha" autofocus required>
    <button type="submit">Entrar</button>
  </form>
</div>
<?php else: ?>
<div class="wrap">
  <h1 class="titulo">Leads</h1>
  <p class="sub"><?= count($linhas) ?> lead<?= count($linhas) === 1 ? '' : 's' ?> salvo<?= count($linhas) === 1 ? '' : 's' ?></p>
  <div class="acoes">
    <a href="?acao=download" class="btn primario">Baixar CSV</a>
  </div>
  <div class="tabela-wrap">
    <?php if (!$linhas): ?>
      <div class="vazio">Nenhum lead salvo ainda.</div>
    <?php else: ?>
    <table>
      <tr><?php foreach ($cabecalho as $col): ?><th><?= h($col) ?></th><?php endforeach; ?></tr>
      <?php foreach ($linhas as $linha): ?>
      <tr><?php foreach ($linha as $campo): ?><td><?= h($campo) ?></td><?php endforeach; ?></tr>
      <?php endforeach; ?>
    </table>
    <?php endif; ?>
  </div>
</div>
<?php endif; ?>

</body>
</html>
