import './style.css';

// ══════════════════════════════════════════════
//  RENEW WATER — Control de Inventario
//  JavaScript Logic (Conectado a n8n Backend)
// ══════════════════════════════════════════════

// ── Webhook URL (n8n) ─────────────────────────
const WEBHOOK_URL = 'https://n8n.milian-app.online/webhook/renewwater';
const WEBHOOK_POST_URL = 'https://n8n.milian-app.online/webhook/renewinventario';

// ── Variable Global: almacena el inventario completo ──
let inventarioCompleto = { miami: [], orlando: [] };

// ── Sede activa en el dashboard ───────────────
let currentTab = 'miami';

// ── DOM Elements ──────────────────────────────
const stockTableBody = document.getElementById('stockTableBody');
const totalProducts = document.getElementById('totalProducts');
const lastUpdate = document.getElementById('lastUpdate');
const currentDate = document.getElementById('currentDate');
const toast = document.getElementById('toast');
const form = document.getElementById('operationForm');
const tabBtns = document.querySelectorAll('.tab-btn');
const sedeSelect = document.getElementById('sede');
const productoSelect = document.getElementById('producto');

// ── Set Current Date ──────────────────────────
function setCurrentDate() {
  const now = new Date();
  const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
  currentDate.textContent = now.toLocaleDateString('es-ES', options);
}

// ══════════════════════════════════════════════
//  MOSTRAR ESTADO DE CARGA
// ══════════════════════════════════════════════

function mostrarCargando() {
  stockTableBody.innerHTML = `
    <tr>
      <td colspan="4" class="text-center py-10">
        <div class="flex flex-col items-center gap-3">
          <svg class="w-6 h-6 text-brand-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="text-sm text-gray-500">Cargando inventario...</span>
        </div>
      </td>
    </tr>
  `;
  totalProducts.textContent = '...';
}

// ══════════════════════════════════════════════
//  CARGAR INVENTARIO (GET desde n8n)
// ══════════════════════════════════════════════

/**
 * Hace fetch al webhook de n8n.
 * Espera recibir un JSON con estructura: { miami: [...], orlando: [...] }
 * Guarda los datos en inventarioCompleto y renderiza la tabla.
 */
async function cargarInventario() {
  mostrarCargando();

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    console.log('📥 Inventario recibido del servidor:', data);

    // Guardar en la variable global
    inventarioCompleto = {
      miami: data.miami || [],
      orlando: data.orlando || [],
    };

    // Renderizar la tabla con la sede activa
    renderizarTabla(currentTab);

    // Llenar el select de productos dinámicamente
    llenarSelectProductos();

  } catch (error) {
    console.warn('⚠️ No se pudo conectar al webhook:', error.message);
    // Mostrar mensaje de error en la tabla
    stockTableBody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center py-10">
          <div class="flex flex-col items-center gap-3">
            <svg class="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span class="text-sm text-gray-500">Error al cargar inventario. <button onclick="cargarInventario()" class="text-brand-400 hover:text-brand-300 underline">Reintentar</button></span>
          </div>
        </td>
      </tr>
    `;
    totalProducts.textContent = '0';
  }

  // Actualizar timestamp
  const now = new Date();
  lastUpdate.textContent = `Actualizado: ${now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
}

// Hacer accesible globalmente para onclick en HTML
window.cargarInventario = cargarInventario;

// ══════════════════════════════════════════════
//  RENDERIZAR TABLA (por sede)
// ══════════════════════════════════════════════

/**
 * Limpia el tbody y genera filas a partir de inventarioCompleto[sede].
 * Si la existencia es < 5, resalta en rojo con etiqueta "Stock Bajo".
 */
function renderizarTabla(sede) {
  stockTableBody.innerHTML = '';
  const data = inventarioCompleto[sede] || [];

  if (data.length === 0) {
    stockTableBody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center py-8 text-gray-500">
          No hay datos disponibles para esta sede.
        </td>
      </tr>
    `;
    totalProducts.textContent = '0';
    return;
  }

  data.forEach((item, index) => {
    const row = document.createElement('tr');
    row.style.animationDelay = `${index * 60}ms`;
    row.classList.add('animate-fade-in');

    // Determinar color y badge según nivel de stock
    const existencia = Number(item.existencia) || 0;
    let stockHTML = '';

    if (existencia < 5) {
      stockHTML = `
        <span class="font-semibold text-red-400">${existencia}</span>
        <span class="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30">
          Stock Bajo
        </span>
      `;
    } else if (existencia <= 10) {
      stockHTML = `
        <span class="font-semibold text-red-400">${existencia}</span>
        <span class="text-gray-600 text-xs ml-1">uds</span>
      `;
    } else if (existencia <= 20) {
      stockHTML = `
        <span class="font-semibold text-yellow-400">${existencia}</span>
        <span class="text-gray-600 text-xs ml-1">uds</span>
      `;
    } else {
      stockHTML = `
        <span class="font-semibold text-green-400">${existencia}</span>
        <span class="text-gray-600 text-xs ml-1">uds</span>
      `;
    }

    row.innerHTML = `
      <td>
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-mono font-semibold bg-surface-700 text-brand-400">
          ${item.codigo || '—'}
        </span>
      </td>
      <td class="font-medium text-gray-200">${item.producto || item.nombre || '—'}</td>
      <td class="text-gray-400">${item.linea || '—'}</td>
      <td class="text-right">${stockHTML}</td>
    `;
    stockTableBody.appendChild(row);
  });

  totalProducts.textContent = data.length;
}

// ══════════════════════════════════════════════
//  LLENAR SELECT DE PRODUCTOS (dinámico)
// ══════════════════════════════════════════════

/**
 * Recorre ambos arrays (miami + orlando) para extraer
 * códigos y nombres de productos únicos, y los inyecta
 * como <option> en el select del formulario.
 */
function llenarSelectProductos() {
  // Combinar productos de ambas sedes y eliminar duplicados por código
  const todosLosProductos = [
    ...(inventarioCompleto.miami || []),
    ...(inventarioCompleto.orlando || []),
  ];

  const productosUnicos = new Map();
  todosLosProductos.forEach(item => {
    const codigo = item.codigo || '';
    if (codigo && !productosUnicos.has(codigo)) {
      productosUnicos.set(codigo, item.producto || item.nombre || codigo);
    }
  });

  // Limpiar opciones actuales (excepto la primera: placeholder)
  productoSelect.innerHTML = '<option value="" disabled selected>Selecciona un producto...</option>';

  // Insertar las opciones dinámicamente
  productosUnicos.forEach((nombre, codigo) => {
    const option = document.createElement('option');
    option.value = codigo;
    option.textContent = `${codigo} - ${nombre}`;
    productoSelect.appendChild(option);
  });

  console.log(`📋 Select de productos actualizado: ${productosUnicos.size} productos`);
}

// ══════════════════════════════════════════════
//  TABS — Interactividad de Pestañas
// ══════════════════════════════════════════════

function activarTab(sede) {
  currentTab = sede;

  // Actualizar estilo visual de los tabs
  tabBtns.forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-selected', 'false');
  });

  const targetBtn = document.querySelector(`.tab-btn[data-tab="${sede}"]`);
  if (targetBtn) {
    targetBtn.classList.add('active');
    targetBtn.setAttribute('aria-selected', 'true');
  }

  // Renderizar la tabla con la sede seleccionada
  renderizarTabla(sede);
}

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    activarTab(btn.dataset.tab);
  });
});

// ══════════════════════════════════════════════
//  SINCRONIZACIÓN Formulario ↔ Dashboard
// ══════════════════════════════════════════════

/**
 * Cuando el usuario cambia la sede en el formulario,
 * la tabla del dashboard se sincroniza automáticamente.
 */
sedeSelect.addEventListener('change', () => {
  const sedeValue = sedeSelect.value.toLowerCase(); // "miami" o "orlando"
  activarTab(sedeValue);
});

// ══════════════════════════════════════════════
//  FORMULARIO — Submit Handler
// ══════════════════════════════════════════════

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Get product code and full name from the select
  const productoEl = document.getElementById('producto');
  const productoCode = productoEl.value;
  const productoName = productoEl.options[productoEl.selectedIndex]?.textContent?.replace(`${productoCode} - `, '') || productoCode;

  // Look up the product's linea from inventarioCompleto
  const sedeValue = document.getElementById('sede').value;
  const allProducts = [...(inventarioCompleto.miami || []), ...(inventarioCompleto.orlando || [])];
  const matchedProduct = allProducts.find(p => p.codigo === productoCode);
  const productoLinea = matchedProduct?.linea || '';

  // Collect form data into a JSON object
  const payload = {
    sede: sedeValue,
    tipoOperacion: document.getElementById('tipoOperacion').value,
    codigo: productoCode,
    producto: productoName,
    linea: productoLinea,
    cantidad: parseInt(document.getElementById('cantidad').value, 10),
    monto: parseFloat(document.getElementById('monto').value),
    descripcion: document.getElementById('descripcion').value,
    fecha: new Date().toLocaleDateString('en-GB'),
  };

  console.log('📦 Payload de operación:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(WEBHOOK_POST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    console.log('✅ Respuesta del servidor:', result);

    // Mostrar toast de éxito
    showToast();

    // Reset form
    form.reset();

    // Refrescar inventario tras registrar
    cargarInventario();

  } catch (error) {
    console.error('❌ Error al registrar operación:', error);
    showToast('Error al conectar con el servidor', true);
  }
});

// ══════════════════════════════════════════════
//  TOAST NOTIFICATION
// ══════════════════════════════════════════════

function showToast(message = null, isError = false) {
  const toastTitle = toast.querySelector('p.font-semibold');
  const toastDesc = toast.querySelector('p.text-xs');
  const toastIconBg = toast.querySelector('.flex-shrink-0');
  const toastIcon = toastIconBg.querySelector('svg');

  if (isError) {
    toastTitle.textContent = '¡Error!';
    toastDesc.textContent = message || 'Ocurrió un problema al procesar la operación.';
    toastIconBg.classList.remove('bg-brand-500/20');
    toastIconBg.classList.add('bg-red-500/20');
    toastIcon.classList.remove('text-brand-400');
    toastIcon.classList.add('text-red-400');
  } else {
    toastTitle.textContent = '¡Operación Registrada!';
    toastDesc.textContent = message || 'Los datos fueron guardados con éxito.';
    toastIconBg.classList.remove('bg-red-500/20');
    toastIconBg.classList.add('bg-brand-500/20');
    toastIcon.classList.remove('text-red-400');
    toastIcon.classList.add('text-brand-400');
  }

  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

// ══════════════════════════════════════════════
//  ANIMACIÓN de filas (inyectada via JS)
// ══════════════════════════════════════════════

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes fadeInRow {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in {
    animation: fadeInRow 0.4s ease-out forwards;
    opacity: 0;
  }
`;
document.head.appendChild(styleSheet);

// ══════════════════════════════════════════════
//  INICIALIZACIÓN
// ══════════════════════════════════════════════

setCurrentDate();
cargarInventario();
