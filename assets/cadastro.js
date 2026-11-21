/* Oasys — cadastro self-service (página /comecar/). Fala com os endpoints /central/ do ERP. Sem dependências. */
(function () {
  'use strict';

  var central = (document.body.getAttribute('data-central') || '').replace(/\/+$/, '');
  // Site aberto na própria máquina: fala com o ERP local, não com o de produção.
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') central = 'http://localhost:8080';
  var carregando = document.querySelector('[data-carregando]');
  var fechado = document.querySelector('[data-fechado]');
  var form = document.querySelector('form[data-cadastro]');
  var enviado = document.querySelector('[data-enviado]');
  var erroGeral = form.querySelector('[data-erro-geral]');
  var botao = form.querySelector('button[type="submit"]');
  var subdominio = form.elements.subdominio;
  var empresa = form.elements.empresa;
  var captchaToken = '';

  function mostrar(bloco) {
    [carregando, fechado, form, enviado].forEach(function (el) { el.hidden = el !== bloco; });
  }

  function track(evento, extra) {
    var dados = Object.assign({ lp: 'comecar' }, extra || {});
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({ event: evento }, dados));
    if (window.posthog && typeof window.posthog.capture === 'function') window.posthog.capture(evento, dados);
    if (evento === 'cadastro_enviado' && typeof window.fbq === 'function') window.fbq('track', 'CompleteRegistration', { content_name: 'comecar' });
  }

  /* Texto de ajuda de um campo: guarda o texto original para voltar a ele quando o erro some. */
  function ajuda(campo) { return form.querySelector('[data-erro-de="' + campo + '"]'); }
  function definirAjuda(campo, texto, tipo) {
    var el = ajuda(campo);
    if (!el) return;
    if (el.dataset.padrao === undefined) el.dataset.padrao = el.hidden ? '' : el.textContent;
    if (texto) {
      el.textContent = texto;
      el.hidden = false;
      if (tipo) el.dataset.tipo = tipo; else delete el.dataset.tipo;
    } else {
      el.textContent = el.dataset.padrao;
      el.hidden = el.dataset.padrao === '';
      delete el.dataset.tipo;
    }
  }
  function limparErros() {
    erroGeral.hidden = true;
    ['nome', 'email', 'empresa', 'senha', 'aceitouTermos', 'captcha'].forEach(function (c) { definirAjuda(c, ''); });
  }

  function api(caminho, opcoes) {
    return fetch(central + '/central/' + caminho, opcoes).then(function (r) {
      return r.json().then(function (corpo) { return { status: r.status, corpo: corpo }; });
    });
  }

  /* ---------- endereço: sugestão a partir da empresa e checagem de disponibilidade ---------- */
  var digitouEndereco = false;
  var consulta = 0;
  var espera;

  function conferirEndereco(parametro) {
    var atual = ++consulta;
    api('disponibilidade?' + parametro).then(function (r) {
      if (atual !== consulta) return; // chegou resposta de uma consulta antiga
      var d = r.corpo;
      if (parametro.indexOf('empresa=') === 0 && !digitouEndereco && d.subdominio) subdominio.value = d.sugestao || d.subdominio;
      if (!subdominio.value) { definirAjuda('subdominio', ''); return; }
      if (d.disponivel || (parametro.indexOf('empresa=') === 0 && d.sugestao)) definirAjuda('subdominio', 'Endereço disponível.', 'ok');
      else definirAjuda('subdominio', d.motivo + (d.sugestao ? ' Que tal "' + d.sugestao + '"?' : ''), 'erro');
    }).catch(function () { definirAjuda('subdominio', ''); });
  }

  empresa.addEventListener('blur', function () {
    if (!digitouEndereco && empresa.value.trim()) conferirEndereco('empresa=' + encodeURIComponent(empresa.value.trim()));
  });

  subdominio.addEventListener('input', function () {
    digitouEndereco = subdominio.value !== '';
    subdominio.value = subdominio.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    clearTimeout(espera);
    consulta++;
    if (!subdominio.value) { definirAjuda('subdominio', ''); return; }
    espera = setTimeout(function () { conferirEndereco('subdominio=' + encodeURIComponent(subdominio.value)); }, 350);
  });

  /* ---------- envio ---------- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    limparErros();

    var dados = {
      nome: form.elements.nome.value.trim(),
      email: form.elements.email.value.trim(),
      empresa: empresa.value.trim(),
      telefone: form.elements.telefone.value.trim(),
      sistemaAtual: form.elements.sistemaAtual.value.trim(),
      subdominio: subdominio.value.trim(),
      senha: form.elements.senha.value,
      aceitouTermos: form.elements.aceitouTermos.checked,
      captcha: captchaToken
    };

    botao.disabled = true;
    botao.textContent = 'Enviando…';

    api('cadastro', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) })
      .then(function (r) {
        if (r.status === 201) {
          enviado.querySelector('[data-email-enviado]').textContent = dados.email;
          mostrar(enviado);
          enviado.focus();
          track('cadastro_enviado');
          return;
        }
        var campo = r.corpo.campo;
        var mensagem = r.corpo.erro || 'Não foi possível concluir agora. Tente de novo em alguns minutos.';
        if (campo && ajuda(campo)) {
          definirAjuda(campo, mensagem, 'erro');
          if (form.elements[campo] && form.elements[campo].focus) form.elements[campo].focus();
        } else {
          erroGeral.textContent = mensagem;
          erroGeral.hidden = false;
        }
        if (window.turnstile && captchaToken) { window.turnstile.reset(); captchaToken = ''; }
        track('cadastro_recusado', { campo: campo || '' });
      })
      .catch(function () {
        erroGeral.textContent = 'Sem conexão com o servidor. Confira a internet e tente de novo.';
        erroGeral.hidden = false;
      })
      .then(function () {
        botao.disabled = false;
        botao.textContent = 'Criar meu ambiente';
      });
  });

  /* ---------- captcha (Cloudflare Turnstile), só quando o ERP informa a chave ---------- */
  function carregarCaptcha(siteKey) {
    window.oasysCaptchaPronto = function () {
      window.turnstile.render(form.querySelector('[data-captcha]'), {
        sitekey: siteKey,
        callback: function (token) { captchaToken = token; definirAjuda('captcha', ''); },
        'expired-callback': function () { captchaToken = ''; }
      });
    };
    var s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=oasysCaptchaPronto&render=explicit';
    s.async = true;
    document.head.appendChild(s);
  }

  /* ---------- início: o cadastro está aberto? ---------- */
  if (!central) { mostrar(fechado); return; }

  api('configuracao').then(function (r) {
    if (r.status !== 200 || !r.corpo.cadastroAberto) { mostrar(fechado); return; }
    form.querySelector('[data-sufixo]').textContent = r.corpo.sufixoEndereco || '';
    if (r.corpo.captchaSiteKey) carregarCaptcha(r.corpo.captchaSiteKey);
    mostrar(form);
    track('cadastro_visto');
  }).catch(function () { mostrar(fechado); });
})();
