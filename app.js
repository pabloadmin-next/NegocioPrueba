const urlAppsScript = "https://script.google.com/macros/s/AKfycbwB8uu1vIJquglN5a3sP3SLsXdlhmhpKYp5X9hQpR18THLW4R94PkCfDg2W7e5K1UIeNg/exec"; 

// SISTEMA DE USUARIOS POR CONTRASEÑA (Podés añadir los que quieras)
const USUARIOS = {
    "admin1": { nombre: "Carlos (Admin)", rol: "ADMIN", clave: "admin2026" },
    "admin2": { nombre: "Ana (Admin)", rol: "ADMIN", clave: "ana99" },
    "empleado1": { nombre: "Juan", rol: "EMPLEADO", clave: "juan123" },
    "empleado2": { nombre: "Layla", rol: "EMPLEADO", clave: "layla456" }
};

let usuarioActivo = null; 
let chartDiario = null;
let chartClientes = null;

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
        } else {
            lbl.innerText = "Nombre del Cliente";
            input.placeholder = "Ej: Juan Pérez";
            body.classList.remove("theme-gasto");
            body.classList.add("theme-venta");
        }
    });

    document.getElementById("btnGuardar").addEventListener("click", enviarDatos);
    document.getElementById("btnActualizar").addEventListener("click", consultarPlanilla);
    
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

// VERIFICACIÓN BUSCANDO EN EL OBJETO DE USUARIOS
function verificarLogin() {
    const inputPass = document.getElementById("passwordInput").value;
    const errorMsg = document.getElementById("errorLogin");
    
    // Buscar si alguna clave coincide
    const encontrado = Object.values(USUARIOS).find(u => u.clave === inputPass);

    if (encontrado) {
        usuarioActivo = encontrado;
        conectarInterfaz();
        mostrarToast(`Hola ${usuarioActivo.nombre}`);
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
        document.getElementById("btnActualizar").classList.remove("hidden");
        consultarPlanilla();
    } else {
        document.getElementById("adminKPIs").classList.add("hidden");
        document.getElementById("adminCharts").classList.add("hidden");
        document.getElementById("btnActualizar").classList.add("hidden");
    }
}

function logout() {
    usuarioActivo = null;
    document.getElementById("passwordInput").value = "";
    document.getElementById("loginSection").classList.remove("hidden");
    document.getElementById("mainDashboard").classList.add("hidden");
}

function enviarDatos() {
    const tipoMov = document.getElementById("tipoMovimiento").value;
    const monto = parseFloat(document.getElementById("montoInput").value);
    const tipoPago = document.getElementById("tipoPagoInput").value;
    const detalle = document.getElementById("detalleInput").value.trim();

    if (!monto || !detalle) {
        mostrarToast("Faltan datos obligatorios", "error");
        return;
    }

    const btn = document.getElementById("btnGuardar");
    btn.innerText = "⏳ Guardando...";
    btn.disabled = true;

    // Enviamos el "nombre" del usuario logueado a la columna 6
    const payload = {
        operacion: tipoMov,
        monto: monto,
        tipoPago: tipoPago,
        detalle: detalle,
        usuario: usuarioActivo.nombre 
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
        mostrarToast("Fallo de red o servidor", "error");
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

        // Indicadores diarios
        document.getElementById("txtVentasTotal").innerText = formatPesos(res.ventasDiarias.Efectivo + res.ventasDiarias.Transferencia);
        document.getElementById("txtGastosTotal").innerText = formatPesos(res.gastosDiarios.Efectivo + res.gastosDiarios.Transferencia);
        document.getElementById("txtCajaEfectivo").innerText = formatPesos(res.cajaNetaEfectivo);
        document.getElementById("txtCajaTransf").innerText = formatPesos(res.cajaNetaTransferencia);

        // Renderizado del Balance Mensual recibido desde Google
        document.getElementById("mesVentas").innerText = formatPesos(res.balanceMensual.ventas);
        document.getElementById("mesGastos").innerText = formatPesos(res.balanceMensual.gastos);
        document.getElementById("mesNeto").innerText = formatPesos(res.balanceMensual.neto);

        const ctxD = document.getElementById('chartDiario').getContext('2d');
        if (chartDiario) chartDiario.destroy();
        chartDiario = new Chart(ctxD, {
            type: 'bar',
            data: {
                labels: ['Efectivo', 'Transferencia'],
                datasets: [
                    { label: 'Ingresos', data: [res.ventasDiarias.Efectivo, res.ventasDiarias.Transferencia], backgroundColor: '#2dd4bf', borderRadius: 8 },
                    { label: 'Egresos', data: [res.gastosDiarios.Efectivo, res.gastosDiarios.Transferencia], backgroundColor: '#fb7185', borderRadius: 8 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });

        const clientes = Object.entries(res.resumenClientes).sort((a,b) => b[1] - a[1]).slice(0, 5);
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
    })
    .catch(() => { btnAct.innerText = "🔄 Actualizar"; });
}

function formatPesos(num) {
    return '$' + num.toLocaleString('es-AR', { minimumFractionDigits: 0 });
}