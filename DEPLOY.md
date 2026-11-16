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

## Página de cadastro (`/comecar/`)

Formulário de teste grátis que cria o ambiente do cliente no ERP. Ela não usa PHP deste site: fala direto com os endpoints `/central/` do ERP (`assets/cadastro.js`).

- Em `comecar/index.html`, preencha `data-central` no `<body>` com o endereço do ERP que atende `/central/`, sem barra no fim (hoje `https://app.oasystecnologia.com`).
- No `.env` do ERP, `LP_ORIGENS` precisa conter a origem deste site (ex.: `https://www.oasystecnologia.com`), senão o navegador bloqueia as chamadas.
- Com `data-central` vazio, ou com o cadastro fechado no ERP (`cadastro_aberto` em `central.configuracao`), a página mostra só o aviso de "abre em breve".
- A página está com `noindex` e fora do `sitemap.xml`. Ao abrir o cadastro ao público, remova o `noindex` e inclua a URL no sitemap.
- O link "Termos de Uso" aponta para `/termos-de-uso.html`, que ainda não existe neste repositório. Publique o arquivo antes de abrir o cadastro.

## Página de planos (`/planos/`)

Configurador de preço: lê o catálogo em `/central/catalogo` do ERP (`assets/planos.js`) e calcula o valor mensal no navegador. Os preços vêm do banco central do ERP (`central.catalogo_item` e `central.configuracao`); nada de preço fica neste repositório.

- Usa o mesmo `data-central` e a mesma `LP_ORIGENS` da página de cadastro.
- O botão principal leva ao teste grátis (`/comecar/`) quando o cadastro está aberto; senão, ao WhatsApp. O link "Contratar agora" só aparece com `checkout_aberto` ligado no ERP.
- Também está com `noindex` e fora do `sitemap.xml` até a abertura.

