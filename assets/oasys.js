/* Oasys — LPs por dor · comportamento compartilhado (sem dependências) */
(function () {
  'use strict';

  var LP = document.body.getAttribute('data-lp') || 'lp';
  var brl = function (v, dec) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: dec === 0 ? 0 : 2, minimumFractionDigits: dec === 0 ? 0 : 2 });
  };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  /* ---------- rastreamento (GA4 / Meta Pixel, se instalados) ---------- */
  function track(evento, extra) {
    var dados = Object.assign({ event: evento, lp: LP }, extra || {});
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(dados);
    if (window.posthog && typeof window.posthog.capture === 'function') {
      window.posthog.capture(evento, Object.assign({ lp: LP }, extra || {}));
    }
    if (typeof window.fbq === 'function') {
      if (evento === 'lead_demo') window.fbq('track', 'Lead', { content_name: LP });
      if (evento === 'lead_calculadora') window.fbq('track', 'Lead', { content_name: LP + '-calculadora' });
      if (evento === 'clique_whatsapp') window.fbq('trackCustom', 'CliqueWhatsApp', { lp: LP });
    }
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href*="wa.me"]');
    if (a) track('clique_whatsapp');
  });

  /* ---------- UTM: guarda na sessão e preenche campos ocultos ---------- */
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'];
  var utm = {};
  try {
    var qs = new URLSearchParams(location.search);
    var salvo = JSON.parse(sessionStorage.getItem('oasys_utm') || '{}');
    UTM_KEYS.forEach(function (k) { utm[k] = qs.get(k) || salvo[k] || ''; });
    sessionStorage.setItem('oasys_utm', JSON.stringify(utm));
  } catch (err) { UTM_KEYS.forEach(function (k) { utm[k] = ''; }); }

  function enviarLead(form, payload, onOk) {
    var endpoint = form.getAttribute('data-endpoint') || '';
    var corpo = Object.assign({ lp: LP, pagina: location.href, enviado_em: new Date().toISOString() }, utm, payload);
    if (!endpoint || endpoint.indexOf('[') === 0) { onOk(); return; } // endpoint ainda não configurado: só simula
    fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })
      .then(function () { onOk(); })
      .catch(function () { onOk(); });
  }

  /* ---------- formulário de demonstração ---------- */
  document.querySelectorAll('form[data-form="demo"]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var nome = form.querySelector('[name="nome"]');
      var whats = form.querySelector('[name="whatsapp"]');
      var erro = form.querySelector('[data-erro]');
      var digitos = (whats.value || '').replace(/\D/g, '');
      if (!nome.value.trim() || digitos.length < 10) {
        erro.hidden = false;
        erro.textContent = !nome.value.trim() ? 'Conta pra gente seu nome.' : 'Confira o número de WhatsApp com DDD.';
        (!nome.value.trim() ? nome : whats).focus();
        return;
      }
      erro.hidden = true;
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      enviarLead(form, { nome: nome.value.trim(), whatsapp: digitos, empresa: (form.querySelector('[name="empresa"]') || {}).value || '' }, function () {
        if (window.posthog && window.posthog.identify) window.posthog.identify('whatsapp:' + digitos, { name: nome.value.trim(), whatsapp: digitos, empresa: (form.querySelector('[name="empresa"]') || {}).value || '' });
        track('lead_demo');
        form.querySelector('[data-campos]').hidden = true;
        var ok = form.querySelector('[data-ok]');
        ok.hidden = false;
        ok.focus();
      });
    });
    var w = form.querySelector('[name="whatsapp"]');
    w.addEventListener('input', function () {
      var d = w.value.replace(/\D/g, '').slice(0, 11);
      var f = d;
      if (d.length > 2) f = '(' + d.slice(0, 2) + ') ' + d.slice(2);
      if (d.length > 7) f = '(' + d.slice(0, 2) + ') ' + d.slice(2, d.length - 4) + '-' + d.slice(-4);
      w.value = f;
    });
  });

  /* ---------- re-render preservando foco (widgets com botões) ---------- */
  function montar(el, html) {
    var ativo = document.activeElement;
    var chave = ativo && el.contains(ativo) ? ativo.getAttribute('data-k') : null;
    el.innerHTML = html;
    if (chave) { var n = el.querySelector('[data-k="' + chave + '"]'); if (n && !n.disabled) n.focus(); }
  }

  var widgets = {};

  /* ---------- Calculadora de tempo perdido ---------- */
  widgets.calculadora = function (el) {
    var s = { notas: 40, itens: 25, orc: 15, hora: 25 };
    el.innerHTML =
      '<div class="oz-caixa" style="gap:40px">' +
      '<div class="oz-col" style="flex-basis:420px;gap:22px">' +
      '<span class="oz-tag">Calculadora gratuita</span>' +
      '<h2 class="oz-h2" style="font-size:clamp(28px,3.2vw,40px)">Quanto tempo sua equipe perde digitando?</h2>' +
      '<p style="margin:0;color:var(--texto)">Arraste com os números da sua empresa. O resultado aparece na hora.</p>' +
      faixa('notas', 'Notas de compra por mês', 0, 200, 5) +
      faixa('itens', 'Itens por nota, em média', 1, 100, 1) +
      faixa('orc', 'Orçamentos montados por dia', 0, 80, 1) +
      faixa('hora', 'Custo da hora do funcionário', 10, 80, 1) +
      '<p class="oz-nota">Estimativa considerando ~1 min por item digitado na nota, ~5 min por orçamento montado à mão e 22 dias úteis no mês.</p>' +
      '</div>' +
      '<div class="oz-escuro" style="flex:1 1 380px;min-width:0;padding:32px;gap:18px">' +
      '<p style="margin:0;font-size:14px;font-weight:700;color:#C3CEDD;text-transform:uppercase;letter-spacing:.06em">Sua equipe gasta por mês</p>' +
      '<div style="font-family:\'Schibsted Grotesk\',sans-serif;font-weight:800;font-size:clamp(56px,7vw,84px);line-height:.95;letter-spacing:-.04em"><span data-out="horas"></span><span style="font-size:28px;color:#C3CEDD;letter-spacing:0"> horas</span></div>' +
      '<p style="margin:0;font-size:19px;color:#C3CEDD">≈ <strong style="color:#fff"><span data-out="dias"></span> dias de trabalho</strong> de uma pessoa, ou <strong style="color:#fff" data-out="custo"></strong> por mês em tarefas que o Oasys automatiza.</p>' +
      '<div style="display:flex;flex-direction:column;gap:10px;font-size:15px">' +
      '<div style="display:flex;justify-content:space-between;gap:12px"><span style="color:#C3CEDD">Digitando nota de entrada</span><strong class="oz-num"><span data-out="hn"></span> h</strong></div>' +
      '<div class="oz-trilho" aria-hidden="true" style="height:8px"><div data-bar="pn"></div></div>' +
      '<div style="display:flex;justify-content:space-between;gap:12px"><span style="color:#C3CEDD">Montando orçamento à mão</span><strong class="oz-num"><span data-out="ho"></span> h</strong></div>' +
      '<div class="oz-trilho" aria-hidden="true" style="height:8px"><div data-bar="po"></div></div>' +
      '</div>' +
      '<form data-calc-form novalidate style="display:flex;flex-direction:column;gap:10px;margin-top:auto;padding-top:8px;border-top:1px solid #2A3A52" data-endpoint="/leads.php">' +
      '<div data-campos style="display:flex;flex-direction:column;gap:10px">' +
      '<label style="display:flex;flex-direction:column;gap:6px;font-weight:600;font-size:15px">Receba o diagnóstico completo por e-mail' +
      '<input type="email" name="email" autocomplete="email" placeholder="seu@email.com.br" required style="min-height:48px;padding:10px 14px;border:1.5px solid #3B5A8C;background:#17263C;color:#fff;border-radius:10px;font-size:17px"></label>' +
      '<span data-erro role="alert" hidden style="font-size:14px;color:#FFB4A8">Confira o e-mail digitado.</span>' +
      '<button type="submit" class="oz-primario" style="font-size:17px">Quero meu diagnóstico</button>' +
      '</div>' +
      '<div data-ok hidden tabindex="-1" role="status" style="padding:16px;border-radius:12px;background:#17263C;border:1px solid #3B5A8C">Pronto! O diagnóstico vai para o seu e-mail. Se quiser adiantar, <a href="#demo" style="color:#fff;font-weight:700">agende uma demonstração</a>.</div>' +
      '</form>' +
      '</div></div>';

    function faixa(k, rotulo, min, max, step) {
      return '<label style="display:flex;flex-direction:column;gap:8px"><span style="display:flex;justify-content:space-between;gap:12px;font-weight:600"><span>' + rotulo + '</span><strong class="oz-num" style="color:var(--azul)" data-out="v-' + k + '"></strong></span>' +
        '<input class="oz-range" type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + s[k] + '" data-in="' + k + '"></label>';
    }
    function atualizar() {
      var mn = s.notas * s.itens, mo = s.orc * 22 * 5, tot = mn + mo, horas = Math.round(tot / 60);
      var set = function (k, v) { el.querySelector('[data-out="' + k + '"]').textContent = v; };
      set('v-notas', s.notas); set('v-itens', s.itens); set('v-orc', s.orc); set('v-hora', brl(s.hora, 0));
      set('horas', horas.toLocaleString('pt-BR')); set('dias', Math.round(horas / 8)); set('custo', brl(horas * s.hora, 0));
      set('hn', Math.round(mn / 60)); set('ho', Math.round(mo / 60));
      el.querySelector('[data-bar="pn"]').style.width = (tot ? Math.round(mn / tot * 100) : 0) + '%';
      el.querySelector('[data-bar="po"]').style.width = (tot ? Math.round(mo / tot * 100) : 0) + '%';
    }
    el.addEventListener('input', function (e) {
      var k = e.target.getAttribute('data-in');
      if (k) { s[k] = Number(e.target.value); atualizar(); }
    });
    var form = el.querySelector('[data-calc-form]');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = form.querySelector('[name="email"]');
      var erro = form.querySelector('[data-erro]');
      if (!/^\S+@\S+\.\S+$/.test(email.value)) { erro.hidden = false; email.focus(); return; }
      erro.hidden = true;
      enviarLead(form, { email: email.value, origem: 'calculadora', notas_mes: s.notas, itens_nota: s.itens, orcamentos_dia: s.orc, custo_hora: s.hora }, function () {
        if (window.posthog && window.posthog.identify) window.posthog.identify(email.value, { email: email.value });
        track('lead_calculadora');
        form.querySelector('[data-campos]').hidden = true;
        var ok = form.querySelector('[data-ok]'); ok.hidden = false; ok.focus();
      });
    });
    atualizar();
  };

  /* ---------- Simulador de conversão de estoque ---------- */
  widgets['sim-estoque'] = function (el) {
    var lista = [
      { nome: 'Ferro 10 mm', compra: 'barras', venda: 'metros', fator: 12 },
      { nome: 'Cimento CP II', compra: 'toneladas', venda: 'sacos', fator: 20 },
      { nome: 'Fio 2,5 mm', compra: 'rolos', venda: 'metros', fator: 100 }
    ];
    var s = { p: 0, qtd: 5, vendido: 0 };
    el.innerHTML =
      '<div class="oz-caixa"><div class="oz-col" style="flex-basis:420px;gap:20px">' +
      '<span class="oz-tag">Teste agora</span>' +
      '<h2 class="oz-h2">Compre numa unidade, venda em outra. Veja o estoque bater.</h2>' +
      '<div role="group" aria-label="Escolha o produto" style="display:flex;flex-wrap:wrap;gap:8px" data-part="pills"></div>' +
      '<label style="display:flex;flex-direction:column;gap:8px"><span style="display:flex;justify-content:space-between;gap:12px;font-weight:600"><span>Quantidade comprada</span><strong class="oz-num" style="color:var(--azul)" data-out="qtd"></strong></span>' +
      '<input class="oz-range" type="range" min="1" max="20" step="1" value="5" data-in="qtd"></label>' +
      '<div style="display:flex;flex-wrap:wrap;gap:10px"><button type="button" class="oz-primario" style="font-size:16px;min-height:48px;padding:12px 18px" data-act="v1"></button>' +
      '<button type="button" class="oz-secundario" data-act="v10">Vender 10</button>' +
      '<button type="button" class="oz-link" data-act="zerar">Recomeçar</button></div>' +
      '<p class="oz-nota">Exemplo ilustrativo. No Oasys você define a conversão de cada produto uma vez.</p>' +
      '</div><div class="oz-escuro" style="flex:1 1 360px;min-width:0">' +
      linha('Entrada pela nota', 'entrada') + linha('Convertido para venda', 'conv') + linha('Vendido', 'vend') +
      '<div style="border-top:1px solid #2A3A52;padding-top:16px;display:flex;flex-direction:column;gap:10px">' +
      '<span style="font-size:14px;font-weight:700;color:#C3CEDD;text-transform:uppercase;letter-spacing:.06em">Saldo em estoque</span>' +
      '<div aria-live="polite" style="font-family:\'Schibsted Grotesk\',sans-serif;font-weight:800;font-size:56px;line-height:1;letter-spacing:-.03em"><span data-out="saldo"></span><span style="font-size:22px;color:#C3CEDD;letter-spacing:0"> <span data-out="un"></span></span></div>' +
      '<div class="oz-trilho" aria-hidden="true"><div data-bar="saldo"></div></div>' +
      '<span style="font-size:15px;color:var(--claro);font-weight:700" data-out="msg"></span></div></div></div>';
    function linha(t, k) { return '<div style="display:flex;justify-content:space-between;gap:12px;color:#C3CEDD;font-size:15px"><span>' + t + '</span><strong style="color:#fff" data-out="' + k + '"></strong></div>'; }
    function atualizar() {
      var a = lista[s.p], tot = s.qtd * a.fator, vend = Math.min(s.vendido, tot), saldo = tot - vend;
      var set = function (k, v) { el.querySelector('[data-out="' + k + '"]').textContent = v; };
      set('qtd', s.qtd + ' ' + a.compra); set('entrada', s.qtd + ' ' + a.compra);
      set('conv', tot.toLocaleString('pt-BR') + ' ' + a.venda); set('vend', vend.toLocaleString('pt-BR') + ' ' + a.venda);
      set('saldo', saldo.toLocaleString('pt-BR')); set('un', a.venda);
      set('msg', saldo === 0 ? 'Zerou no sistema e na prateleira. Os dois batem.' : 'Sistema e prateleira batendo.');
      el.querySelector('[data-bar="saldo"]').style.width = (tot ? Math.round(saldo / tot * 100) : 0) + '%';
      el.querySelector('[data-act="v1"]').textContent = 'Vender 1 ' + a.venda.replace(/s$/, '');
      montar(el.querySelector('[data-part="pills"]'), lista.map(function (x, i) {
        return '<button type="button" class="oz-pill" data-k="p' + i + '" data-p="' + i + '" aria-pressed="' + (i === s.p) + '">' + esc(x.nome) + '</button>';
      }).join(''));
    }
    el.addEventListener('input', function (e) { if (e.target.getAttribute('data-in') === 'qtd') { s.qtd = Number(e.target.value); s.vendido = 0; atualizar(); } });
    el.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var tot = s.qtd * lista[s.p].fator;
      if (b.hasAttribute('data-p')) { s.p = Number(b.getAttribute('data-p')); s.vendido = 0; }
      else if (b.dataset.act === 'v1') s.vendido = Math.min(s.vendido + 1, tot);
      else if (b.dataset.act === 'v10') s.vendido = Math.min(s.vendido + 10, tot);
      else if (b.dataset.act === 'zerar') s.vendido = 0;
      atualizar();
    });
    atualizar();
  };

  /* ---------- Simulação de entrada de NF-e ---------- */
  widgets['sim-nota'] = function (el) {
    var itens = [
      ['Cimento CP II 50 kg', '200 sc', '2523.29.10'], ['Vergalhão CA-50 10 mm', '120 br', '7214.20.00'],
      ['Tubo PVC 100 mm', '48 un', '3917.23.00'], ['Argamassa AC-II 20 kg', '150 sc', '3824.50.00'], ['Fio de cobre 2,5 mm', '20 rl', '8544.49.00']
    ];
    var s = { passo: 0, rodando: false }, timer = null, n = itens.length;
    function render() {
      var feito = s.passo >= n;
      var linhas = itens.map(function (it, i) {
        var ok = i < s.passo || feito;
        return '<div role="row" class="oz-nota-linha" style="padding:10px;border-radius:10px;transition:background .3s ease;background:' + (ok ? '#fff' : 'transparent') + ';border:1px solid ' + (ok ? 'var(--linha)' : 'transparent') + '">' +
          '<span role="cell">' + it[0] + '</span><span role="cell">' + it[1] + '</span><span role="cell" style="font-variant-numeric:tabular-nums;font-weight:700;color:var(--azul-esc)">' + (ok ? it[2] : '········') + '</span></div>';
      }).join('');
      montar(el,
        '<div class="oz-caixa"><div class="oz-col" style="flex-basis:360px;gap:20px">' +
        '<span class="oz-tag">Teste agora</span>' +
        '<h2 class="oz-h2">Aperte o botão e veja uma nota entrando sem ninguém digitar.</h2>' +
        '<p style="margin:0;color:var(--texto)">É assim que o Oasys trata cada NF-e de compra emitida contra o seu CNPJ.</p>' +
        '<button type="button" class="oz-primario" data-k="go" data-act="go" style="align-self:flex-start"' + (s.rodando ? ' disabled' : '') + '>' + (feito ? 'Importar de novo' : (s.rodando ? 'Importando…' : 'Buscar nota na Sefaz')) + '</button>' +
        '<p class="oz-nota">Exemplo ilustrativo de nota de materiais de construção.</p></div>' +
        '<div style="flex:1 1 460px;min-width:0;background:var(--fundo);border:1px solid var(--linha);border-radius:22px;padding:22px;display:flex;flex-direction:column;gap:12px">' +
        '<div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><strong>NF-e de compra · Fornecedor de Tintas Ltda</strong><span class="oz-tag" style="font-size:13px;padding:4px 10px">' + (feito ? 'Importada' : (s.rodando ? 'Importando…' : 'Na Sefaz')) + '</span></div>' +
        '<div aria-hidden="true" style="height:8px;background:var(--linha);border-radius:99px;overflow:hidden"><div style="height:100%;width:' + ((s.rodando || feito) ? Math.round(Math.min(s.passo, n) / n * 100) : 0) + '%;background:var(--azul);border-radius:99px;transition:width .4s ease"></div></div>' +
        '<div role="table" aria-label="Itens da nota" style="display:flex;flex-direction:column;gap:6px;font-size:15px">' +
        '<div role="row" class="oz-nota-linha oz-nota-cab" style="font-size:13px;font-weight:700;color:var(--suave);text-transform:uppercase;letter-spacing:.04em;padding:0 10px"><span role="columnheader">Item</span><span role="columnheader">Qtd</span><span role="columnheader">NCM</span></div>' + linhas + '</div>' +
        '<div aria-live="polite" style="border-top:1px solid var(--linha);padding-top:12px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:15px"><span>' + (feito ? 'Estoque atualizado ✓' : (s.rodando ? 'Preenchendo dados fiscais…' : 'Aguardando importação')) + '</span><span>Itens digitados à mão: <strong>0</strong></span></div>' +
        '</div></div>');
    }
    el.addEventListener('click', function (e) {
      if (!e.target.closest('[data-act="go"]') || s.rodando) return;
      clearInterval(timer); s.passo = 0; s.rodando = true; render();
      track('interacao_simulador', { simulador: 'nota' });
      timer = setInterval(function () {
        s.passo++;
        if (s.passo >= n) { clearInterval(timer); s.rodando = false; }
        render();
      }, 550);
    });
    render();
  };

  /* ---------- Simulação do Oasys Chat ---------- */
  widgets['sim-chat'] = function (el) {
    var lista = [['Cimento CP II 50 kg × 20', 38.9, 20], ['Ferro 10 mm (barra) × 10', 52, 10], ['Argamassa AC-II 20 kg × 30', 24.5, 30]];
    var s = { sel: [false, false, false], enviado: false, respondido: false }, t = null;
    function render() {
      var qtd = s.sel.filter(Boolean).length;
      var esc2 = lista.filter(function (x, i) { return s.sel[i]; });
      var total = esc2.reduce(function (a, x) { return a + x[1] * x[2]; }, 0);
      montar(el,
        '<div class="oz-caixa"><div class="oz-col" style="flex-basis:400px">' +
        '<span class="oz-tag">Teste agora · você é o atendente</span>' +
        '<h2 class="oz-h2">Monte o orçamento sem sair da conversa.</h2>' +
        '<p style="margin:0;color:var(--texto)">Toque nos produtos que o cliente pediu e envie.</p>' +
        '<div style="display:flex;flex-direction:column;gap:8px">' + lista.map(function (x, i) {
          return '<button type="button" data-k="i' + i + '" data-i="' + i + '" aria-pressed="' + s.sel[i] + '"' + (s.enviado ? ' disabled' : '') + ' style="display:flex;justify-content:space-between;gap:12px;align-items:center;text-align:left;padding:12px 16px;border-radius:12px;min-height:48px;cursor:pointer;font-size:16px;' +
            (s.sel[i] ? 'background:#E8EEFF;color:var(--azul-esc);border:1.5px solid var(--azul)' : 'background:#fff;color:var(--tinta);border:1.5px solid #CBD5E1') + '"><span>' + x[0] + '</span><span style="font-weight:700;font-size:14px;white-space:nowrap">' + (s.sel[i] ? '✓ no orçamento' : '+ adicionar') + '</span></button>';
        }).join('') + '</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center"><button type="button" class="oz-primario" data-k="env" data-act="env"' + ((s.enviado || !qtd) ? ' disabled' : '') + '>Enviar orçamento</button>' +
        '<button type="button" class="oz-link" data-k="re" data-act="re">Recomeçar</button></div>' +
        '<p class="oz-nota">Preços ilustrativos. No Oasys Chat entram os produtos e a tabela de preço do seu sistema.</p></div>' +
        '<div style="flex:1 1 380px;min-width:0;background:#EEF3FF;border-radius:22px;padding:18px;display:flex;flex-direction:column;gap:10px;min-height:420px" aria-live="polite">' +
        '<div style="display:flex;align-items:center;gap:10px;padding-bottom:10px;border-bottom:1px solid #D5E0FF"><span style="width:36px;height:36px;border-radius:50%;background:#D5E0FF;flex:none"></span><div><div style="font-weight:700;font-size:15px">Mateus Andrez</div><div style="font-size:13px;color:var(--suave)">via WhatsApp</div></div></div>' +
        '<div class="oz-bolha-cli" style="animation:none">Bom dia! Preciso de 20 sacos de cimento, 10 barras de ferro 10 mm e 30 de argamassa. Quanto fica?</div>' +
        (!s.enviado && qtd ? '<div style="align-self:flex-end;font-size:13px;color:var(--suave);padding:4px 8px">Atendente montando orçamento… ' + qtd + ' de 3 itens</div>' : '') +
        (s.enviado ? '<div class="oz-bolha-at"><div style="display:flex;justify-content:space-between;font-weight:700;color:var(--azul-esc)"><span>Orçamento</span><span>Oasys</span></div>' +
          esc2.map(function (x) { return '<div style="display:flex;justify-content:space-between;gap:10px"><span>' + x[0] + '</span><strong>' + brl(x[1] * x[2]) + '</strong></div>'; }).join('') +
          '<div style="display:flex;justify-content:space-between;border-top:1px solid var(--linha);padding-top:6px;font-weight:700"><span>Total</span><span>' + brl(total) + '</span></div></div>' : '') +
        (s.respondido ? '<div class="oz-bolha-cli">Fechado, pode separar!</div>' : '') +
        '</div></div>');
    }
    el.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || b.disabled) return;
      if (b.hasAttribute('data-i')) { var i = Number(b.getAttribute('data-i')); s.sel[i] = !s.sel[i]; }
      else if (b.dataset.act === 'env') { s.enviado = true; track('interacao_simulador', { simulador: 'chat' }); t = setTimeout(function () { s.respondido = true; render(); }, 1100); }
      else if (b.dataset.act === 're') { clearTimeout(t); s = { sel: [false, false, false], enviado: false, respondido: false }; }
      render();
    });
    render();
  };

  /* ---------- Régua de cobrança ---------- */
  widgets['sim-regua'] = function (el) {
    var etapas = [['3 dias antes', 'Lembrete de vencimento'], ['No dia', 'Aviso de vencimento'], ['1 dia depois', 'Cobrança'], ['7 dias depois', 'Segunda cobrança']];
    var textos = {
      amigavel: [
        ['Seu boleto vence em 3 dias', 'Oi, [Cliente]! Passando só pra lembrar que o título da sua compra vence em 3 dias.\nQualquer dúvida, é só responder este e-mail.'],
        ['Seu boleto vence hoje', 'Oi, [Cliente]! Hoje é o vencimento do título da sua compra.\nSe já pagou, desconsidere esta mensagem.'],
        ['Notamos um título em aberto', 'Oi, [Cliente]! O título da sua compra venceu ontem e ainda consta em aberto.\nPrecisa de uma segunda via? É só responder.'],
        ['Seu título segue em aberto', 'Oi, [Cliente]! O título da sua compra está em aberto há 7 dias.\nVamos acertar? Responda este e-mail que a gente ajuda.']
      ],
      direto: [
        ['Vencimento em 3 dias', '[Cliente], o título da sua compra vence em 3 dias.'],
        ['Vencimento hoje', '[Cliente], o título da sua compra vence hoje.'],
        ['Título vencido', '[Cliente], o título da sua compra venceu ontem. Regularize o pagamento.'],
        ['Título vencido há 7 dias', '[Cliente], o título da sua compra está vencido há 7 dias. Entre em contato para regularizar.']
      ]
    };
    var s = { on: [true, true, true, false], ver: 0, tom: 'amigavel' };
    function render() {
      var at = textos[s.tom][s.ver];
      montar(el,
        '<div class="oz-caixa"><div class="oz-col" style="flex-basis:400px">' +
        '<span class="oz-tag">Teste agora</span><h2 class="oz-h2">Monte sua régua de cobrança em 10 segundos.</h2>' +
        '<p style="margin:0;color:var(--texto)">Ligue os envios que fazem sentido pra sua loja e toque em um deles pra ver o e-mail.</p>' +
        '<div style="display:flex;flex-direction:column;gap:8px">' + etapas.map(function (e, i) {
          return '<div style="display:flex;align-items:center;gap:12px;padding:4px 12px;border-radius:14px;border:1.5px solid ' + (s.ver === i ? 'var(--azul)' : 'var(--linha)') + ';background:' + (s.ver === i ? '#F5F8FF' : '#fff') + '">' +
            '<button type="button" class="oz-switch" role="switch" data-k="sw' + i + '" data-sw="' + i + '" aria-checked="' + s.on[i] + '" aria-label="' + (s.on[i] ? 'Desligar ' : 'Ligar ') + e[0] + '"><span></span></button>' +
            '<button type="button" data-k="v' + i + '" data-v="' + i + '" style="flex:1;text-align:left;background:transparent;border:0;font-size:16px;cursor:pointer;padding:8px 4px;min-height:44px;color:var(--tinta)"><strong>' + e[0] + '</strong><span style="display:block;font-size:14px;color:var(--suave)">' + e[1] + '</span></button></div>';
        }).join('') + '</div>' +
        '<div role="radiogroup" aria-label="Tom das mensagens" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><span style="font-weight:600;font-size:15px;margin-right:4px">Tom:</span>' +
        '<button type="button" class="oz-pill" role="radio" data-k="ta" data-tom="amigavel" aria-checked="' + (s.tom === 'amigavel') + '">Amigável</button>' +
        '<button type="button" class="oz-pill" role="radio" data-k="td" data-tom="direto" aria-checked="' + (s.tom === 'direto') + '">Direto</button></div></div>' +
        '<div class="oz-col" style="gap:14px">' +
        '<div style="background:var(--tinta);color:#fff;border-radius:18px;padding:18px 22px;display:flex;justify-content:space-between;gap:12px;align-items:center"><span style="color:#C3CEDD;font-size:15px">Envios automáticos por título</span><strong style="font-family:\'Schibsted Grotesk\',sans-serif;font-size:32px">' + s.on.filter(Boolean).length + '</strong></div>' +
        '<div aria-live="polite" style="flex:1;background:var(--fundo);border:1px solid var(--linha);border-radius:18px;padding:22px;display:flex;flex-direction:column;gap:10px">' +
        '<div style="font-size:13px;color:var(--suave)">De: [Sua loja] · Para: [cliente]@email.com</div>' +
        '<div style="font-weight:700;font-size:18px">' + at[0] + '</div><p style="margin:0;color:var(--texto);white-space:pre-line">' + at[1] + '</p>' +
        (!s.on[s.ver] ? '<span style="font-size:14px;color:#B42318;font-weight:700">Este envio está desligado.</span>' : '') +
        '</div><p class="oz-nota">Exemplo ilustrativo. [Confirmar dias e personalização disponíveis no Oasys.]</p></div></div>');
    }
    el.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-sw')) { var i = Number(b.getAttribute('data-sw')); s.on[i] = !s.on[i]; s.ver = i; track('interacao_simulador', { simulador: 'regua' }); }
      else if (b.hasAttribute('data-v')) s.ver = Number(b.getAttribute('data-v'));
      else if (b.hasAttribute('data-tom')) s.tom = b.getAttribute('data-tom');
      render();
    });
    render();
  };

  /* ---------- Painéis do Oasys Finance ---------- */
  widgets['sim-finance'] = function (el) {
    var abas = ['inicio', 'fluxo', 'estoque', 'margem'];
    var nomes = { inicio: 'Início', fluxo: 'Fluxo de caixa', estoque: 'Estoque parado', margem: 'Margem' };
    var vencidos = {
      receber: { total: 3210, inadimplencia: 4.2, faixas: [['1 a 30 dias', 1840, 100, 'var(--claro)'], ['31 a 60 dias', 900, 49, '#F2C94C'], ['61 a 90 dias', 320, 17, '#F2A65A'], ['Mais de 90 dias', 150, 8, '#F87171']] },
      pagar: { total: 1980, inadimplencia: 2.6, faixas: [['1 a 30 dias', 1100, 100, 'var(--claro)'], ['31 a 60 dias', 620, 56, '#F2C94C'], ['61 a 90 dias', 260, 24, '#F2A65A'], ['Mais de 90 dias', 0, 0, '#F87171']] }
    };
    var estoqueParado = { '30': { valor: 9840, pct: 1.1 }, '60': { valor: 14260, pct: 1.6 }, '90': { valor: 18900, pct: 2.1 }, '180': { valor: 24350, pct: 2.7 } };
    var totalEstoque = 892400, produtosAtivos = 4180;
    var imobilizado = [['Ferro 10 mm', '210 un. · 96 dias', 3780], ['Argamassa AC-II 20 kg', '140 un. · 74 dias', 1610], ['Tubo PVC 100 mm', '38 un. · 58 dias', 980]];
    var sugestaoCompra = [['Cimento CP II 50 kg', 'Saída média 3 un./dia · cobre 20 dias', '60 un.'], ['Areia média (m³)', 'Abaixo do mínimo (5)', '8 un.']];
    var margemGeral = { bruta: 34.5, lucro: 4930, custo: 9350, receita: 14280 };
    var margemVisoes = {
      produto: { label: 'Produto', itens: [['Cimento CP II 50 kg', 38, 1280], ['Argamassa AC-II 20 kg', 44, 860], ['Ferro 10 mm', 22, 640], ['Tubo PVC 100 mm', 31, 410]] },
      vendedor: { label: 'Vendedor', itens: [['Marina Souza', 41, 2210], ['João Pedro', 36, 1840], ['Carlos Lima', 29, 1120]] },
      categoria: { label: 'Categoria', itens: [['Ferragens', 39, 1980], ['Materiais de construção', 34, 3650], ['Hidráulica', 27, 760]] }
    };
    var s = { aba: 'inicio', vencTipo: 'receber', periodo: '60', visao: 'produto', pedidoGerado: false };

    function pct1(v) { return v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
    function tile(rotulo, valor, nota, corNota) {
      return '<div style="background:#16263F;border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:4px">' +
        '<span style="font-size:10.5px;font-weight:700;letter-spacing:.04em;color:#8295B5">' + rotulo + '</span>' +
        '<strong style="font-size:16.5px;color:#fff">' + valor + '</strong>' +
        '<span style="font-size:11.5px;color:' + (corNota || '#8295B5') + '">' + nota + '</span></div>';
    }
    function linhaAtencao(label, valor, cor) {
      return '<div style="display:flex;justify-content:space-between;align-items:center;background:#16263F;border-radius:12px;padding:12px 14px;font-size:13.5px"><span style="color:#D7E2EF">' + label + '</span><strong style="color:' + cor + '">' + valor + '</strong></div>';
    }
    function rotulo(t) { return '<span style="font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#8295B5;margin-top:4px">' + t + '</span>'; }

    function inicioHtml() {
      return '<div style="border:1px solid #3B2E8C;background:#1A1640;border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:8px">' +
        '<span style="display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#B9ACFF">✦ Resumo do mês · Neuron</span>' +
        '<p style="margin:0;font-size:14px;line-height:1.5;color:#fff">Você tem <strong>R$ 42,8 mil a receber</strong> e <strong>R$ 26,1 mil a pagar</strong> até o fim do mês. Nos próximos 7 dias saem <strong>R$ 2,4 mil a mais</strong> do que entram, e 2 fornecedores já estão vencidos.</p>' +
        '<button type="button" data-ir="fluxo" style="align-self:flex-start;background:transparent;border:0;color:#B9ACFF;font-weight:700;font-size:13px;cursor:pointer;padding:4px 0">Ver fluxo projetado →</button></div>' +
        rotulo('Precisa de atenção') +
        '<div style="display:flex;flex-direction:column;gap:8px">' +
        linhaAtencao('Caixa dos próximos 7 dias', brl(-2412.5), '#F2A65A') +
        linhaAtencao('Contas a pagar vencidas', '2', '#F87171') +
        linhaAtencao('Produtos com estoque negativo', '1', '#F87171') + '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
        tile('VENDAS NO MÊS', brl(14280), '▲ 8,2% vs mês ant.', '#3DD68C') +
        tile('TICKET MÉDIO', brl(189.4), '▼ 1,5% vs mês ant.', '#F2A65A') +
        tile('A RECEBER', brl(42830), brl(6150) + ' em 7 dias', null) +
        tile('A PAGAR', brl(26140), brl(4820) + ' em 7 dias', null) + '</div>';
    }

    function fluxoHtml() {
      var v = vencidos[s.vencTipo];
      return '<div style="display:flex;justify-content:space-between;gap:10px">' +
        '<div><span style="font-size:10.5px;font-weight:700;letter-spacing:.04em;color:#8295B5">SALDO HOJE</span><div style="font-size:21px;font-weight:800;color:#fff">' + brl(58420) + '</div></div>' +
        '<div style="text-align:right"><span style="font-size:10.5px;font-weight:700;letter-spacing:.04em;color:#8295B5">PROJETADO EM 30 DIAS</span><div style="font-size:21px;font-weight:800;color:#3DD68C">' + brl(63990) + '</div></div></div>' +
        '<div aria-hidden="true" style="display:flex;align-items:flex-end;gap:10px;height:70px"><span style="flex:1;display:block;height:62%;background:#3B5A8C;border-radius:4px 4px 0 0"></span><span style="flex:1;display:block;height:40%;background:#F2A65A;border-radius:4px 4px 0 0"></span><span style="flex:1;display:block;height:100%;background:var(--claro);border-radius:4px 4px 0 0"></span></div>' +
        '<div style="display:flex;justify-content:space-between;font-size:11px;color:#8295B5">' +
        '<span>Hoje · ' + brl(58420) + '</span><span>Dia 7</span><span>Dia 30 · ' + brl(63990) + '</span></div>' +
        '<div style="background:#3A2A12;border:1px solid #5C3F17;border-radius:12px;padding:12px 14px;display:flex;gap:10px;align-items:flex-start">⚠<p style="margin:0;font-size:13px;color:#F4D9B0;line-height:1.5">Nos próximos 7 dias saem <strong>' + brl(4820) + '</strong> e entram <strong>' + brl(2407.5) + '</strong>. Antecipe recebíveis ou renegocie um vencimento.</p></div>' +
        rotulo('Vencidos por faixa') +
        '<div class="oz-seg" role="radiogroup" aria-label="Tipo de vencido" style="align-self:flex-start">' +
        '<button type="button" role="radio" data-k="vr" data-venc="receber" aria-checked="' + (s.vencTipo === 'receber') + '">A receber</button>' +
        '<button type="button" role="radio" data-k="vp" data-venc="pagar" aria-checked="' + (s.vencTipo === 'pagar') + '">A pagar</button></div>' +
        '<div style="display:flex;justify-content:space-between;align-items:baseline"><div><span style="font-size:10.5px;font-weight:700;color:#8295B5;letter-spacing:.04em">TOTAL VENCIDO</span><div style="font-size:19px;font-weight:800;color:#fff">' + brl(v.total) + '</div></div>' +
        '<div style="text-align:right"><span style="font-size:10.5px;font-weight:700;color:#8295B5;letter-spacing:.04em">INADIMPLÊNCIA</span><div style="font-size:19px;font-weight:800;color:#F2A65A">' + pct1(v.inadimplencia) + '%</div></div></div>' +
        '<div style="display:flex;flex-direction:column;gap:10px">' + v.faixas.map(function (f) {
          return '<div style="display:flex;flex-direction:column;gap:4px"><div style="display:flex;justify-content:space-between;font-size:13px;color:#D7E2EF"><span>' + f[0] + '</span><strong style="color:#fff">' + brl(f[1]) + '</strong></div><div class="oz-trilho" aria-hidden="true"><div style="width:' + f[2] + '%;background:' + f[3] + '"></div></div></div>';
        }).join('') + '</div>';
    }

    function estoqueHtml() {
      var d = estoqueParado[s.periodo];
      return '<div class="oz-seg" role="radiogroup" aria-label="Período parado" style="flex-wrap:wrap;align-self:flex-start">' + ['30', '60', '90', '180'].map(function (p) {
        return '<button type="button" role="radio" data-k="pz' + p + '" data-periodo="' + p + '" aria-checked="' + (s.periodo === p) + '">+' + p + 'd</button>';
      }).join('') + '</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:10px">' +
        '<div><span style="font-size:10.5px;font-weight:700;letter-spacing:.04em;color:#8295B5">PARADO HÁ +' + s.periodo + ' DIAS</span><div style="font-size:22px;font-weight:800;color:#F2A65A">' + brl(d.valor) + '</div></div>' +
        '<div style="text-align:right"><span style="font-size:10.5px;font-weight:700;letter-spacing:.04em;color:#8295B5">DO ESTOQUE TOTAL</span><div style="font-size:18px;font-weight:800;color:#fff">' + pct1(d.pct) + '%</div></div></div>' +
        '<div class="oz-trilho" aria-hidden="true"><div style="width:' + (d.pct * 10) + '%;background:#F2A65A"></div></div>' +
        '<span style="font-size:11.5px;color:#8295B5">Estoque total a custo: ' + brl(totalEstoque) + ' · ' + produtosAtivos.toLocaleString('pt-BR') + ' produtos ativos</span>' +
        rotulo('Maior valor imobilizado') +
        '<div style="display:flex;flex-direction:column;gap:8px">' + imobilizado.map(function (x, i) {
          return '<div style="display:flex;align-items:center;gap:10px;background:#16263F;border-radius:12px;padding:10px 12px"><span style="width:18px;color:#8295B5;font-weight:700;font-size:13px">' + (i + 1) + '</span><div style="flex:1;min-width:0"><strong style="display:block;font-size:13.5px;color:#fff">' + x[0] + '</strong><span style="font-size:11.5px;color:#8295B5">' + x[1] + '</span></div><strong style="font-size:13.5px;color:#fff;white-space:nowrap">' + brl(x[2]) + '</strong></div>';
        }).join('') + '</div>' +
        rotulo('Sugestão de compra') +
        '<div style="display:flex;flex-direction:column;gap:8px">' + sugestaoCompra.map(function (x) {
          return '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;background:#16263F;border-radius:12px;padding:10px 12px"><div><strong style="display:block;font-size:13.5px;color:#fff">' + x[0] + '</strong><span style="font-size:11.5px;color:#8295B5">' + x[1] + '</span></div><strong style="font-size:13.5px;color:var(--claro);white-space:nowrap">' + x[2] + '</strong></div>';
        }).join('') + '</div>' +
        '<button type="button" class="oz-primario" style="width:100%;margin-top:4px" data-act="comprar"' + (s.pedidoGerado ? ' disabled' : '') + '>' + (s.pedidoGerado ? '✓ Pedido gerado' : 'Gerar pedido de compra') + '</button>';
    }

    function margemHtml() {
      var v = margemVisoes[s.visao];
      return '<div class="oz-seg" role="radiogroup" aria-label="Agrupar margem por" style="flex-wrap:wrap;align-self:flex-start">' + Object.keys(margemVisoes).map(function (k) {
        return '<button type="button" role="radio" data-k="mv' + k + '" data-visao="' + k + '" aria-checked="' + (s.visao === k) + '">' + margemVisoes[k].label + '</button>';
      }).join('') + '</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:10px">' +
        '<div><span style="font-size:10.5px;font-weight:700;letter-spacing:.04em;color:#8295B5">MARGEM BRUTA</span><div style="font-size:24px;font-weight:800;color:#fff">' + pct1(margemGeral.bruta) + '%</div></div>' +
        '<div style="text-align:right"><span style="font-size:10.5px;font-weight:700;letter-spacing:.04em;color:#8295B5">LUCRO BRUTO</span><div style="font-size:18px;font-weight:800;color:#3DD68C">' + brl(margemGeral.lucro) + '</div></div></div>' +
        '<div class="oz-trilho" aria-hidden="true"><div style="width:' + margemGeral.bruta + '%;background:#3DD68C"></div></div>' +
        '<div style="display:flex;justify-content:space-between;font-size:11.5px;color:#8295B5"><span>Custo ' + brl(margemGeral.custo) + '</span><span>Receita ' + brl(margemGeral.receita) + '</span></div>' +
        rotulo('Margem por ' + v.label.toLowerCase()) +
        '<div style="display:flex;flex-direction:column;gap:10px">' + v.itens.map(function (x) {
          var cor = x[1] >= 35 ? '#3DD68C' : x[1] >= 25 ? '#F2C94C' : '#F2A65A';
          return '<div style="display:flex;flex-direction:column;gap:4px"><div style="display:flex;justify-content:space-between;font-size:13px;color:#fff"><strong style="font-weight:600">' + x[0] + '</strong><strong style="color:' + cor + '">' + x[1] + '%</strong></div><div class="oz-trilho" aria-hidden="true"><div style="width:' + x[1] + '%;background:' + cor + '"></div></div><span style="font-size:11px;color:#8295B5">' + brl(x[2]) + '</span></div>';
        }).join('') + '</div>';
    }

    function render() {
      var corpo = s.aba === 'inicio' ? inicioHtml() : s.aba === 'fluxo' ? fluxoHtml() : s.aba === 'estoque' ? estoqueHtml() : margemHtml();
      montar(el,
        '<div class="oz-caixa" style="align-items:center"><div class="oz-col" style="flex-basis:340px">' +
        '<span class="oz-tag">Teste agora</span><h2 class="oz-h2">Toque nas abas. É assim que o dono vê a empresa no celular.</h2>' +
        '<p style="margin:0;color:var(--texto)">Cada aba responde uma pergunta que hoje depende de planilha — vencidos, estoque parado, margem.</p><p class="oz-nota">Dados ilustrativos.</p></div>' +
        '<div style="flex:1 1 460px;min-width:0;display:flex;justify-content:center"><div class="oz-celular" style="width:100%;max-width:460px;background:var(--tinta);border-radius:36px;padding:12px;box-shadow:0 40px 80px -36px rgba(14,26,43,.55)">' +
        '<div class="oz-escuro-card" style="background:#0F1D33;color:#fff;border-radius:26px;padding:18px;display:flex;flex-direction:column;gap:14px">' +
        '<div role="tablist" aria-label="Painéis do Oasys Finance" style="display:flex;gap:6px;flex-wrap:wrap">' + abas.map(function (k) {
          return '<button type="button" role="tab" data-k="t' + k + '" data-aba="' + k + '" aria-selected="' + (k === s.aba) + '" style="font-size:12.5px;font-weight:700;padding:8px 11px;border-radius:999px;border:0;min-height:38px;cursor:pointer;white-space:nowrap;' + (k === s.aba ? 'background:var(--azul);color:#fff' : 'background:#1B2E4B;color:#C3CEDD') + '">' + nomes[k] + '</button>';
        }).join('') + '</div>' +
        '<div role="tabpanel" aria-live="polite" class="scroll-limpo" style="max-height:500px;overflow-y:auto;display:flex;flex-direction:column;gap:14px;padding-right:2px">' + corpo + '</div>' +
        '</div></div></div></div>');
    }
    el.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-aba')) { s.aba = b.getAttribute('data-aba'); track('interacao_simulador', { simulador: 'finance' }); }
      else if (b.hasAttribute('data-ir')) s.aba = b.getAttribute('data-ir');
      else if (b.hasAttribute('data-venc')) s.vencTipo = b.getAttribute('data-venc');
      else if (b.hasAttribute('data-periodo')) s.periodo = b.getAttribute('data-periodo');
      else if (b.hasAttribute('data-visao')) s.visao = b.getAttribute('data-visao');
      else if (b.dataset.act === 'comprar') { s.pedidoGerado = true; track('interacao_simulador', { simulador: 'finance' }); }
      else return;
      render();
    });
    el.addEventListener('keydown', function (e) {
      if (!e.target.closest('[role="tab"]')) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        var i = abas.indexOf(s.aba);
        i = (i + (e.key === 'ArrowRight' ? 1 : abas.length - 1)) % abas.length;
        s.aba = abas[i]; render();
        var t = el.querySelector('[data-aba="' + s.aba + '"]'); if (t) t.focus(); e.preventDefault();
      }
    });
    render();
  };

  /* ---------- Simulação do Sales App (Catálogo / Carrinho / Perfil, como o app real) ---------- */
  widgets['sim-pedido'] = function (el) {
    var tabelas = [['Varejo', 1], ['Revenda', 0.9], ['Obra', 0.93]];
    var prods = [
      { codigo: '5883', nome: 'Cimento CP II 50 kg', tag: 'Material', preco: 38.9, estoque: 40 },
      { codigo: '5876', nome: 'Argamassa AC-II 20 kg', tag: 'Material', preco: 24.5, estoque: 25 },
      { codigo: '5861', nome: 'Tubo PVC 100 mm', tag: 'Material', preco: 61, estoque: 8 }
    ];
    var s = { tab: 1, aba: 'catalogo', qtd: [0, 0, 0], aviso: '', enviado: false };

    var icoGrid = '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect></svg>';
    var icoCarrinho = '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>';
    var icoPerfil = '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
    var icoPacote = '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>';
    var icoFiltro = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"></path></svg>';
    var icoPdf = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>';
    var icoLixo = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';

    function navBtn(key, label, icone, badge) {
      var ativo = s.aba === key;
      return '<button type="button" data-k="nav-' + key + '" data-nav="' + key + '" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:9px 4px 7px;background:transparent;border:0;cursor:pointer;color:' + (ativo ? 'var(--azul)' : '#94A3B8') + ';font-size:11px;font-weight:700">' +
        '<span style="position:relative;display:inline-flex">' + icone + (badge ? '<span style="position:absolute;top:-6px;right:-9px;background:var(--azul);color:#fff;border-radius:999px;min-width:16px;height:16px;font-size:10px;display:flex;align-items:center;justify-content:center;padding:0 3px">' + badge + '</span>' : '') + '</span>' + label + '</button>';
    }

    function catalogoHtml(f) {
      return '<div style="padding:16px;display:flex;flex-direction:column;gap:12px">' +
        '<div style="background:var(--fundo);border-radius:14px;padding:12px 14px;display:flex;flex-direction:column;gap:8px">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px"><div><span style="font-size:11px;color:var(--suave);font-weight:700;text-transform:uppercase;letter-spacing:.03em">Cliente selecionado</span>' +
        '<div style="font-weight:700;font-size:14px;margin-top:2px">Mateus Andrez</div><div style="font-size:12px;color:var(--suave)">Rio do Sul</div></div>' +
        '<span style="width:28px;height:28px;border-radius:8px;background:var(--azul);color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;flex:none">+</span></div>' +
        '<label style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--texto)"><span style="width:15px;height:15px;border:1.5px solid #CBD5E1;border-radius:4px;display:inline-block;flex:none"></span>Mix do cliente</label></div>' +
        '<div style="display:flex;flex-direction:column;gap:6px"><span style="font-size:11px;color:var(--suave);font-weight:700;text-transform:uppercase;letter-spacing:.03em">Tabela de preço</span>' +
        '<div role="radiogroup" aria-label="Tabela de preço" style="display:flex;gap:6px;flex-wrap:wrap">' + tabelas.map(function (t, i) {
          return '<button type="button" class="oz-pill" role="radio" style="font-size:13px;padding:7px 13px;min-height:36px" data-k="tb' + i + '" data-tab="' + i + '" aria-checked="' + (i === s.tab) + '">' + t[0] + '</button>';
        }).join('') + '</div></div>' +
        '<div style="display:flex;gap:16px;border-bottom:1px solid var(--linha)"><span style="font-weight:700;font-size:13px;color:var(--azul);padding-bottom:8px;border-bottom:2px solid var(--azul)">Produtos</span><span style="font-weight:700;font-size:13px;color:var(--suave);padding-bottom:8px">Kits</span></div>' +
        '<div style="display:flex;gap:8px;align-items:center"><div style="flex:1;background:#fff;border:1px solid var(--linha);border-radius:10px;padding:9px 12px;font-size:13px;color:var(--suave)">Buscar por nome ou código…</div>' +
        '<span style="width:36px;height:36px;border-radius:10px;background:#F2A65A;display:flex;align-items:center;justify-content:center;flex:none">' + icoFiltro + '</span>' +
        '<span style="width:36px;height:36px;border-radius:10px;background:var(--azul);display:flex;align-items:center;justify-content:center;flex:none">' + icoPdf + '</span></div>' +
        '<span class="oz-tag" style="align-self:flex-start">' + prods.length + ' produto(s) carregado(s)</span>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' + prods.map(function (p, i) {
          return '<div style="background:#fff;border:1px solid var(--linha);border-radius:14px;padding:10px;display:flex;flex-direction:column;gap:6px">' +
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:4px"><span style="width:44px;height:44px;border-radius:10px;background:var(--fundo);display:flex;align-items:center;justify-content:center;color:#94A3B8;flex:none">' + icoPacote + '</span>' +
            '<span class="oz-tag" style="font-size:10px;padding:3px 7px;white-space:nowrap">' + p.tag + '</span></div>' +
            '<span style="font-size:11px;color:var(--suave)">' + p.codigo + '</span>' +
            '<strong style="font-size:12.5px;line-height:1.3;min-height:32px">' + p.nome + '</strong>' +
            '<span style="font-size:11px;color:var(--suave)">Qtd. disp.: ' + Math.max(p.estoque - s.qtd[i], 0) + '</span>' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:2px"><strong style="color:var(--azul);font-size:14px">' + brl(p.preco * f) + '</strong>' +
            '<button type="button" data-k="add' + i + '" data-add="' + i + '" aria-label="Adicionar ' + p.nome + '"' + (s.qtd[i] >= p.estoque ? ' disabled' : '') + ' style="width:28px;height:28px;border-radius:8px;border:0;background:var(--azul);color:#fff;font-size:16px;font-weight:700;cursor:pointer;flex:none">+</button></div></div>';
        }).join('') + '</div></div>';
    }

    function carrinhoHtml(f, totalItens, totalCarrinho) {
      var itens = prods.map(function (p, i) { return { p: p, i: i }; }).filter(function (x) { return s.qtd[x.i] > 0; });
      return '<div style="padding:16px;display:flex;flex-direction:column;gap:12px">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px"><div><strong style="font-family:\'Schibsted Grotesk\',sans-serif;font-size:18px">Carrinho (' + totalItens + ')</strong>' +
        '<div style="font-size:12px;color:var(--suave);margin-top:2px">Cliente: Mateus Andrez</div></div>' +
        '<button type="button" class="oz-secundario" style="font-size:12px;padding:7px 12px;min-height:34px;white-space:nowrap">Criar orçamento</button></div>' +
        '<div style="background:var(--fundo);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:4px"><span style="font-size:11px;color:var(--suave);font-weight:700;text-transform:uppercase;letter-spacing:.03em">Condição de pagamento</span><span style="font-size:13px;color:var(--suave)">Selecione uma condição</span></div>' +
        (itens.length ? '<div style="display:flex;flex-direction:column;gap:10px">' + itens.map(function (x) {
          var p = x.p, i = x.i;
          return '<div style="background:#fff;border:1px solid var(--linha);border-radius:14px;padding:12px;display:flex;gap:10px">' +
            '<span style="width:50px;height:50px;border-radius:10px;background:var(--fundo);display:flex;align-items:center;justify-content:center;color:#94A3B8;flex:none">' + icoPacote + '</span>' +
            '<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:3px"><span style="font-size:11px;color:var(--suave)">' + p.codigo + '</span>' +
            '<strong style="font-size:13.5px;line-height:1.3">' + p.nome + '</strong>' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:2px"><strong style="color:var(--azul);font-size:13.5px">' + brl(p.preco * f) + '</strong><div class="oz-step">' +
            '<button type="button" data-k="m' + i + '" data-menos="' + i + '" aria-label="Diminuir ' + p.nome + '" style="border:1.5px solid #CBD5E1;background:#fff;color:var(--tinta)">−</button>' +
            '<strong style="min-width:22px;text-align:center;font-variant-numeric:tabular-nums">' + s.qtd[i] + '</strong>' +
            '<button type="button" data-k="p' + i + '" data-mais="' + i + '" aria-label="Aumentar ' + p.nome + '"' + (s.qtd[i] >= p.estoque ? ' disabled' : '') + ' style="border:0;background:var(--azul);color:#fff">+</button></div></div>' +
            '<div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--linha);padding-top:6px;margin-top:2px"><span style="font-size:11px;color:var(--suave)">Total: <strong style="color:var(--tinta)">' + brl(p.preco * f * s.qtd[i]) + '</strong></span>' +
            '<button type="button" data-k="rm' + i + '" data-rm="' + i + '" aria-label="Remover ' + p.nome + '" style="background:transparent;border:0;color:#B42318;cursor:pointer;padding:4px">' + icoLixo + '</button></div></div></div>';
        }).join('') + '</div>'
          : '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;color:var(--suave);padding:28px 10px">' + icoPacote + '<span style="font-size:13px">Seu carrinho está vazio.</span><button type="button" data-k="ircat" data-nav="catalogo" class="oz-secundario" style="font-size:13px">Ver catálogo</button></div>') +
        (s.aviso ? '<div role="alert" style="font-size:13px;font-weight:700;color:#B42318">' + s.aviso + '</div>' : '') +
        '<div style="border-top:1px solid var(--linha);padding-top:12px;display:flex;flex-direction:column;gap:10px"><div style="display:flex;justify-content:space-between;font-weight:700;font-size:15px"><span>Total do pedido</span><span aria-live="polite">' + brl(totalCarrinho) + '</span></div>' +
        '<button type="button" class="oz-primario" data-k="env" data-act="env"' + (totalItens ? '' : ' disabled') + ' style="width:100%">→ Criar pedido</button></div></div>';
    }

    function perfilHtml() {
      return '<div style="padding:16px;display:flex;flex-direction:column;gap:12px">' +
        '<div style="background:linear-gradient(135deg,var(--azul),var(--azul-esc));color:#fff;border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:6px">' +
        '<strong style="font-size:15px">Vendedor</strong><span style="font-size:12px;color:#DCEBFF">vendedor@oasys.com.br</span>' +
        '<span style="align-self:flex-start;background:rgba(255,255,255,.18);color:#B6F4C8;font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;margin-top:2px">● Online</span></div>' +
        '<div style="background:#fff;border:1px solid var(--linha);border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:10px">' +
        '<span style="font-size:11px;color:var(--suave);font-weight:700;text-transform:uppercase;letter-spacing:.03em">Sessão atual</span>' +
        '<div style="display:flex;gap:10px;align-items:center;color:var(--azul)">' + icoPerfil + '<div style="color:var(--tinta)"><strong style="font-size:13.5px">Mateus Andrez</strong><div style="font-size:12px;color:var(--suave)">Cliente ativo</div></div></div>' +
        '<div style="display:flex;gap:10px;align-items:center;color:var(--azul)">' + icoGrid + '<div style="color:var(--tinta)"><strong style="font-size:13.5px">Tabela ' + tabelas[s.tab][0] + '</strong><div style="font-size:12px;color:var(--suave)">Condição comercial</div></div></div>' +
        '<button type="button" class="oz-secundario" style="border-color:#F2B8B5;color:#B42318;font-size:13px">Encerrar atendimento</button></div>' +
        '<div style="background:#fff;border:1px solid var(--linha);border-radius:14px;padding:14px;display:flex;flex-direction:column"><span style="font-size:11px;color:var(--suave);font-weight:700;text-transform:uppercase;letter-spacing:.03em;margin-bottom:8px">Configurações</span>' +
        ['Minhas metas', 'Pedidos do cliente', 'Orçamentos do cliente'].map(function (t) {
          return '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-top:1px solid var(--linha);font-size:13.5px;color:var(--texto)">' + t + '<span style="color:#CBD5E1">›</span></div>';
        }).join('') + '</div></div>';
    }

    function render() {
      var f = tabelas[s.tab][1];
      var totalItens = s.qtd.reduce(function (a, b) { return a + b; }, 0);
      var totalCarrinho = prods.reduce(function (a, p, i) { return a + p.preco * f * s.qtd[i]; }, 0);
      var nav = '<div style="display:flex;border-top:1px solid var(--linha);background:#fff;flex:none">' +
        navBtn('catalogo', 'Catálogo', icoGrid) + navBtn('carrinho', 'Carrinho', icoCarrinho, totalItens) + navBtn('perfil', 'Perfil', icoPerfil) + '</div>';
      var tela = s.enviado
        ? '<div role="status" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:12px;padding:20px 24px">' +
          '<svg aria-hidden="true" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--azul)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M7 12.5l3.5 3.5L17 9"></path></svg>' +
          '<strong style="font-family:\'Schibsted Grotesk\',sans-serif;font-size:24px">Pedido no Oasys</strong>' +
          '<span style="color:var(--texto)">' + totalItens + (totalItens === 1 ? ' item' : ' itens') + ' · ' + brl(totalCarrinho) + ' · tabela ' + tabelas[s.tab][0] + '. Pronto pra separar no escritório, sem redigitar nada.</span>' +
          '<button type="button" class="oz-secundario" data-k="novo" data-act="novo" style="margin-top:8px">Tirar outro pedido</button></div>'
        : (s.aba === 'perfil' ? perfilHtml() : s.aba === 'carrinho' ? carrinhoHtml(f, totalItens, totalCarrinho) : catalogoHtml(f));
      montar(el,
        '<div class="oz-caixa" style="align-items:center"><div class="oz-col" style="flex-basis:340px">' +
        '<span class="oz-tag">Teste agora · você é o vendedor</span><h2 class="oz-h2">Tire um pedido como seu vendedor tiraria na rua.</h2>' +
        '<p style="margin:0;color:var(--texto)">Navegue pelo catálogo, pelo carrinho e pelo perfil — é a mesma tela que o seu vendedor usa no celular. Troque a tabela do cliente e veja o preço mudar.</p><p class="oz-nota">Preços, código e estoque ilustrativos.</p></div>' +
        '<div style="flex:1 1 420px;min-width:0;display:flex;justify-content:center"><div class="oz-celular" style="width:100%;max-width:400px;background:var(--tinta);border-radius:36px;padding:12px;box-shadow:0 40px 80px -36px rgba(14,26,43,.55)">' +
        '<div style="background:#fff;border-radius:26px;height:560px;overflow:hidden;display:flex;flex-direction:column">' +
        '<div style="flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column">' + tela + '</div>' + nav + '</div></div></div></div>');
    }
    el.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || b.disabled) return;
      if (b.hasAttribute('data-nav')) { s.aba = b.getAttribute('data-nav'); s.enviado = false; }
      else if (b.hasAttribute('data-tab')) s.tab = Number(b.getAttribute('data-tab'));
      else if (b.hasAttribute('data-add')) {
        var ia = Number(b.getAttribute('data-add'));
        if (s.qtd[ia] < prods[ia].estoque) { s.qtd[ia]++; s.aviso = ''; }
      } else if (b.hasAttribute('data-mais') || b.hasAttribute('data-menos')) {
        var i = Number(b.getAttribute('data-mais') || b.getAttribute('data-menos'));
        var novo = s.qtd[i] + (b.hasAttribute('data-mais') ? 1 : -1);
        if (novo < 0) return;
        if (novo > prods[i].estoque) s.aviso = 'Só tem ' + prods[i].estoque + ' de ' + prods[i].nome + ' em estoque.';
        else { s.qtd[i] = novo; s.aviso = ''; }
      } else if (b.hasAttribute('data-rm')) { s.qtd[Number(b.getAttribute('data-rm'))] = 0; s.aviso = ''; }
      else if (b.dataset.act === 'env') { s.enviado = true; track('interacao_simulador', { simulador: 'pedido' }); }
      else if (b.dataset.act === 'novo') s = { tab: s.tab, aba: 'catalogo', qtd: [0, 0, 0], aviso: '', enviado: false };
      render();
    });
    render();
  };


  /* ---------- Card de preço: anual x mensal ---------- */
  widgets.preco = function (el) {
    var planos = {
      essencial: { nome: 'Plano Essencial', anual: 349, mensal: 409, unidade: '/mês', escuro: false },
      profissional: { nome: 'Plano Profissional', anual: 599, mensal: 689, unidade: '/mês', escuro: true },
      chat: { nome: 'Oasys Chat', porMensagem: 0.10, unidade: '/mensagem', escuro: false },
      salesapp: { nome: 'Sales App', anual: 34.9, mensal: 40.9, unidade: '/vendedor', escuro: false }
    };
    var p = planos[el.getAttribute('data-plano')] || planos.essencial;
    var desc = el.getAttribute('data-desc') || '';
    var anual = true;
    var real = function (v) { return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }); };
    var temValor = p.anual !== undefined && p.anual !== null;
    var porUso = p.porMensagem !== undefined;
    var escuro = p.escuro;
    var sub = escuro ? '#C3CEDD' : 'var(--suave)';
    function render() {
      if (porUso) {
        montar(el,
          '<div style="height:100%;border:2px solid var(--azul);border-radius:20px;padding:28px;display:flex;flex-direction:column;gap:16px;background:#fff;color:var(--tinta)">' +
          '<span style="font-weight:700;font-size:15px;color:var(--azul-esc)">' + p.nome + '</span>' +
          '<div style="display:flex;flex-direction:column;gap:8px">' +
          '<div style="font-family:\'Schibsted Grotesk\',sans-serif;font-size:48px;font-weight:800;letter-spacing:-.03em;line-height:1">' + real(p.porMensagem) + '<span style="font-size:18px;font-weight:600;letter-spacing:0;color:' + sub + '">' + p.unidade + '</span></div>' +
          '<span style="font-size:15px;color:' + sub + '">plano de créditos pré-pagos · sem mensalidade fixa</span>' +
          '</div>' +
          '<p style="margin:0;font-size:16px;color:var(--texto)">' + esc(desc) + '</p>' +
          '<a class="btn" href="#demo" style="margin-top:auto;background:var(--azul);color:#fff;text-decoration:none;font-weight:700;padding:14px 20px;border-radius:12px;min-height:52px;display:flex;align-items:center;justify-content:center">Ver funcionando</a>' +
          '</div>');
        return;
      }
      var preco = temValor ? real(anual ? p.anual : p.mensal) : (anual ? '[Preço anual]' : '[Preço mensal]');
      var eco = temValor ? (anual ? 'Você economiza ' + real((p.mensal - p.anual) * 12) + ' por ano' : 'No anual sai ' + real(p.anual) + '/mês') : '';
      montar(el,
        '<div class="' + (escuro ? 'oz-escuro-card' : '') + '" style="height:100%;border:2px solid var(--azul);border-radius:20px;padding:28px;display:flex;flex-direction:column;gap:16px;' + (escuro ? 'background:var(--tinta);color:#fff' : 'background:#fff;color:var(--tinta)') + '">' +
        '<span style="font-weight:700;font-size:15px;color:' + (escuro ? '#BFD0FF' : 'var(--azul-esc)') + '">' + p.nome + '</span>' +
        '<div class="oz-seg" role="radiogroup" aria-label="Forma de contratação">' +
        '<button type="button" role="radio" data-k="an" data-mod="anual" aria-checked="' + anual + '">Anual</button>' +
        '<button type="button" role="radio" data-k="me" data-mod="mensal" aria-checked="' + !anual + '">Mensal</button></div>' +
        '<div aria-live="polite" style="display:flex;flex-direction:column;gap:8px">' +
        '<div style="font-family:\'Schibsted Grotesk\',sans-serif;font-size:48px;font-weight:800;letter-spacing:-.03em;line-height:1">' + preco + '<span style="font-size:18px;font-weight:600;letter-spacing:0;color:' + sub + '">' + p.unidade + '</span></div>' +
        '<span style="font-size:15px;color:' + sub + '">' + (anual ? 'no contrato anual · 12 meses, pago mês a mês' : 'sem fidelidade · cancele quando quiser') + '</span>' +
        (eco ? '<span class="oz-economia" style="align-self:flex-start">' + eco + '</span>' : '') +
        '</div>' +
        '<p style="margin:0;font-size:16px;color:' + (escuro ? '#C3CEDD' : 'var(--texto)') + '">' + esc(desc) + '</p>' +
        '<a class="btn" href="#demo" style="margin-top:auto;background:var(--azul);color:#fff;text-decoration:none;font-weight:700;padding:14px 20px;border-radius:12px;min-height:52px;display:flex;align-items:center;justify-content:center">Ver funcionando</a>' +
        '</div>');
    }
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-mod]'); if (!b) return;
      anual = b.getAttribute('data-mod') === 'anual';
      track('troca_plano', { plano: el.getAttribute('data-plano'), modalidade: anual ? 'anual' : 'mensal' });
      render();
    });
    el.addEventListener('keydown', function (e) {
      if (!e.target.closest('[data-mod]')) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        anual = !anual; render();
        var t = el.querySelector('[data-mod="' + (anual ? 'anual' : 'mensal') + '"]'); if (t) t.focus(); e.preventDefault();
      }
    });
    render();
  };

  document.querySelectorAll('[data-widget]').forEach(function (el) {
    var fn = widgets[el.getAttribute('data-widget')];
    if (fn) fn(el);
  });


  /* ---------- barra fixa do celular ---------- */
  (function () {
    var bar = document.querySelector('.mbar'); if (!bar) return;
    var alvo = document.querySelector('main a.btn[href="#demo"]');
    var demo = document.getElementById('demo');
    var heroFora = !alvo, demoVisivel = false;
    var atualizar = function () { bar.classList.toggle('on', heroFora && !demoVisivel); };
    if (!('IntersectionObserver' in window)) { bar.classList.add('on'); return; }
    if (alvo) new IntersectionObserver(function (en) { heroFora = !en[0].isIntersecting && en[0].boundingClientRect.top < 0; atualizar(); }).observe(alvo);
    if (demo) new IntersectionObserver(function (en) { demoVisivel = en[0].isIntersecting; atualizar(); }, { threshold: 0.15 }).observe(demo);
    atualizar();
  })();

  /* ---------- fallback das animações de scroll ---------- */
  var semTimeline = !(window.CSS && CSS.supports && CSS.supports('animation-timeline: view()'));
  var reduz = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (semTimeline && !reduz && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('io-on');
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -10% 0px' });
    document.querySelectorAll('.rv,.rvl,.rvr,.zoom').forEach(function (n) { io.observe(n); });
    var prog = document.querySelector('.prog');
    if (prog) {
      var att = function () { var h = document.documentElement; var p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight); prog.style.transform = 'scaleX(' + p + ')'; };
      window.addEventListener('scroll', att, { passive: true }); att();
    }
  }
})();
