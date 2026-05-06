/* =============================================
   REI DA ÁGUA — JAVASCRIPT
   ============================================= */

// ===== CONFIGURAÇÕES =====
const CONFIG = {
  whatsapp: '5541985231501',
  instagram: 'https://instagram.com/reidaaguaa',
  diasSemana: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
  diasAbrev:  ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
};

// ===== ROTAS PADRÃO =====
// Cada índice corresponde ao dia da semana (0=Dom, 1=Seg, ..., 6=Sáb)
const rotasPadrao = [
  '',                        // Domingo (sem entrega)
  'Curitiba — Centro, Batel, Água Verde',
  'Curitiba — Portão, Xaxim, Pinheirinho',
  'Curitiba — Boqueirão, Hauer, Cajuru',
  'Curitiba — CIC, Cidade Industrial, Capão Raso',
  'Curitiba — Boa Vista, Bacacheri, Tarumã',
  'Curitiba — Todas as regiões (pedidos especiais)',
];

// ===== ESTADO DA APLICAÇÃO =====
let precos = { p20: null, p10: null };
let rotas  = [...rotasPadrao];

// ===== UTILITÁRIOS =====
function formatarMoeda(valor) {
  return valor !== null && valor !== undefined && !isNaN(valor)
    ? 'R$ ' + Number(valor).toFixed(2).replace('.', ',')
    : 'R$ --,--';
}

function mostrarToast(msg, tipo = 'success') {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = `toast ${tipo}`;
  requestAnimationFrame(() => {
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  });
}

// ===== PERSISTÊNCIA (localStorage) =====
function salvarDados() {
  localStorage.setItem('rda_precos', JSON.stringify(precos));
  localStorage.setItem('rda_rotas',  JSON.stringify(rotas));
}

function carregarDados() {
  try {
    const p = localStorage.getItem('rda_precos');
    const r = localStorage.getItem('rda_rotas');
    if (p) precos = JSON.parse(p);
    if (r) rotas  = JSON.parse(r);
  } catch (e) {
    console.warn('Erro ao carregar dados salvos:', e);
  }
}

// ===== NAVBAR =====
function initNavbar() {
  const header    = document.getElementById('header');
  const hamburger = document.getElementById('hamburger');
  const nav       = document.getElementById('nav');
  const navLinks  = document.querySelectorAll('.nav-link');

  // Scroll: destacar link ativo
  const sections = document.querySelectorAll('section[id]');

  window.addEventListener('scroll', () => {
    // Header sombra extra ao rolar
    header.style.boxShadow = window.scrollY > 10
      ? '0 4px 24px rgba(0,0,0,0.25)'
      : '0 2px 16px rgba(0,0,0,0.18)';

    // Link ativo
    let atual = '';
    sections.forEach(sec => {
      const top = sec.offsetTop - 90;
      if (window.scrollY >= top) atual = sec.id;
    });
    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === '#' + atual);
    });
  });

  // Hamburger
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    nav.classList.toggle('open');
  });

  // Fechar menu ao clicar em link
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      nav.classList.remove('open');
    });
  });
}

// ===== PREÇOS =====
function renderizarPrecos() {
  document.getElementById('preco-20l').textContent = formatarMoeda(precos.p20);
  document.getElementById('preco-10l').textContent = formatarMoeda(precos.p10);

  // Atualizar inputs do editor
  if (precos.p20 !== null) document.getElementById('input-20l').value = precos.p20;
  if (precos.p10 !== null) document.getElementById('input-10l').value = precos.p10;

  // Atualizar resumo do pedido
  atualizarResumoPedido();
}

function initPrecos() {
  renderizarPrecos();

  document.getElementById('btn-salvar-precos').addEventListener('click', () => {
    const v20 = parseFloat(document.getElementById('input-20l').value);
    const v10 = parseFloat(document.getElementById('input-10l').value);

    if (isNaN(v20) && isNaN(v10)) {
      mostrarToast('Informe pelo menos um preço.', 'error');
      return;
    }

    if (!isNaN(v20) && v20 >= 0) precos.p20 = v20;
    if (!isNaN(v10) && v10 >= 0) precos.p10 = v10;

    salvarDados();
    renderizarPrecos();
    mostrarToast('Preços atualizados com sucesso!');
  });
}

// ===== ROTAS =====
function renderizarRotas() {
  const container = document.getElementById('rotas-semana');
  const hoje      = new Date().getDay(); // 0=Dom ... 6=Sáb
  container.innerHTML = '';

  // Exibir de Seg a Sáb (índices 1-6) + Dom (0) ao final
  const ordem = [1, 2, 3, 4, 5, 6, 0];

  ordem.forEach(idx => {
    const div       = document.createElement('div');
    const ehHoje    = idx === hoje;
    div.className   = 'rota-dia' + (ehHoje ? ' hoje' : '');

    const nomeDiv   = document.createElement('div');
    nomeDiv.className = 'rota-dia-nome';
    nomeDiv.textContent = CONFIG.diasAbrev[idx];

    div.appendChild(nomeDiv);

    if (ehHoje) {
      const badge = document.createElement('div');
      badge.className = 'rota-dia-hoje-badge';
      badge.textContent = 'HOJE';
      div.appendChild(badge);
    }

    const regiaoDiv = document.createElement('div');
    if (rotas[idx] && rotas[idx].trim()) {
      regiaoDiv.className = 'rota-dia-regioes';
      regiaoDiv.textContent = rotas[idx];
    } else {
      regiaoDiv.className = 'rota-dia-vazio';
      regiaoDiv.textContent = idx === 0 ? 'Sem entrega' : 'A definir';
    }
    div.appendChild(regiaoDiv);

    container.appendChild(div);
  });
}

function renderizarEditorRotas() {
  const grid  = document.getElementById('rotas-editor-grid');
  grid.innerHTML = '';

  const ordem = [1, 2, 3, 4, 5, 6, 0];

  ordem.forEach(idx => {
    const item = document.createElement('div');
    item.className = 'rota-editor-item';

    const label = document.createElement('label');
    label.setAttribute('for', `rota-input-${idx}`);
    label.textContent = CONFIG.diasSemana[idx];

    const input = document.createElement('input');
    input.type        = 'text';
    input.id          = `rota-input-${idx}`;
    input.placeholder = idx === 0 ? 'Ex: Sem entrega' : 'Ex: Centro, Batel...';
    input.value       = rotas[idx] || '';

    item.appendChild(label);
    item.appendChild(input);
    grid.appendChild(item);
  });
}

function initRotas() {
  renderizarRotas();
  renderizarEditorRotas();

  document.getElementById('btn-salvar-rotas').addEventListener('click', () => {
    const ordem = [1, 2, 3, 4, 5, 6, 0];
    ordem.forEach(idx => {
      const input = document.getElementById(`rota-input-${idx}`);
      if (input) rotas[idx] = input.value.trim();
    });
    salvarDados();
    renderizarRotas();
    mostrarToast('Rotas atualizadas com sucesso!');
  });
}

// ===== PEDIDO =====
function atualizarResumoPedido() {
  const qtd20 = parseInt(document.getElementById('qtd-20l')?.value) || 0;
  const qtd10 = parseInt(document.getElementById('qtd-10l')?.value) || 0;

  document.getElementById('res-20l').textContent = `${qtd20} un.`;
  document.getElementById('res-10l').textContent = `${qtd10} un.`;

  let total = 0;
  let podeMostrarTotal = false;

  if (precos.p20 !== null && !isNaN(precos.p20)) {
    total += qtd20 * precos.p20;
    podeMostrarTotal = true;
  }
  if (precos.p10 !== null && !isNaN(precos.p10)) {
    total += qtd10 * precos.p10;
    podeMostrarTotal = true;
  }

  document.getElementById('res-total').textContent = podeMostrarTotal
    ? formatarMoeda(total)
    : 'Consulte o vendedor';
}

function initPedido() {
  const qtd20Input = document.getElementById('qtd-20l');
  const qtd10Input = document.getElementById('qtd-10l');

  qtd20Input.addEventListener('input', atualizarResumoPedido);
  qtd10Input.addEventListener('input', atualizarResumoPedido);

  document.getElementById('pedido-form').addEventListener('submit', (e) => {
    e.preventDefault();

    const nome    = document.getElementById('nome').value.trim();
    const end     = document.getElementById('endereco').value.trim();
    const qtd20   = parseInt(qtd20Input.value) || 0;
    const qtd10   = parseInt(qtd10Input.value) || 0;
    const turno   = document.getElementById('turno').value;
    const obs     = document.getElementById('obs').value.trim();

    // Validação básica
    if (!nome) {
      mostrarToast('Por favor, informe seu nome ou empresa.', 'error');
      document.getElementById('nome').focus();
      return;
    }
    if (!end) {
      mostrarToast('Por favor, informe o endereço de entrega.', 'error');
      document.getElementById('endereco').focus();
      return;
    }
    if (qtd20 === 0 && qtd10 === 0) {
      mostrarToast('Adicione pelo menos um galão ao pedido.', 'error');
      return;
    }

    // Montar mensagem
    let msg = `*🚰 PEDIDO — REI DA ÁGUA*\n\n`;
    msg += `*Cliente:* ${nome}\n`;
    msg += `*Endereço:* ${end}\n\n`;
    msg += `*Itens do Pedido:*\n`;
    if (qtd20 > 0) msg += `• Galão 20L: ${qtd20} un.${precos.p20 ? ' — ' + formatarMoeda(qtd20 * precos.p20) : ''}\n`;
    if (qtd10 > 0) msg += `• Galão 10L: ${qtd10} un.${precos.p10 ? ' — ' + formatarMoeda(qtd10 * precos.p10) : ''}\n`;

    if (precos.p20 !== null || precos.p10 !== null) {
      let total = 0;
      if (precos.p20) total += qtd20 * precos.p20;
      if (precos.p10) total += qtd10 * precos.p10;
      msg += `\n*Total estimado:* ${formatarMoeda(total)}\n`;
    }

    if (turno) msg += `\n*Turno preferido:* ${turno}\n`;
    if (obs)   msg += `\n*Observações:* ${obs}\n`;

    msg += `\n_Pedido enviado pelo site Rei da Água_`;

    const url = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  });
}

// ===== ANO NO FOOTER =====
function initFooter() {
  const el = document.getElementById('ano');
  if (el) el.textContent = new Date().getFullYear();
}

// ===== SCROLL SUAVE PARA ÂNCORAS =====
function initScrollSuave() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const alvo = document.querySelector(link.getAttribute('href'));
      if (alvo) {
        e.preventDefault();
        const offset = 72;
        const top = alvo.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });
}

// ===== ANIMAÇÃO DE ENTRADA (Intersection Observer) =====
function initAnimacoes() {
  const elementos = document.querySelectorAll('.reveal');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        // observer.unobserve(entry.target); // Deletar se quiser que re-anime ao sair/entrar
      }
    });
  }, { 
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px' 
  });

  elementos.forEach(el => observer.observe(el));

  // Efeito de movimento sutil no Hero com o mouse
  const hero = document.querySelector('.hero');
  const wrapper = document.querySelector('.hero-image-wrapper');
  
  if (hero && wrapper && window.innerWidth > 992) {
    hero.addEventListener('mousemove', (e) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      
      const moveX = (clientX - innerWidth / 2) / 25;
      const moveY = (clientY - innerHeight / 2) / 25;
      
      wrapper.style.transform = `rotateY(${-10 + moveX}deg) rotateX(${5 - moveY}deg)`;
    });

    hero.addEventListener('mouseleave', () => {
      wrapper.style.transform = `rotateY(-10deg) rotateX(5deg)`;
    });
  }
}

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', () => {
  carregarDados();
  initNavbar();
  initPrecos();
  initRotas();
  initPedido();
  initFooter();
  initScrollSuave();

  // Pequeno delay para animações não conflitarem com o carregamento
  setTimeout(initAnimacoes, 100);
});

/* =============================================
   ADMINISTRATIVO (ÁREA DO PROPRIETÁRIO)
   ============================================= */

const ADMIN_CONFIG = {
  senhaCorreta: 'reidaagua@',
  sessionKey: 'rda_admin_logged_in'
};

function initAdmin() {
  const loginBtn      = document.getElementById('admin-login-btn');
  const modal         = document.getElementById('modal-senha');
  const inputSenha    = document.getElementById('input-senha');
  const btnCancelar   = document.getElementById('btn-cancelar-senha');
  const btnConfirmar  = document.getElementById('btn-confirmar-senha');

  // Verificar se já está logado nesta sessão
  if (sessionStorage.getItem(ADMIN_CONFIG.sessionKey) === 'true') {
    document.body.classList.add('admin-logged-in');
    loginBtn.title = 'Sair da Área Administrativa';
  }

  // Abrir modal ou deslogar
  loginBtn.addEventListener('click', () => {
    if (document.body.classList.contains('admin-logged-in')) {
      if (confirm('Deseja sair da área administrativa?')) {
        document.body.classList.remove('admin-logged-in');
        sessionStorage.removeItem(ADMIN_CONFIG.sessionKey);
        loginBtn.title = 'Área do Proprietário';
        mostrarToast('Você saiu da área administrativa.');
      }
    } else {
      modal.classList.add('show');
      inputSenha.value = '';
      inputSenha.focus();
    }
  });

  // Fechar modal
  btnCancelar.addEventListener('click', () => {
    modal.classList.remove('show');
  });

  // Confirmar senha
  function validarSenha() {
    if (inputSenha.value === ADMIN_CONFIG.senhaCorreta) {
      document.body.classList.add('admin-logged-in');
      sessionStorage.setItem(ADMIN_CONFIG.sessionKey, 'true');
      modal.classList.remove('show');
      loginBtn.title = 'Sair da Área Administrativa';
      mostrarToast('Acesso administrativo liberado!');
      
      // Rolar para a seção de preços para facilitar
      document.getElementById('produtos').scrollIntoView({ behavior: 'smooth' });
    } else {
      mostrarToast('Senha incorreta!', 'error');
      inputSenha.value = '';
      inputSenha.focus();
    }
  }

  btnConfirmar.addEventListener('click', validarSenha);
  inputSenha.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') validarSenha();
  });

  // Fechar modal ao clicar fora
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('show');
  });
}

// Adicionar initAdmin na inicialização
document.addEventListener('DOMContentLoaded', () => {
  initAdmin();
});
