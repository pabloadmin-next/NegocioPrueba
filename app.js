const urlAppsScript = "https://script.google.com/macros/s/AKfycbzFGIB_P1HhwB4JWfORPA4NZXb9SPU-olmwVfQ_Mb9qoOryy5MI6JKG4kbKzeJ0vH7mYA/exec"; 


const USUARIOS = {
    "admin1": { nombre: "Carlos (Admin)", rol: "ADMIN", clave: "admin2026" },
    "admin2": { nombre: "Ana (Admin)", rol: "ADMIN", clave: "ana99" },
    "empleado1": { nombre: "Juan", rol: "EMPLEADO", clave: "juan123" },
    "empleado2": { nombre: "Sofía", rol: "EMPLEADO", clave: "sofia456" }
};

let usuarioActivo = null; 
let datosLocalesCrudos = null; 
let chartDiario = null;
let chartClientes = null; 
let productosBase = [];
let html5QrCode = null;
let carrito = [];
let escaneoDestinoModal = false;

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("tipoMovimiento").addEventListener("change", alternarTipoOperacion);
    document.getElementById("btnGuardar").addEventListener("click", enviarDatos);
    document.getElementById("btnActualizar").addEventListener("click", consultarPlanilla);
    document.getElementById("btnEscanear").addEventListener("click", iniciarEscaneo);
    document.getElementById("btnCerrarScanner").addEventListener("click", detenerEscaneo);
    document.getElementById("btnAgregarCarrito").addEventListener("click", agregarAlCarrito);
    
    // Buscador interactivo de productos de la planilla
    document.getElementById("productoInput").addEventListener("input", buscarProductosEnBase);
    
    document.getElementById("filtroLocalAdmin").addEventListener("change", renderizarDatosAdmin);
    
    document.getElementById("passwordInput").addEventListener("keypress", (e) => {
        if(e.key === "Enter") verificarLogin();
    });

    document.addEventListener("click", (e) => {
        if (!e.target.closest("#productoInput") && !e.target.closest("#sugerenciasList")) {
            document.getElementById("sugerenciasList").classList.add("hidden");
        }
    });
});

function alternarTipoOperacion(e) {
    const valor = e.target.value;
    if(valor === "GASTO") {
        document.getElementById("seccionBuscadorProductos").classList.add("hidden");
        document.getElementById("seccionCarrito").classList.add("hidden");
        document.getElementById("containerPago").classList.add("hidden");
        document.getElementById("seccionGastoDirecto").classList.remove("hidden");
    } else {
        document.getElementById("seccionBuscadorProductos").classList.remove("hidden");
        document.getElementById("seccionCarrito").classList.remove("hidden");
        document.getElementById("containerPago").classList.remove("hidden");
        document.getElementById("seccionGastoDirecto").classList.add("hidden");
    }
}

function mostrarToast(mensaje, tipo = "success") {
    const contenedor = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    const colorBg = tipo === "success" ? "bg-emerald-500" : "bg-rose-500";
    toast.className = `${colorBg} text-white px-5 py-3 rounded-2xl shadow-xl flex items-center space-x-3 text-xs font-bold pointer-events-auto transition-all duration-300`;
    toast.innerHTML = `<span>${tipo === 'success' ? '✨' : '⚠️'}</span> <span>${mensaje}</span>`;
    contenedor.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function verificarLogin() {
    const inputPass = document.getElementById("passwordInput").value;
    const errorMsg = document.getElementById("errorLogin");
    const encontrado = Object.values(USUARIOS).find(u => u.clave === inputPass);

    if (encontrado) {
        usuarioActivo = encontrado;
        conectarInterfaz();
        mostrarToast(`Bienvenido ${usuarioActivo.nombre}`);
        descargarListaProductos();
    } else {
        errorMsg.classList.remove("hidden");
    }
}

function conectarInterfaz() {
    document.getElementById("loginSection").classList.add("hidden");
    document.getElementById("mainDashboard").classList.remove("hidden");
    document.getElementById("badgeRol").innerText = usuarioActivo.nombre;

    if (usuarioActivo.rol === "ADMIN") {
        document.getElementById("adminKPIs").classList.remove("hidden");
        document.getElementById("adminCharts").classList.remove("hidden");
        document.getElementById("adminLocalSelector").classList.remove("hidden");
        document.getElementById("btnActualizar").classList.remove("hidden");
        consultarPlanilla();
    } else {
        document.getElementById("adminKPIs").classList.add("hidden");
        document.getElementById("adminCharts").classList.add("hidden");
        document.getElementById("adminLocalSelector").classList.add("hidden");
        document.getElementById("btnActualizar").classList.add("hidden");
    }
}

function descargarListaProductos() {
    fetch(`${urlAppsScript}?obtenerProductos=true`)
    .then(res => res.json())
    .then(data => {
        if(Array.isArray(data)) {
            productosBase = data;
            console.log("Productos sincronizados:", productosBase.length);
        }
    })
    .catch(() => console.log("Operando sin sincronización de productos."));
}

function buscarProductosEnBase(e) {
    const busqueda = e.target.value.toLowerCase().trim();
    const desplegable = document.getElementById("sugerenciasList");
    desplegable.innerHTML = "";

    if (busqueda.length === 0) {
        desplegable.classList.add("hidden");
        return;
    }

    const coincidencias = productosBase.filter(p => 
        p.producto.toLowerCase().includes(busqueda) || 
        String(p.codigo).includes(busqueda)
    ).slice(0, 5);

    if (coincidencias.length === 0) {
        desplegable.classList.add("hidden");
        return;
    }

    coincidencias.forEach(p => {
        const item = document.createElement("div");
        item.className = "px-4 py-2 hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700 border-b border-slate-100 last:border-b-0";
        item.innerText = `${p.producto} ($${p.precio})`;
        item.addEventListener("click", () => {
            document.getElementById("productoInput").value = p.producto;
            document.getElementById("precioInput").value = p.precio;
            desplegable.classList.add("hidden");
        });
        desplegable.appendChild(item);
    });

    desplegable.classList.remove("hidden");
}

function iniciarEscaneo() {
    document.getElementById("scannerContainer").classList.remove("hidden");
    html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start(
        { facingMode: "environment" },
        { fps: 15, qrbox: { width: 250, height: 120 } },
        (decodedText) => {
            detenerEscaneo();
            procesarCodigoEscaneado(decodedText);
        },
        () => {}
    ).catch(() => {
        mostrarToast("Cámara no disponible", "error");
        document.getElementById("scannerContainer").classList.add("hidden");
    });
}

function detenerEscaneo() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            document.getElementById("scannerContainer").classList.add("hidden");
        }).catch(() => {
            document.getElementById("scannerContainer").classList.add("hidden");
        });
    }
}

// CORRECCIÓN en el procesamiento del código escaneado
function procesarCodigoEscaneado(codigo) {
    const buscado = productosBase.find(p => String(p.codigo).trim() === String(codigo).trim());
    
    if (buscado) {
        if (escaneoDestinoModal) {
            document.getElementById("modalCodigoInput").value = buscado.codigo;
            document.getElementById("modalDescripcionInput").value = buscado.producto;
            document.getElementById("modalPrecioInput").value = buscado.precio;
            escaneoDestinoModal = false;
        } else {
            document.getElementById("productoInput").value = buscado.producto;
            document.getElementById("precioInput").value = buscado.precio;
            mostrarToast(`Encontrado: ${buscado.producto}`);
        }
    } else {
        // SI NO EXISTE: Abre la ventana emergente
        if (escaneoDestinoModal) {
            document.getElementById("modalCodigoInput").value = codigo;
            escaneoDestinoModal = false;
        } else {
            abrirModalProducto(codigo);
        }
    }
}

// GESTIÓN DEL CARRITO EN TIEMPO REAL
// CORRECCIÓN: Añadir al carrito previniendo recarga de formulario
function agregarAlCarrito(e) {
    if (e) e.preventDefault(); // Evita cualquier comportamiento extraño del botón

    const prodInput = document.getElementById("productoInput");
    const precInput = document.getElementById("precioInput");
    const cantInput = document.getElementById("cantidadInput");

    if (!prodInput || !precInput || !cantInput) {
        mostrarToast("Error al cargar los campos de entrada.", "error");
        return;
    }

    const productoText = prodInput.value.trim();
    const precioUnitario = parseFloat(precInput.value);
    const cantidad = parseFloat(cantInput.value);

    if (!productoText || isNaN(precioUnitario) || isNaN(cantidad) || cantidad <= 0) {
        mostrarToast("Escribí un producto y asignale un precio válido.", "error");
        return;
    }

    const subtotal = Math.round(precioUnitario * cantidad);

    carrito.push({
        producto: productoText,
        precio: precioUnitario,
        cantidad: cantidad,
        subtotal: subtotal
    });

    prodInput.value = "";
    precInput.value = "";
    cantInput.value = "1";

    mostrarToast(`Sumado: ${productoText}`);
    renderizarCarrito();
}

function eliminarDeCarrito(index) {
    carrito.splice(index, 1);
    renderizarCarrito();
}

function vaciarCarrito() {
    carrito = [];
    renderizarCarrito();
}

function renderizarCarrito() {
    const container = document.getElementById("listaCarrito");
    const totalLabel = document.getElementById("totalVentaCarrito");
    container.innerHTML = "";

    if (carrito.length === 0) {
        container.innerHTML = `<p class="text-center text-xs text-slate-400 py-4 italic">El carrito está vacío. Sumá algún producto arriba.</p>`;
        totalLabel.innerText = "$0";
        return;
    }

    let totalAcumulado = 0;

    carrito.forEach((item, index) => {
        totalAcumulado += item.subtotal;
        const cantTexto = item.cantidad % 1 === 0 ? `${item.cantidad}u` : `${item.cantidad}kg`;

        const row = document.createElement("div");
        row.className = "flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-100 shadow-sm";
        row.innerHTML = `
            <div>
                <p class="text-xs font-bold text-slate-800">${item.producto}</p>
                <p class="text-[10px] text-slate-400 font-medium">${cantTexto} x $${item.precio}</p>
            </div>
            <div class="flex items-center space-x-3">
                <span class="text-xs font-bold text-slate-800">$${item.subtotal}</span>
                <button onclick="eliminarDeCarrito(${index})" class="text-rose-500 hover:text-rose-700 text-xs px-1">❌</button>
            </div>
        `;
        container.appendChild(row);
    });

    totalLabel.innerText = `$${totalAcumulado}`;
}

function logout() {
    usuarioActivo = null;
    document.getElementById("passwordInput").value = "";
    document.getElementById("loginSection").classList.remove("hidden");
    document.getElementById("mainDashboard").classList.add("hidden");
    detenerEscaneo();
}

// GUARDADO FINAL
function enviarDatos() {
    const tipoMovElement = document.getElementById("tipoMovimiento");
    const localElement = document.getElementById("localRegistro");
    const btn = document.getElementById("btnGuardar");

    if (!tipoMovElement || !localElement) {
        mostrarToast("Error interno: No se encontraron selectores de movimiento/local.", "error");
        return;
    }

    const tipoMov = tipoMovElement.value;
    const local = localElement.value;

    let monto = 0;
    let tipoPago = "Efectivo";
    let detalle = "";

    if (tipoMov === "VENTA") {
        if (carrito.length === 0) {
            mostrarToast("El carrito de compras está vacío. Sumá un producto primero.", "error");
            return;
        }
        monto = carrito.reduce((sum, item) => sum + item.subtotal, 0);
        
        const tipoPagoElement = document.getElementById("tipoPagoInput");
        tipoPago = tipoPagoElement ? tipoPagoElement.value : "Efectivo"; // Blindado por si no existe
        
        detalle = carrito.map(item => {
            const cantStr = item.amount % 1 === 0 ? `${item.cantidad}u` : `${item.cantidad}kg`;
            return `${cantStr} ${item.producto} ($${item.subtotal})`;
        }).join(" | ");
    } else {
        const montoGastoElement = document.getElementById("montoGastoInput");
        const detalleGastoElement = document.getElementById("detalleGastoInput");
        
        monto = montoGastoElement ? parseFloat(montoGastoElement.value) : 0;
        detalle = detalleGastoElement ? detalleGastoElement.value.trim() : "";

        if (isNaN(monto) || monto <= 0 || !detalle) {
            mostrarToast("Faltan ingresar el monto o concepto del gasto", "error");
            return;
        }
    }

    btn.innerText = "⏳ Guardando...";
    btn.disabled = true;

    const payload = {
        operacion: tipoMov,
        monto: monto,
        tipoPago: tipoPago,
        detalle: detalle,
        usuario: usuarioActivo ? usuarioActivo.nombre : "Usuario",
        local: local
    };

    fetch(urlAppsScript, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        btn.innerText = "Procesar Transacción";
        btn.disabled = false;
        if(data.status === "success") {
            mostrarToast("¡Venta guardada con éxito!");
            if (tipoMov === "VENTA") {
                vaciarCarrito();
            } else {
                if(document.getElementById("montoGastoInput")) document.getElementById("montoGastoInput").value = "";
                if(document.getElementById("detalleGastoInput")) document.getElementById("detalleGastoInput").value = "";
            }
            if (usuarioActivo && usuarioActivo.rol === "ADMIN") consultarPlanilla();
        } else {
            mostrarToast("Error: " + data.message, "error");
        }
    })
    .catch(() => {
        mostrarToast("Fallo de red", "error");
        btn.innerText = "Procesar Transacción";
        btn.disabled = false;
    });
}

function consultarPlanilla() {
    if (usuarioActivo.rol !== "ADMIN") return;
    const btnAct = document.getElementById("btnActualizar");
    btnAct.innerText = "⏳ Sincronizando...";

    fetch(urlAppsScript)
    .then(res => res.json())
    .then(res => {
        btnAct.innerText = "🔄 Actualizar";
        if(res.error) return;
        datosLocalesCrudos = res; 
        renderizarDatosAdmin(); 
    })
    .catch(() => { btnAct.innerText = "🔄 Actualizar"; });
}

function renderizarDatosAdmin() {
    if (!datosLocalesCrudos) return;
    
    const localSeleccionado = document.getElementById("filtroLocalAdmin").value;
    const dataLocal = datosLocalesCrudos.locales[localSeleccionado];

    if (!dataLocal) return;

    const totalVentas = dataLocal.ventas.Efectivo + dataLocal.ventas.Transferencia + dataLocal.ventas.Tarjeta;
    const totalGastos = dataLocal.gastos.Efectivo + dataLocal.gastos.Transferencia + dataLocal.gastos.Tarjeta;
    
    const netoEfectivo = dataLocal.ventas.Efectivo - dataLocal.gastos.Efectivo;
    const netoDigital = (dataLocal.ventas.Transferencia + dataLocal.ventas.Tarjeta) - (dataLocal.gastos.Transferencia + dataLocal.gastos.Tarjeta);

    document.getElementById("txtVentasTotal").innerText = formatPesos(totalVentas);
    document.getElementById("txtGastosTotal").innerText = formatPesos(totalGastos);
    document.getElementById("txtCajaEfectivo").innerText = formatPesos(netoEfectivo);
    document.getElementById("txtCajaDigital").innerText = formatPesos(netoDigital);

    document.getElementById("mesVentas").innerText = formatPesos(dataLocal.balanceMes.ventas);
    document.getElementById("mesGastos").innerText = formatPesos(dataLocal.balanceMes.gastos);
    document.getElementById("mesNeto").innerText = formatPesos(dataLocal.balanceMes.ventas - dataLocal.balanceMes.gastos);

    // Gráfico de Ventas vs Gastos
    const ctxD = document.getElementById('chartDiario').getContext('2d');
    if (chartDiario) chartDiario.destroy();
    chartDiario = new Chart(ctxD, {
        type: 'bar',
        data: {
            labels: ['Efectivo', 'Transferencia', 'Tarjeta'],
            datasets: [
                { label: 'Ingresos', data: [dataLocal.ventas.Efectivo, dataLocal.ventas.Transferencia, dataLocal.ventas.Tarjeta], backgroundColor: '#2dd4bf', borderRadius: 8 },
                { label: 'Egresos', data: [dataLocal.gastos.Efectivo, dataLocal.gastos.Transferencia, dataLocal.gastos.Tarjeta], backgroundColor: '#fb7185', borderRadius: 8 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // NUEVO GRÁFICO: TOP PRODUCTOS MÁS VENDIDOS HOY
    const productosTop = Object.entries(datosLocalesCrudos.topProductos).sort((a,b) => b[1] - a[1]).slice(0, 5);
    const ctxC = document.getElementById('chartClientes').getContext('2d');
    if (chartClientes) chartClientes.destroy();
    chartClientes = new Chart(ctxC, {
        type: 'bar',
        data: {
            labels: productosTop.map(p => p[0]),
            datasets: [{ label: 'Cant. Vendida', data: productosTop.map(p => p[1]), backgroundColor: '#60a5fa', borderRadius: 8 }]
        },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
    });
}

function formatPesos(num) {
    return '$' + num.toLocaleString('es-AR', { minimumFractionDigits: 0 });
}
// CORRECCIÓN en el procesamiento del código escaneado
function procesarCodigoEscaneado(codigo) {
    const buscado = productosBase.find(p => String(p.codigo).trim() === String(codigo).trim());
    
    if (buscado) {
        if (escaneoDestinoModal) {
            document.getElementById("modalCodigoInput").value = buscado.codigo;
            document.getElementById("modalDescripcionInput").value = buscado.producto;
            document.getElementById("modalPrecioInput").value = buscado.precio;
            escaneoDestinoModal = false;
        } else {
            document.getElementById("productoInput").value = buscado.producto;
            document.getElementById("precioInput").value = buscado.precio;
            mostrarToast(`Encontrado: ${buscado.producto}`);
        }
    } else {
        // SI NO EXISTE: Abre la ventana emergente
        if (escaneoDestinoModal) {
            document.getElementById("modalCodigoInput").value = codigo;
            escaneoDestinoModal = false;
        } else {
            abrirModalProducto(codigo);
        }
    }
}