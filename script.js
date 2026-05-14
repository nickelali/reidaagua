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
        
        if (img.naturalWidth === 0 || img.naturalHeight === 0) return;
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
        const tolerance = isLogo ? 100 : 35; // Aumentado para a logo para garantir a remoção do branco
        console.log(`[RDA] Processando imagem: ${img.src} (Tolerância: ${tolerance})`);
        
        
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
  console.log('[RDA] Bootstrap iniciado...');
  try {
    // Primeiro carrega os dados (Supabase ou Local)
    console.log('[RDA] Carregando dados...');
    await carregarDados();
    
    // Depois inicializa as partes da UI
    console.log('[RDA] Inicializando componentes...');
    initNavbar();
    initPrecos();
    initRotas();
    initFrota();
    initPedido();
    
    // Expor funções necessárias para o HTML (onclick, etc)
    window.abrirWhatsCliente = abrirWhatsCliente;
    
    // Pequeno delay para animações
    setTimeout(initAnimacoes, 100);
    console.log('[RDA] Bootstrap concluído com sucesso!');
  } catch (err) {
    console.error('[RDA] Erro fatal no bootstrap:', err);
  }
}

// Inicia tudo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
