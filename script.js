/* =============================================
   REI DA ÁGUA — JAVASCRIPT
   ============================================= */

import { getSettings, getProducts, subscribeToProductChanges } from './js/settings.js';
import { createOrder, markWhatsappSent } from './js/orders.js';
import { createCustomer } from './js/customers.js';

// ===== CONFIGURAÇÕES (Valores Iniciais / Fallback) =====
let CONFIG = {
  whatsapp: '5541985231501',
  instagram: 'reidaaguaa',
  diasSemana: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
  diasAbrev:  ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
};

let customConfig = {
  whatsapp: '5541985231501',
  instagram: 'reidaaguaa',
  adminSenha: 'reidaagua@'
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
let frota  = { t1: null, t2: null };
let pedidos = [];

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

// ===== PERSISTÊNCIA & INTEGRAÇÃO SUPABASE =====
function salvarDados() {
  localStorage.setItem('rda_precos', JSON.stringify(precos));
  localStorage.setItem('rda_rotas',  JSON.stringify(rotas));
  localStorage.setItem('rda_frota',  JSON.stringify(frota));
  localStorage.setItem('rda_pedidos', JSON.stringify(pedidos));
  localStorage.setItem('rda_config', JSON.stringify(customConfig));
}

async function carregarDados() {
  // 1. Tenta carregar do Supabase (Prioridade)
  try {
    const [dbSettings, dbProducts] = await Promise.all([
      getSettings(),
      getProducts()
    ]);

    // Atualizar Configs
    if (dbSettings.whatsapp) {
      CONFIG.whatsapp = dbSettings.whatsapp;
      customConfig.whatsapp = dbSettings.whatsapp;
    }
    if (dbSettings.instagram) {
      CONFIG.instagram = dbSettings.instagram;
      customConfig.instagram = dbSettings.instagram;
    }

    // Atualizar Preços
    const p20 = dbProducts.find(p => p.size_liters === 20);
    const p10 = dbProducts.find(p => p.size_liters === 10);
    if (p20) precos.p20 = p20.price;
    if (p10) precos.p10 = p10.price;

    // Expor produtos globalmente para o formulário de pedido
    window._appProducts = dbProducts;

    console.log('[RDA] Dados carregados do Supabase');
  } catch (err) {
    console.warn('[RDA] Erro ao carregar do Supabase, usando cache local:', err);
    
    // Fallback para LocalStorage se Supabase falhar
    const p = localStorage.getItem('rda_precos');
    const r = localStorage.getItem('rda_rotas');
    const f = localStorage.getItem('rda_frota');
    const d = localStorage.getItem('rda_pedidos');
    const c = localStorage.getItem('rda_config');
    if (p) precos = JSON.parse(p);
    if (r) rotas  = JSON.parse(r);
    if (f) frota  = JSON.parse(f);
    if (d) pedidos = JSON.parse(d);
    if (c) customConfig = JSON.parse(c);
  }

  // 2. Iniciar Realtime para Preços
  subscribeToProductChanges((updatedProduct) => {
    if (updatedProduct.size_liters === 20) precos.p20 = updatedProduct.price;
    if (updatedProduct.size_liters === 10) precos.p10 = updatedProduct.price;
    
    // Atualizar UI da calculadora se ela existir
    if (typeof atualizarCalculadora === 'function') {
      atualizarCalculadora();
    }
    mostrarToast('Preços atualizados em tempo real!', 'info');
  });
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

  const salvarPrecos = () => {
    const v20 = parseFloat(document.getElementById('input-20l').value);
    const v10 = parseFloat(document.getElementById('input-10l').value);

    let alterado = false;
    if (!isNaN(v20) && v20 >= 0 && v20 !== precos.p20) { precos.p20 = v20; alterado = true; }
    if (!isNaN(v10) && v10 >= 0 && v10 !== precos.p10) { precos.p10 = v10; alterado = true; }

    if (alterado) {
      salvarDados();
      renderizarPrecos();
      mostrarToast('Preços salvos automaticamente');
    }
  };

  document.getElementById('btn-salvar-precos').addEventListener('click', salvarPrecos);

  // Auto-save no blur
  const inputsPreco = ['input-20l', 'input-10l'];
  inputsPreco.forEach(id => {
    const input = document.getElementById(id);
    
    input.addEventListener('blur', salvarPrecos);
    
    input.addEventListener('input', () => {
      const v20 = parseFloat(document.getElementById('input-20l').value) || precos.p20;
      const v10 = parseFloat(document.getElementById('input-10l').value) || precos.p10;
      
      // Preview temporário (sem salvar)
      document.getElementById('preco-20l').textContent = formatarMoeda(v20);
      document.getElementById('preco-10l').textContent = formatarMoeda(v10);
      atualizarResumoPedido();
    });
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
    const regioesTexto = (rotas[idx] && rotas[idx].trim()) ? rotas[idx] : (idx === 0 ? 'Sem entrega' : 'A definir');
    
    regiaoDiv.className = (rotas[idx] && rotas[idx].trim()) ? 'rota-dia-regioes' : 'rota-dia-vazio';
    regiaoDiv.innerHTML = `
      <span class="rota-texto-estatico">${regioesTexto}</span>
      <div class="admin-rota-input">
        <input type="text" value="${rotas[idx] || ''}" 
               placeholder="${idx === 0 ? 'Sem entrega' : 'Regiões...'}" 
               data-idx="${idx}" class="input-rota-dinamico">
      </div>
    `;
    div.appendChild(regiaoDiv);

    container.appendChild(div);
  });
}



function initRotas() {
  renderizarRotas();

  const salvarRotas = () => {
    const inputs = document.querySelectorAll('.input-rota-dinamico');
    let alterado = false;
    inputs.forEach(input => {
      const idx = parseInt(input.getAttribute('data-idx'));
      const novoValor = input.value.trim();
      if (rotas[idx] !== novoValor) {
        rotas[idx] = novoValor;
        alterado = true;
      }
    });

    if (alterado) {
      salvarDados();
      renderizarRotas();
      mostrarToast('Rotas salvas automaticamente');
    }
  };

  document.getElementById('btn-salvar-rotas').addEventListener('click', salvarRotas);

  // Auto-save usando delegação de eventos para os inputs dinâmicos
  document.getElementById('rotas-semana').addEventListener('focusout', (e) => {
    if (e.target.classList.contains('input-rota-dinamico')) {
      salvarRotas();
    }
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

  const totalEl = document.getElementById('res-total');
  const novoValor = podeMostrarTotal ? formatarMoeda(total) : 'Consulte o vendedor';
  
  if (totalEl.textContent !== novoValor) {
    totalEl.textContent = novoValor;
    totalEl.classList.remove('pulse-animation');
    void totalEl.offsetWidth; // Trigger reflow
    totalEl.classList.add('pulse-animation');
  }
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
    const telefone = document.getElementById('telefone').value.trim();
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

    // Montar mensagem Premium
    let msg = `*🌊 NOVO PEDIDO — REI DA ÁGUA*\n`;
    msg += `------------------------------------------\n\n`;
    msg += `👤 *CLIENTE:* ${nome}\n`;
    msg += `📍 *ENDEREÇO:* ${end}\n`;
    msg += `📅 *DATA/HORA:* ${new Date().toLocaleString('pt-BR')}\n`;
    if (telefone) msg += `📞 *TEL:* ${telefone}\n`;
    if (turno) msg += `⏰ *TURNO:* ${turno}\n`;
    msg += `\n📦 *ITENS DO PEDIDO:*\n`;
    
    if (qtd20 > 0) {
      msg += `▪️ Galão 20L: ${qtd20} un. ${precos.p20 ? '(_' + formatarMoeda(qtd20 * precos.p20) + '_)' : ''}\n`;
    }
    if (qtd10 > 0) {
      msg += `▪️ Galão 10L: ${qtd10} un. ${precos.p10 ? '(_' + formatarMoeda(qtd10 * precos.p10) + '_)' : ''}\n`;
    }

    let total = 0;
    if (precos.p20) total += qtd20 * precos.p20;
    if (precos.p10) total += qtd10 * precos.p10;

    if (precos.p20 !== null || precos.p10 !== null) {
      msg += `\n💰 *TOTAL ESTIMADO:* ${formatarMoeda(total)}\n`;
    }

    if (obs) msg += `\n📝 *OBS:* ${obs}\n`;
    
    msg += `\n------------------------------------------\n`;
    msg += `_Enviado via reidaagua.com.br_`;

    // Salvar localmente (fallback)
    const novoPedido = {
      id: Date.now(),
      data: new Date().toLocaleString('pt-BR'),
      nome, endereco: end, telefone, qtd20, qtd10,
      total: formatarMoeda(total), status: 'pendente', pagamento: 'pendente'
    };
    pedidos.unshift(novoPedido);
    if (pedidos.length > 50) pedidos.pop();
    salvarDados();
    renderizarPedidosAdmin();

    const url = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;

    // Tentar persistir no Supabase (não bloqueia o fluxo se falhar)
    (async () => {
      try {
        // 1. Criar/registrar cliente
        const customer = await createCustomer({
          name:     nome,
          phone:    telefone || 'Site Lead',
          address:  end,
          district: end.split(',').pop().trim() || 'Curitiba',
        });

        // 2. Preparar itens com IDs do banco
        const items = [];
        const prod20 = window._appProducts?.find(p => p.size_liters === 20);
        const prod10 = window._appProducts?.find(p => p.size_liters === 10);
        if (qtd20 > 0 && prod20) items.push({ product_id: prod20.id, quantity: qtd20 });
        if (qtd10 > 0 && prod10) items.push({ product_id: prod10.id, quantity: qtd10 });

        if (items.length > 0) {
          // 3. Criar pedido no Supabase
          const { order } = await createOrder({ customer_id: customer.id, notes: obs }, items);
          await markWhatsappSent(order.id);
          console.info('[RDA] Pedido salvo no Supabase:', order.id);
        }
      } catch (err) {
        // Falha silenciosa — o cliente ainda vai pro WhatsApp
        console.warn('[RDA] Falha ao persistir pedido no Supabase:', err.message);
      }
    })();

    window.open(url, '_blank');
  });
}

// ===== ANO NO FOOTER =====
function initFooter() {
  const el = document.getElementById('ano');
  if (el) el.textContent = new Date().getFullYear();
  aplicarConfiguracoes();
}

function aplicarConfiguracoes() {
  // WhatsApp
  const whats = customConfig.whatsapp;
  const whatsLink = `https://wa.me/${whats}`;
  document.querySelectorAll('.link-wpp-href').forEach(a => a.href = whatsLink);
  
  // Instagram
  const insta = customConfig.instagram.replace('@', '');
  const instaLink = `https://instagram.com/${insta}`;
  document.querySelectorAll('.link-insta-href').forEach(a => a.href = instaLink);
  document.querySelectorAll('.link-insta-text').forEach(p => p.textContent = `@${insta}`);
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

// ===== PROCESSAMENTO DE IMAGENS (REMOÇÃO DE FUNDO) =====
function initBGRemoval() {
  const targets = document.querySelectorAll('.remove-bg');
  
  targets.forEach(img => {
    const process = () => {
      if (img.classList.contains('processed')) return;
      
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = canvas.width;
        const height = canvas.height;
        
        const visited = new Uint8Array(width * height);
        const stack = [];
        for (let x = 0; x < width; x++) { stack.push([x, 0]); stack.push([x, height - 1]); }
        for (let y = 0; y < height; y++) { stack.push([0, y]); stack.push([width - 1, y]); }
        
        const isLogo = img.src.toLowerCase().includes('logo');
        const tolerance = isLogo ? 85 : 35; // Tolerância maior para a logo para tirar todo o branco
        
        // Cor de referência (branco puro)
        const refR = 255, refG = 255, refB = 255;
        
        while (stack.length > 0) {
          const [x, y] = stack.pop();
          const idx = y * width + x;
          if (visited[idx]) continue;
          visited[idx] = 1;
          
          const p = idx * 4;
          const r = data[p], g = data[p+1], b = data[p+2];
          const dist = Math.sqrt((r - refR)**2 + (g - refG)**2 + (b - refB)**2);
          
          if (dist < tolerance) {
            data[p+3] = 0;
            if (x + 1 < width) stack.push([x + 1, y]);
            if (x - 1 >= 0) stack.push([x - 1, y]);
            if (y + 1 < height) stack.push([y + 1, y]);
            if (y - 1 >= 0) stack.push([y - 1, y]);
          }
        }

        // Pass 2: Global scan for internal "islands" (handles, gaps)
        for (let i = 0; i < data.length; i += 4) {
          if (data[i+3] > 0) {
            const r = data[i], g = data[i+1], b = data[i+2];
            const dist = Math.sqrt((r - refR)**2 + (g - refG)**2 + (b - refB)**2);
            // Tolerância rigorosa para "ilhas" (para não apagar brilhos do plástico)
            const islandTolerance = isLogo ? (tolerance * 0.7) : 25; 
            if (dist < islandTolerance) {
              data[i+3] = 0;
            }
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
        img.src = canvas.toDataURL('image/png');
        img.classList.add('processed');
      } catch (e) {
        console.warn('BG removal failed:', e);
        img.classList.add('processed');
      }
    };
    if (img.complete) process();
    else img.addEventListener('load', process);
  });
}

// ===== PEDIDOS RECEBIDOS (ADMIN) =====
function renderizarPedidosAdmin() {
  const lista = document.getElementById('pedidos-lista');
  if (!lista) return;

  if (pedidos.length === 0) {
    lista.innerHTML = '<p class="preco-hint">Ainda não há pedidos.</p>';
    return;
  }

  lista.innerHTML = pedidos.map(p => `
    <div class="pedido-item ${p.status === 'atendido' ? 'atendido' : ''}">
      <div class="pedido-item-details">
        <div class="pedido-status-area">
          <span class="pedido-status-badge ${p.status}">${p.status.toUpperCase()}</span>
          <span class="pedido-pagamento-badge ${p.pagamento}">${p.pagamento === 'pago' ? 'PAGO' : 'PAG. PENDENTE'}</span>
          <span class="pedido-item-data">${p.data}</span>
        </div>
      </div>
      <div class="pedido-item-detalhes">
        <p>📍 <strong>End:</strong> ${p.endereco}</p>
        ${p.telefone ? `<p>📞 <strong>Tel:</strong> ${p.telefone}</p>` : ''}
        <p>📦 <strong>Itens:</strong> ${p.qtd20 > 0 ? p.qtd20 + 'x 20L ' : ''}${p.qtd10 > 0 ? p.qtd10 + 'x 10L' : ''}</p>
        <p>💰 <strong>Total:</strong> ${p.total}</p>
      </div>
      <div class="pedido-item-actions">
        <div class="pedido-actions-group">
          <button class="btn ${p.status === 'atendido' ? 'btn-outline' : 'btn-primary'} btn-sm" 
                  onclick="toggleStatusPedido(${p.id})">
            ${p.status === 'atendido' ? 'Pendente' : 'Atender'}
          </button>
          <button class="btn ${p.pagamento === 'pago' ? 'btn-outline' : 'btn-success'} btn-sm" 
                  onclick="togglePagamentoPedido(${p.id})">
            ${p.pagamento === 'pago' ? 'Marcar Pendente' : 'Marcar Pago'}
          </button>
        </div>
        <button class="btn btn-danger btn-sm btn-icon" onclick="excluirPedido(${p.id})" title="Excluir Pedido">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
      ${p.telefone ? `
        <div class="pedido-item-footer" style="margin-top: 10px;">
          <button class="btn btn-success btn-sm btn-full" onclick="abrirWhatsCliente('${p.telefone}')">
            <i class="fa-brands fa-whatsapp"></i> Falar com Cliente
          </button>
        </div>
      ` : ''}
    </div>
  `).join('');
  
  renderizarRelatoriosAdmin();
}

function togglePagamentoPedido(id) {
  const pedido = pedidos.find(p => p.id === id);
  if (pedido) {
    pedido.pagamento = pedido.pagamento === 'pago' ? 'pendente' : 'pago';
    salvarDados();
    renderizarPedidosAdmin();
    mostrarToast(`Pagamento de ${pedido.nome} atualizado!`);
  }
}

function toggleStatusPedido(id) {
  const pedido = pedidos.find(p => p.id === id);
  if (pedido) {
    pedido.status = pedido.status === 'atendido' ? 'pendente' : 'atendido';
    salvarDados();
    renderizarPedidosAdmin();
    mostrarToast(`Pedido de ${pedido.nome} atualizado!`);
  }
}

function excluirPedido(id) {
  if (confirm('Deseja realmente excluir este pedido do histórico?')) {
    const idStr = String(id);
    pedidos = pedidos.filter(p => String(p.id) !== idStr);
    salvarDados();
    renderizarPedidosAdmin();
    mostrarToast('Pedido removido com sucesso.');
  }
}

// ===== RELATÓRIOS (ADMIN) =====
function renderizarRelatoriosAdmin() {
  const container = document.getElementById('relatorios-lista');
  if (!container) return;

  if (pedidos.length === 0) {
    container.innerHTML = '<p class="preco-hint">Ainda não há pedidos.</p>';
    return;
  }

  // Agrupar por cliente
  const clientesMap = {};
  pedidos.forEach(p => {
    const nome = p.nome.trim();
    if (!clientesMap[nome]) {
      clientesMap[nome] = { nome, totalPedidos: 0, temPendencia: false, ultimoPedido: p.data };
    }
    clientesMap[nome].totalPedidos++;
    if (p.pagamento === 'pendente') {
      clientesMap[nome].temPendencia = true;
    }
  });

  const clientesRanking = Object.values(clientesMap).sort((a, b) => b.totalPedidos - a.totalPedidos);

  container.innerHTML = `
    <table class="relatorio-table">
      <thead>
        <tr>
          <th>Cliente</th>
          <th>Qtd</th>
          <th>Último Pedido</th>
          <th>Status</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        ${clientesRanking.map(c => `
          <tr>
            <td class="td-nome" onclick='verDetalhesCliente(${JSON.stringify(c.nome)})'>${c.nome}</td>
            <td>${c.totalPedidos}</td>
            <td class="td-data">${c.ultimoPedido}</td>
            <td>
              <span class="badge-financeiro ${c.temPendencia ? 'debito' : 'ok'}">
                ${c.temPendencia ? 'DÉBITO' : 'EM DIA'}
              </span>
            </td>
            <td class="td-acoes-bulk">
              <button class="btn btn-success btn-xs" onclick='marcarTudoPagoCliente(${JSON.stringify(c.nome)})' title="Marcar Tudo Pago">
                <i class="fa-solid fa-check"></i>
              </button>
              <button class="btn btn-warning btn-xs" onclick='marcarTudoPendenteCliente(${JSON.stringify(c.nome)})' title="Marcar Tudo Pendente">
                <i class="fa-solid fa-clock"></i>
              </button>
              <button class="btn btn-danger btn-xs" onclick='excluirTudoCliente(${JSON.stringify(c.nome)})' title="Excluir Tudo">
                <i class="fa-solid fa-trash"></i>
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function marcarTudoPagoCliente(nome) {
  pedidos.forEach(p => {
    if (p.nome.trim() === nome) p.pagamento = 'pago';
  });
  salvarDados();
  renderizarPedidosAdmin();
  mostrarToast(`Todos os pedidos de ${nome} marcados como pagos.`);
}

function marcarTudoPendenteCliente(nome) {
  pedidos.forEach(p => {
    if (p.nome.trim() === nome) p.pagamento = 'pendente';
  });
  salvarDados();
  renderizarPedidosAdmin();
  mostrarToast(`Todos os pedidos de ${nome} marcados como pendentes.`);
}

function excluirTudoCliente(nome) {
  if (confirm(`Deseja excluir TODOS os pedidos de "${nome}"? Esta ação não pode ser desfeita.`)) {
    const nomeLimpo = String(nome).trim().toLowerCase();
    pedidos = pedidos.filter(p => String(p.nome).trim().toLowerCase() !== nomeLimpo);
    salvarDados();
    renderizarPedidosAdmin();
    mostrarToast(`Todo o histórico de "${nome}" foi removido.`);
  }
}

function initPedidosAdmin() {
  renderizarPedidosAdmin();

  document.getElementById('btn-limpar-pedidos').addEventListener('click', () => {
    if (confirm('Deseja realmente limpar todo o histórico de pedidos?')) {
      pedidos = [];
      salvarDados();
      renderizarPedidosAdmin();
      mostrarToast('Histórico de pedidos limpo.');
    }
  });
}

// ===== CONFIGURAÇÕES (ADMIN) =====
function initSettingsAdmin() {
  const inputWhatsapp = document.getElementById('input-whatsapp');
  const inputInsta    = document.getElementById('input-insta');
  const inputSenhaNova = document.getElementById('input-senha-nova');
  const btnSalvar = document.getElementById('btn-salvar-settings');

  if (!btnSalvar) return;

  // Preencher valores atuais
  inputWhatsapp.value = customConfig.whatsapp;
  inputInsta.value    = customConfig.instagram;
  inputSenhaNova.value = customConfig.adminSenha;

  btnSalvar.addEventListener('click', () => {
    const whats = inputWhatsapp.value.trim();
    const insta = inputInsta.value.trim();
    const senha = inputSenhaNova.value.trim();

    if (!whats) {
      mostrarToast('O WhatsApp não pode ficar vazio.', 'error');
      return;
    }
    if (senha.length < 4) {
      mostrarToast('A senha deve ter pelo menos 4 caracteres.', 'error');
      return;
    }

    customConfig.whatsapp = whats;
    customConfig.instagram = insta;
    customConfig.adminSenha = senha;

    salvarDados();
    aplicarConfiguracoes();
    mostrarToast('Configurações salvas com sucesso!');
  });
}

// ===== FROTA (CAMINHÕES) =====
function renderizarFrota() {
  const truck1Img = document.querySelector('.caminhao-card:nth-child(1) .caminhao-foto');
  const truck2Img = document.querySelector('.caminhao-card:nth-child(2) .caminhao-foto');

  if (frota.t1) truck1Img.src = frota.t1;
  if (frota.t2) truck2Img.src = frota.t2;

  // Preencher inputs se estiver logado
  if (document.body.classList.contains('admin-logged-in')) {
    document.getElementById('input-truck1').value = frota.t1 || '';
    document.getElementById('input-truck2').value = frota.t2 || '';
  }
}

function initFrota() {
  renderizarFrota();

  // Salvar links de texto
  document.getElementById('btn-salvar-frota').addEventListener('click', () => {
    const t1 = document.getElementById('input-truck1').value.trim();
    const t2 = document.getElementById('input-truck2').value.trim();

    frota.t1 = t1 || null;
    frota.t2 = t2 || null;

    salvarDados();
    renderizarFrota();
    mostrarToast('Fotos da frota atualizadas com sucesso!');
  });

  // Upload de arquivos (Galeria)
  document.querySelectorAll('.file-upload-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      const truckKey = e.target.dataset.truck; // 't1' ou 't2'
      
      if (file) {
        if (file.size > 2 * 1024 * 1024) { // Limite de 2MB para evitar estourar o localStorage
          mostrarToast('A imagem é muito grande. Tente uma menor que 2MB.', 'error');
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target.result;
          frota[truckKey] = base64;
          
          // Preview imediato no input e na imagem
          document.getElementById(`input-truck${truckKey === 't1' ? '1' : '2'}`).value = 'Imagem da Galeria (Base64)';
          renderizarFrota();
          mostrarToast('Imagem carregada! Clique em salvar para confirmar.');
        };
        reader.readAsDataURL(file);
      }
    });
  });
}

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', () => {
  // 1. Carregar dados do localStorage
  carregarDados();
  
  // 2. Verificar se está logado (agora usando localStorage para persistência total)
  if (localStorage.getItem(ADMIN_CONFIG.sessionKey) === 'true') {
    document.body.classList.add('admin-logged-in');
  }

  // 3. Inicializar componentes (já cientes do estado admin)
  initNavbar();
  initPrecos();
  initRotas();
  initPedido();
  initFooter();
  initScrollSuave();
  initBGRemoval();
  initFrota();
  initPedidosAdmin();
  initSettingsAdmin();
  initAdmin(); // Configura eventos do modal

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

  // Verificar estado para o ícone
  if (document.body.classList.contains('admin-logged-in')) {
    loginBtn.title = 'Sair da Área Administrativa';
  }

  // Abrir modal ou deslogar
  loginBtn.addEventListener('click', () => {
    if (document.body.classList.contains('admin-logged-in')) {
      if (confirm('Deseja sair da área administrativa?')) {
        document.body.classList.remove('admin-logged-in');
        localStorage.removeItem(ADMIN_CONFIG.sessionKey);
        loginBtn.title = 'Área do Proprietário';
        mostrarToast('Você saiu da área administrativa.');
        window.location.href = window.location.pathname; // Vai para o topo e limpa a hash
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
    if (inputSenha.value === customConfig.adminSenha) {
      document.body.classList.add('admin-logged-in');
      localStorage.setItem(ADMIN_CONFIG.sessionKey, 'true');
      modal.classList.remove('show');
      loginBtn.title = 'Sair da Área Administrativa';
      mostrarToast('Acesso administrativo liberado!');
      
      // Ir para o topo e recarregar para aplicar mudanças visuais
      window.location.href = window.location.pathname;
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

  // Modal Detalhes do Cliente
  const modalDetalhes = document.getElementById('modal-detalhes-cliente');
  const btnFecharDetalhes = document.getElementById('btn-fechar-detalhes');
  if (btnFecharDetalhes) {
    btnFecharDetalhes.addEventListener('click', () => {
      modalDetalhes.classList.remove('show');
    });
  }
  if (modalDetalhes) {
    modalDetalhes.addEventListener('click', (e) => {
      if (e.target === modalDetalhes) modalDetalhes.classList.remove('show');
    });
  }
}

function verDetalhesCliente(nome) {
  const modal = document.getElementById('modal-detalhes-cliente');
  const corpo = document.getElementById('detalhes-cliente-corpo');
  const titulo = document.getElementById('detalhes-cliente-titulo');
  
  if (!modal || !corpo) return;

  titulo.textContent = `Pedidos de ${nome}`;
  const pedidosCliente = pedidos.filter(p => p.nome.trim() === nome.trim());

  corpo.innerHTML = pedidosCliente.map(p => `
    <div class="detalhes-pedido-box">
      <h4>
        <span>📅 ${p.data}</span>
        <div class="modal-badge-group">
          <span class="pedido-status-badge ${p.status}">${p.status.toUpperCase()}</span>
          <span class="pedido-pagamento-badge ${p.pagamento}">${p.pagamento === 'pago' ? 'PAGO' : 'PENDENTE'}</span>
        </div>
      </h4>
      <p>📦 <strong>Itens:</strong> ${p.qtd20 > 0 ? p.qtd20 + 'x 20L ' : ''}${p.qtd10 > 0 ? p.qtd10 + 'x 10L' : ''}</p>
      <p>💰 <strong>Total:</strong> ${p.total}</p>
      <p>📍 <strong>Endereço:</strong> ${p.endereco}</p>
      ${p.telefone ? `<p>📞 <strong>Telefone:</strong> ${p.telefone}</p>` : ''}
      
      <div class="pedido-item-actions" style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 10px;">
        <button class="btn ${p.status === 'atendido' ? 'btn-outline' : 'btn-primary'} btn-sm" 
                onclick="toggleStatusPedido(${p.id}); verDetalhesCliente('${nome}')">
          ${p.status === 'atendido' ? 'Pendente' : 'Atender'}
        </button>
        <button class="btn ${p.pagamento === 'pago' ? 'btn-outline' : 'btn-success'} btn-sm" 
                onclick="togglePagamentoPedido(${p.id}); verDetalhesCliente('${nome}')">
          ${p.pagamento === 'pago' ? 'Marcar Pendente' : 'Marcar Pago'}
        </button>
      </div>
      ${p.telefone ? `
        <div style="margin-top: 10px;">
          <button class="btn btn-whatsapp btn-sm btn-full" onclick="abrirWhatsCliente('${p.telefone}')">
             <i class="fa-brands fa-whatsapp"></i> Falar com Cliente
          </button>
        </div>
      ` : ''}
    </div>
  `).join('');

  modal.classList.add('show');
}

function abrirWhatsCliente(tel) {
  if (!tel) return;
  const limpo = tel.replace(/\D/g, '');
  let link = limpo;
  if (limpo.length <= 11 && !limpo.startsWith('55')) {
    link = '55' + limpo;
  }
  window.open(`https://wa.me/${link}`, '_blank');
}

// ===== INICIALIZAÇÃO =====
async function bootstrap() {
  // Primeiro carrega os dados (Supabase ou Local)
  await carregarDados();
  
  // Depois inicializa as partes da UI
  initNavbar();
  initCalculadora();
  initPrecos();
  initRotas();
  initFrota();
  initPedidos();
  initAdmin();

  // Expor funções necessárias para o HTML (onclick, etc)
  window.verDetalhesCliente = verDetalhesCliente;
  window.abrirWhatsCliente = abrirWhatsCliente;
  window.toggleStatusPedido = typeof toggleStatusPedido !== 'undefined' ? toggleStatusPedido : null;
  window.togglePagamentoPedido = typeof togglePagamentoPedido !== 'undefined' ? togglePagamentoPedido : null;
}

// Inicia tudo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
