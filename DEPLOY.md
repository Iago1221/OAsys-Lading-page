# Deploy — Oasys landing pages

Site estático (HTML/CSS/JS) + dois scripts PHP: `leads.php` (recebe os formulários) e `painel-leads.php` (painel com senha para ver os leads).

## 1. Atualizar o código

```
git pull
composer install
```

- Requer PHP 7.2.5 ou mais novo (exigência do `vlucas/phpdotenv`).
- A pasta `vendor/` não vai pelo Git, então o `composer install` é obrigatório.

## 2. Arquivo `.env` (na raiz do site)

O `.env` não vai pelo Git. Crie (ou edite) a partir do `.env.example`:

```
EMAIL_USERNAME = ''   # conta Gmail que envia o aviso de novo lead (e-mail completo)
EMAIL_PASSWORD = ''   # senha de app do Gmail (não a senha normal da conta)
EMAIL_ADDRESS  = ''   # e-mail que recebe os avisos de novo lead
LEADS_SENHA    = ''   # senha de acesso ao painel-leads.php
```

Os valores reais devem vir do responsável pelo projeto por canal seguro. Não colocar em chat, e-mail ou commit.

- Sem `EMAIL_*`, o lead continua sendo salvo no CSV, só não chega o e-mail de aviso.
- Sem `LEADS_SENHA`, o `painel-leads.php` recusa abrir.
- Restringir o arquivo ao dono do site: `chmod 600 .env`.

## 3. Pasta de leads

Os leads são gravados em `leads/leads.csv`. O PHP precisa de permissão de escrita na pasta `leads/`. O arquivo é criado sozinho no primeiro lead e não vai pelo Git.

## 4. Nginx

O `leads/.htaccess` só vale em Apache. No Nginx, sem as regras abaixo, `/leads/leads.csv` (nomes, WhatsApp e e-mails) e o `.env` ficam públicos. Adicionar no bloco `server { ... }`, **antes** do `location ~ \.php$`:

```nginx
location ^~ /leads/ { return 404; }
location ^~ /vendor/ { return 404; }
location ~ /\.(?!well-known) { return 404; }
location ~* ^/composer\.(json|lock)$ { return 404; }
```

Depois: `nginx -t` e recarregar o Nginx. O bloqueio de `/leads/` não afeta o `leads.php` nem o `painel-leads.php`, que acessam o CSV pelo disco.

## 5. Testes depois de publicar

- `/leads/leads.csv`, `/.env` e `/vendor/autoload.php` devem retornar 404.
- `/painel-leads.php` deve pedir senha e, com a senha certa, mostrar a tabela e o botão "Baixar CSV".
- Preencher o formulário de uma LP deve criar uma linha no painel e enviar o e-mail de aviso.

## Observações

- PostHog e Meta Pixel já estão no código das páginas, sem configuração no servidor.
- Os links de compartilhamento (`og:image`) apontam para `https://www.oasystecnologia.com/assets/og-share.png`.
