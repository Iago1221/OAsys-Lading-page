/* Oasys — página de planos (/planos/). Lê o catálogo de /central/catalogo no ERP e calcula o valor mensal. Sem dependências. */
(function () {
  'use strict';

  var central = (document.body.getAttribute('data-central') || '').replace(/\/+$/, '');
  // Site aberto na própria máquina: fala com o ERP local, não com o de produção.
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') central = 'http://localhost:8080';
  var carregando = document.querySelector('[data-carregando]');
  var indisponivel = document.querySelector('[data-indisponivel]');
  var configurador = document.querySelector('[data-configurador]');
  var lista = configurador.querySelector('[data-itens]');
  var usuarios = document.getElementById('pl-usuarios');
  var brl = function (v) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };
  var catalogo;

  function mostrar(bloco) {
    [carregando, indisponivel, configurador].forEach(function (el) { el.hidden = el !== bloco; });
  }

  function track(evento, extra) {
    var dados = Object.assign({ lp: 'planos' }, extra || {});
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({ event: evento }, dados));
    if (window.posthog && typeof window.posthog.capture === 'function') window.posthog.capture(evento, dados);
  }

  function el(tag, classe, texto) {
    var n = document.createElement(tag);
    if (classe) n.className = classe;
    if (texto !== undefined) n.textContent = texto;
    return n;
  }

  function montarItens() {
    catalogo.itens.forEach(function (item) {
      var label = el('label', 'pl-item');
      var caixa = el('input');
      caixa.type = 'checkbox';
      caixa.value = item.chave;
      caixa.checked = item.obrigatorio;
      if (item.obrigatorio) {
        // Continua focável e legível por leitor de tela, mas não desmarca.
        caixa.setAttribute('aria-disabled', 'true');
        caixa.addEventListener('click', function (e) { e.preventDefault(); });
      }
      var texto = el('span', 'pl-texto');
      texto.appendChild(el('span', 'pl-nome', item.nome));
      if (item.descricao) texto.appendChild(el('span', 'pl-desc', item.descricao));
      if (item.obrigatorio) texto.appendChild(el('span', 'pl-nota', 'Incluído em todo plano'));
      if (item.usuariosInclusos) texto.appendChild(el('span', 'pl-nota', '+' + item.usuariosInclusos + ' usuários inclusos'));
      var preco = el('span', 'pl-preco', brl(item.preco));
      preco.appendChild(el('small', '', 'por mês'));
      label.appendChild(caixa);
      label.appendChild(texto);
      label.appendChild(preco);
      lista.appendChild(label);
    });
  }

  /* O mesmo cálculo do ERP (ERP\Domain\Central\Plano); quem vale na contratação é o do servidor. */
  function calcular() {
    var linhas = configurador.querySelector('[data-linhas]');
    var total = 0;
    var inclusos = catalogo.usuariosInclusos;
    linhas.textContent = '';

    function linha(descricao, valor) {
      var l = el('div', 'pl-linha');
      l.appendChild(el('span', '', descricao));
      l.appendChild(el('span', '', brl(valor)));
      linhas.appendChild(l);
    }

    catalogo.itens.forEach(function (item) {
      if (!lista.querySelector('input[value="' + item.chave + '"]').checked) return;
      total += item.preco;
      inclusos += item.usuariosInclusos;
      linha(item.nome, item.preco);
    });

    var qtd = Math.min(500, Math.max(1, parseInt(usuarios.value, 10) || 1));
    var adicionais = Math.max(0, qtd - inclusos);
    if (adicionais > 0) {
      linha(adicionais + (adicionais === 1 ? ' usuário adicional' : ' usuários adicionais'), adicionais * catalogo.precoUsuarioAdicional);
      total += adicionais * catalogo.precoUsuarioAdicional;
    }

    configurador.querySelector('[data-usuarios-ajuda]').textContent =
      inclusos + ' usuários já estão inclusos neste plano. Cada usuário a mais custa ' + brl(catalogo.precoUsuarioAdicional) + ' por mês.';
    configurador.querySelector('[data-total]').textContent = brl(total);
  }

  lista.addEventListener('change', function (e) {
    calcular();
    track('plano_item', { item: e.target.value, marcado: e.target.checked });
  });
  usuarios.addEventListener('input', calcular);
  usuarios.addEventListener('blur', function () {
    usuarios.value = Math.min(500, Math.max(1, parseInt(usuarios.value, 10) || 1));
    calcular();
  });
  configurador.querySelectorAll('[data-passo]').forEach(function (botao) {
    botao.addEventListener('click', function () {
      usuarios.value = Math.min(500, Math.max(1, (parseInt(usuarios.value, 10) || 1) + parseInt(botao.dataset.passo, 10)));
      calcular();
    });
  });

  if (!central) { mostrar(indisponivel); return; }

  fetch(central + '/central/catalogo')
    .then(function (r) { if (!r.ok) throw new Error('catalogo ' + r.status); return r.json(); })
    .then(function (dados) {
      catalogo = dados;
      montarItens();
      usuarios.value = catalogo.usuariosInclusos;

      var cta = configurador.querySelector('[data-cta]');
      var nota = configurador.querySelector('[data-cta-nota]');
      var contratar = configurador.querySelector('[data-contratar]');

      if (catalogo.cadastroAberto) {
        cta.textContent = 'Testar grátis por ' + catalogo.trialDias + ' dias';
        nota.textContent = 'Sem cartão. Você escolhe o plano quando decidir contratar.';
      } else {
        cta.textContent = 'Falar com a Oasys';
        cta.href = 'https://wa.me/554731804931';
        nota.textContent = 'O cadastro pelo site abre em breve.';
      }

      contratar.href = central + '/central/contratar';
      contratar.hidden = !catalogo.checkoutAberto;

      cta.addEventListener('click', function () { track('plano_cta'); });
      calcular();
      mostrar(configurador);
      track('planos_visto');
    })
    .catch(function () { mostrar(indisponivel); });
})();
