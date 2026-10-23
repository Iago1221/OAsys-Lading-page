# Oasys — LPs por dor

São seis landing pages estáticas, sem framework e sem build. Para publicar, basta subir a pasta inteira em qualquer hospedagem estática: o servidor atual, GitHub Pages, Netlify, Vercel ou Cloudflare Pages.

```
/estoque/              Estoque que não bate             (ERP)
/nota-entrada/         Digitação de nota de compra      (ERP · NF-e)
/orcamento-whatsapp/   Orçamento no WhatsApp            (Oasys Chat)
/cobranca/             Cliente que não paga             (ERP · financeiro)
/numeros/              Decidir sem números              (Oasys Finance)
/pedido-vendedor/      Pedido do vendedor               (Sales App)
/index.html            Índice interno (noindex)
/assets/oasys.css      Estilos, animações de scroll e fallback
/assets/oasys.js       Interativos, formulário, UTM e eventos
/assets/prints/        Pasta para os prints do sistema
```

## O que cada página tem
- **Animações ligadas ao scroll**, com CSS nativo no Chrome, Edge e Safari 26 ou mais recente. Nos outros navegadores o `oasys.js` usa IntersectionObserver como fallback. Quem configura o sistema com "reduzir movimento" vê tudo estático.
- **Um simulador interativo próprio da dor**, na seção "Teste agora".
- **Calculadora de tempo perdido**, nas LPs de nota e de orçamento. Ela captura e-mail.
- **Formulário de demonstração**, com validação e máscara de WhatsApp. Guarda as UTMs da visita e as envia junto com o lead.
- **Barra fixa no celular**, com o CTA e o WhatsApp. Ela aparece depois que o primeiro botão sai da tela e some quando o formulário está visível.
- **Card de preço com Anual / Mensal**: Essencial R$ 299 (anual) ou R$ 349 (mensal); Profissional R$ 599 ou R$ 689. Os valores ficam no topo do `widgets.preco` em `assets/oasys.js`. Cada troca de modalidade dispara o evento `troca_plano`.

## Antes de publicar: substituir

| Placeholder | Onde | O que colocar |
|---|---|---|
| `[SEU-DOMINIO]` | `<head>` e logo de todas as páginas | domínio do site, ex.: `oasys.com.br` |
| `[URL_DO_ENDPOINT_DE_LEADS]` | `data-endpoint` dos formulários e da calculadora | URL que recebe um POST em JSON (ver abaixo) |
| `[CNPJ]`, `[e-mail de contato]`, `[link-politica-de-privacidade]` | rodapé | dados da empresa |
| `[Depoimento…]`, `[Nome]`, `[Cargo]`, `[Empresa]`, `[Cidade/SC]` | seção de prova | depoimento real de cliente |
| `[Explicar…]`, `[Confirmar…]`, `[Prazo médio…]` | perguntas frequentes e simuladores | respostas reais sobre cada produto |
| `[Preço anual]`, `[Preço mensal]` | cards de preço do Chat e do Sales App (em `widgets.preco` no `oasys.js`) | preço dos adicionais |

Para achar todos de uma vez: `grep -rn "\[" */index.html`

## Prints do sistema
1. Salve os arquivos em `assets/prints/`.
2. Em cada página, procure o comentário `<!-- TROCAR -->`.
3. Substitua o bloco listrado logo abaixo pela `<img>` sugerida no próprio comentário.

## Recebimento dos leads
Enquanto `data-endpoint` estiver com o placeholder, o formulário só simula o envio, mas mostra a confirmação normalmente.

Quando o endpoint estiver configurado, cada envio faz um `POST` em JSON com os campos `nome`, `whatsapp`, `empresa` (ou `email` e as respostas da calculadora), `lp`, `pagina`, `enviado_em` e `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `gclid`, `fbclid`.

O endpoint pode ser:
- um webhook do Make ou do n8n que grava numa planilha e avisa no WhatsApp;
- uma integração de lead do RD Station;
- um Google Apps Script publicado como app web.

## Rastreamento
Já instalados em todas as páginas: **Meta Pixel `1042096091507834`** e **PostHog** (mesma chave e host do site atual). O WhatsApp dos botões é o comercial (`554731804931`).

O `oasys.js` envia cada evento para o PostHog (`posthog.capture`), para o Meta Pixel e para o `dataLayer` (GA4 / Tag Manager, opcional). Ao enviar o formulário, o lead é identificado no PostHog (`whatsapp:<número>` ou o e-mail da calculadora).

| Evento (PostHog / dataLayer) | Quando | Meta Pixel |
|---|---|---|
| `lead_demo` | formulário de demonstração enviado | `Lead` |
| `lead_calculadora` | e-mail deixado na calculadora | `Lead` |
| `clique_whatsapp` | qualquer clique em link do WhatsApp | `CliqueWhatsApp` (custom) |
| `interacao_simulador` | uso de um simulador (com `simulador`) | — |
| `troca_plano` | troca entre Anual e Mensal (com `plano` e `modalidade`) | — |

O PageView do Pixel e o pageview automático do PostHog já estão ativos. O GA4 ficou comentado no `<head>`, caso queira usar.

## Anúncios
Use `utm_campaign=dores&utm_content=<slug>` em cada anúncio. Exemplo: `https://oasys.com.br/estoque/?utm_source=meta&utm_medium=cpc&utm_campaign=dores&utm_content=estoque`
