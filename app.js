const urlAppsScript = "https://script.google.com/macros/s/AKfycbwB8uu1vIJquglN5a3sP3SLsXdlhmhpKYp5X9hQpR18THLW4R94PkCfDg2W7e5K1UIeNg/exec"; 
 

const USUARIOS = {
    "admin1": { nombre: "Carlos (Admin)", rol: "ADMIN", clave: "admin2026" },
    "admin2": { nombre: "Ana (Admin)", rol: "ADMIN", clave: "ana99" },
    "empleado1": { nombre: "Juan", rol: "EMPLEADO", clave: "juan123" },
    "empleado2": { nombre: "Sofía", rol: "EMPLEADO", clave: "sofia456" }
};

let usuarioActivo = null; 
let datosLocalesCrudos = null; // Guardará la respuesta consolidada de Google Sheets
let chartDiario = null;
let chartClientes = null;
let productosBase = [];
let html5QrCode = null;

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("tipoMovimiento").addEventListener("change", (e) => {
        const lbl = document.getElementById("lblDetalle");
        const input = document.getElementById("detalleInput");
        const body = document.body;

        if(e.target.value === "GASTO") {
            lbl.innerText = "Concepto del Gasto / Proveedor";
            input.placeholder = "Ej: Pago de limpieza";
            body.classList.remove("theme-venta");
            body.classList.add("theme-gasto");
            document.getElementById("btnEscanear").classList.add("hidden");
        } else {
            lbl.innerText = "Nombre del Cliente o Producto";
            input.placeholder = "Ej: Coca-Cola 1.5L / Juan Pérez";
            body.classList.remove("theme-gasto");
            body.classList.add("theme-venta");
            document.getElementById("btnEscanear").classList.remove("hidden");
        }
    });

    document.getElementById("btnGuardar").addEventListener("click", enviarDatos);
    document.getElementById("btnActualizar").addEventListener("click", consultarPlanilla);
    document.getElementById("btnEscanear").addEventListener("click", iniciarEscaneo);
    document.getElementById("btnCerrarScanner").addEventListener("click", detenerEscaneo);
    
    // Filtro dinámico para recargar gráficos al cambiar el Local
    document.getElementById("filtroLocalAdmin").addEventListener("change", renderizarDatosAdmin);
    
    document.getElementById("passwordInput").addEventListener("keypress", (e) => {
        if(e.key === "Enter") verificarLogin();
    });
});

function mostrarToast(mensaje, tipo = "success") {
    const contenedor = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    const colorBg = tipo === "success" ? "bg-emerald-500" : "bg-rose-500";
    const icono = tipo === "success" ? "✨" : "⚠️";

    toast.className = `${colorBg} text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center space-x-3 text-xs font-bold tracking-wide animate-slide-in pointer-events-auto border border-white/20`;
    toast.style.boxShadow = "0 10px 20px rgba(0,0,0,0.1), inset -3px -3px 6px rgba(0,0,0,0.1), inset 3px 3px 6px rgba(255,255,255,0.2)";
    toast.innerHTML = `<span>${icono}</span> <span>${mensaje}</span>`;
    
    contenedor.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "scale(0.9) translateY(-10px)";
        toast.style.transition = "all 0.3s ease";
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
        mostrarToast(`Hola ${usuarioActivo.nombre}`);
        descargarListaProductos();
    } else {
        errorMsg.classList.remove("hidden");
    }
}

function conectarInterfaz() {
    document.getElementById("loginSection").classList.add("hidden");
    document.getElementById("mainDashboard").classList.remove("hidden");
    document.getElementById("badgeRol").innerText = usuarioActivo.nombre;
    document.getElementById("errorLogin").classList.add("hidden");

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
        }
    })
    .catch(() => console.log("Operando en modo manual sin sincronización."));
}

function iniciarEscaneo() {
    const scannerBox = document.getElementById("scannerContainer");
    scannerBox.classList.remove("hidden");
    
    html5QrCode = new Html5Qrcode("reader");
    const config = { fps: 15, qrbox: { width: 250, height: 120 } };

    html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
            detenerEscaneo();
            procesarCodigoEscaneado(decodedText);
        },
        () => {}
    ).catch(() => {
        mostrarToast("No se pudo iniciar la cámara", "error");
        scannerBox.classList.add("hidden");
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

function procesarCodigoEscaneado(codigo) {
    const buscado = productosBase.find(p => String(p.codigo).trim() === String(codigo).trim());
    if (buscado) {
        document.getElementById("detalleInput").value = buscado.producto;
        document.getElementById("montoInput").value = buscado.precio;
        mostrarToast(`Producto encontrado: ${buscado.producto}`, "success");
    } else {
        document.getElementById("detalleInput").value = `Código: ${codigo}`;
        mostrarToast("Código nuevo no registrado", "error");
    }
}

function logout() {
    usuarioActivo = null;
    document.getElementById("passwordInput").value = "";
    document.getElementById("loginSection").classList.remove("hidden");
    document.getElementById("mainDashboard").classList.add("hidden");
    detenerEscaneo();
}

function enviarDatos() {
    const tipoMov = document.getElementById("tipoMovimiento").value;
    const monto = parseFloat(document.getElementById("montoInput").value);
    const tipoPago = document.getElementById("tipoPagoInput").value;
    const detalle = document.getElementById("detalleInput").value.trim();
    const local = document.getElementById("localRegistro").value; // Leemos el local activo del selector

    if (!monto || !detalle) {
        mostrarToast("Faltan datos obligatorios", "error");
        return;
    }

    const btn = document.getElementById("btnGuardar");
    btn.innerText = "⏳ Guardando...";
    btn.disabled = true;

    const payload = {
        operacion: tipoMov,
        monto: monto,
        tipoPago: tipoPago,
        detalle: detalle,
        usuario: usuarioActivo.nombre,
        local: local // Enviamos el local a la nueva columna
    };

    fetch(urlAppsScript, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        btn.innerText = "Guardar Movimiento";
        btn.disabled = false;
        if(data.status === "success") {
            mostrarToast("Guardado con éxito");
            document.getElementById("montoInput").value = "";
            document.getElementById("detalleInput").value = "";
            if (usuarioActivo.rol === "ADMIN") consultarPlanilla();
        } else {
            mostrarToast("Error: " + data.message, "error");
        }
    })
    .catch(() => {
        mostrarToast("Fallo de red", "error");
        btn.innerText = "Guardar Movimiento";
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

        datosLocalesCrudos = res; // Guardamos globalmente los datos para alternar rápido
        renderizarDatosAdmin(); // Renderiza según el local seleccionado
    })
    .catch(() => { btnAct.innerText = "🔄 Actualizar"; });
}

// NUEVO: RENDERIZACIÓN DINÁMICA DE KPIs Y GRÁFICOS
function renderizarDatosAdmin() {
    if (!datosLocalesCrudos) return;
    
    // Leemos qué local quiere inspeccionar el administrador
    const localSeleccionado = document.getElementById("filtroLocalAdmin").value;
    const dataLocal = datosLocalesCrudos.locales[localSeleccionado];

    if (!dataLocal) return;

    // Totales de Hoy (Suma de Efectivo, Transf y Tarjeta)
    const totalVentas = dataLocal.ventas.Efectivo + dataLocal.ventas.Transferencia + dataLocal.ventas.Tarjeta;
    const totalGastos = dataLocal.gastos.Efectivo + dataLocal.gastos.Transferencia + dataLocal.gastos.Tarjeta;
    
    // Neto Diario
    const netoEfectivo = dataLocal.ventas.Efectivo - dataLocal.gastos.Efectivo;
    const netoDigital = (dataLocal.ventas.Transferencia + dataLocal.ventas.Tarjeta) - (dataLocal.gastos.Transferencia + dataLocal.gastos.Tarjeta);

    // Asignación a las tarjetas visuales
    document.getElementById("txtVentasTotal").innerText = formatPesos(totalVentas);
    document.getElementById("txtGastosTotal").innerText = formatPesos(totalGastos);
    document.getElementById("txtCajaEfectivo").innerText = formatPesos(netoEfectivo);
    document.getElementById("txtCajaDigital").innerText = formatPesos(netoDigital);

    // Indicadores Mensuales
    document.getElementById("mesVentas").innerText = formatPesos(dataLocal.balanceMes.ventas);
    document.getElementById("mesGastos").innerText = formatPesos(dataLocal.balanceMes.gastos);
    document.getElementById("mesNeto").innerText = formatPesos(dataLocal.balanceMes.ventas - dataLocal.balanceMes.gastos);

    // Renderizado del Gráfico de Barra comparativo (Incluye Tarjeta)
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

    // Top Clientes (Sigue siendo global para mantener la visualización general)
    const clientes = Object.entries(datosLocalesCrudos.resumenClientes).sort((a,b) => b[1] - a[1]).slice(0, 5);
    const ctxC = document.getElementById('chartClientes').getContext('2d');
    if (chartClientes) chartClientes.destroy();
    chartClientes = new Chart(ctxC, {
        type: 'bar',
        data: {
            labels: clientes.map(c => c[0]),
            datasets: [{ label: 'Total ($)', data: clientes.map(c => c[1]), backgroundColor: '#60a5fa', borderRadius: 8 }]
            },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
    });
}

function formatPesos(num) {
    return '$' + num.toLocaleString('es-AR', { minimumFractionDigits: 0 });
}