// --- CONFIGURACIÓN GLOBAL ---
const TOTAL_TABLES = 5;
const ROWS = 6;

// Información de las tablas y las 6 palabras específicas para cada fonema
const TABLAS_INFO = [
    { 
        nombre: "Tabla 1", 
        fonema: "/ə/", 
        palabras: ["about", "banana", "camera", "support", "pencil", "circus"] 
    },
    { 
        nombre: "Tabla 2", 
        fonema: "/ɪ/", 
        palabras: ["sit", "pin", "bit", "fish", "window", "kitchen"] 
    },
    { 
        nombre: "Tabla 3", 
        fonema: "/ɛ/", 
        palabras: ["bed", "desk", "pen", "head", "member", "seven"] 
    },
    { 
        nombre: "Tabla 4", 
        fonema: "/æ/", 
        palabras: ["cat", "map", "bad", "hand", "family", "apple"] 
    },
    { 
        nombre: "Tabla 5", 
        fonema: "/ʌ/", 
        palabras: ["cup", "bus", "sun", "love", "mother", "under"] 
    }
];

// Lista completa de fonemas vocálicos del inglés americano (Monoftongos y Diptongos)
const FONEMAS_LISTA = [
    "/i:/", "/ɪ/", "/e/", "/ɛ/", "/æ/", "/ɑ:/", "/ɒ/", "/ɔ:/", "/ʊ/", "/u:/", "/ʌ/", "/ɜ:r/", "/ə/",
    "/eɪ/", "/aɪ/", "/ɔɪ/", "/oʊ/", "/aʊ/", "/ɪə/", "/eə/"
];

let currentTableIndex = 0;

// Estructura de almacenamiento unificada para las 5 tablas
let tablesData = Array.from({ length: TOTAL_TABLES }, () => 
    Array.from({ length: ROWS }, () => ({
        f: "", fc: "", fv: "", posV: "", posE: "",
        fonemasSeleccionados: [],
        ipa: ""
    }))
);

// --- ELEMENTOS DEL DOM --- (Agrega la referencia al th-dinamico)
const tableBody = document.getElementById("table-body");
const tableIndicator = document.getElementById("table-indicator");
const fonemaFocus = document.getElementById("fonema-focus");
const thDinamico = document.getElementById("th-dinamico"); // <-- Nueva referencia
const btnPrev = document.getElementById("btn-prev");
const btnNext = document.getElementById("btn-next");
const btnSave = document.getElementById("btn-save");
const btnExport = document.getElementById("btn-export");

// Manejo del audio de instrucciones principales (También generado por voz artificial en español)
const btnAudioMain = document.getElementById("btn-audio-main");
btnAudioMain.addEventListener("click", () => {
    const textoInstrucciones = "Escucha el audio de cada fila y analiza la palabra. Llena las celdas numéricas con un solo dígito, selecciona los fonemas correspondientes en el menú desplegable y, de forma opcional, escribe la transcripción fonética.";
    hablarTexto(textoInstrucciones, "es-ES");
});

// --- FUNCIÓN MOTOR DE VOZ (TEXT-TO-SPEECH) ---
function hablarTexto(texto, idioma) {
    // Cancelar cualquier audio que se esté reproduciendo en el momento
    window.speechSynthesis.cancel();
    
    const lectura = new SpeechSynthesisUtterance(texto);
    lectura.lang = idioma; // "en-US" para inglés americano, "es-ES" para español
    lectura.rate = 0.85;   // Velocidad ligeramente pausada para fines educativos
    
    window.speechSynthesis.speak(lectura);
}

// --- ENTRADA DE DATOS: CARGAR E INICIALIZAR ---
document.addEventListener("DOMContentLoaded", () => {
    loadFromLocalStorage();
    renderTable();
    updateControls();
    
    document.addEventListener("click", (e) => {
        if (!e.target.closest('.dropdown-container')) {
            document.querySelectorAll('.dropdown-container').forEach(el => el.classList.remove('open'));
        }
    });
});

// --- RENDERIZADO DINÁMICO DE FILAS ---
function renderTable() {
    tableBody.innerHTML = "";
    
    const tablaActualInfo = TABLAS_INFO[currentTableIndex];
    tableIndicator.textContent = `${tablaActualInfo.nombre} / ${TOTAL_TABLES}`;
    fonemaFocus.textContent = `Enfoque del fonema: ${tablaActualInfo.fonema}`;
    
// Cambia dinámicamente el título de la columna 6 según el fonema actual con un salto de línea
thDinamico.innerHTML = `Pos. de<br>${tablaActualInfo.fonema} <button class="btn-help" data-tooltip="¿Cuál es el lugar del fonema vocal que se practica?">?</button>`;

    for (let r = 0; r < ROWS; r++) {
        const rowData = tablesData[currentTableIndex][r];
        const palabraActual = tablaActualInfo.palabras[r];
        const tr = document.createElement("tr");

        // [COLUMNA 1]: Botón de audio (Texto actualizado a "Escuchar Palabra X")
        const tdAudio = document.createElement("td");
        const btnPlayWord = document.createElement("button");
        btnPlayWord.className = "btn-audio-row";
        btnPlayWord.textContent = `▶️ Escuchar Palabra ${r + 1}`; // <-- Cambio de "Oír" a "Escuchar"
        
        btnPlayWord.addEventListener("click", () => {
            hablarTexto(palabraActual, "en-US");
        });
        tdAudio.appendChild(btnPlayWord);
        tr.appendChild(tdAudio); // Inyectar Columna 1

        // [COLUMNAS 2, 3, 4]: Inputs numéricos (F, FC, FV)
        const camposNumericos = [
            { key: "f" }, { key: "fc" }, { key: "fv" }
        ];
        
        camposNumericos.forEach(campo => {
            const td = document.createElement("td");
            const input = document.createElement("input");
            input.type = "text";
            input.className = "input-digit";
            input.maxLength = 1;
            input.value = rowData[campo.key];
            
            input.addEventListener("input", (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
                rowData[campo.key] = e.target.value;
            });
            td.appendChild(input);
            tr.appendChild(td); // Inyectar Columnas 2, 3 y 4
        });

        // [COLUMNA 5]: Entrada para Posición del Énfasis (Movido aquí)
        const tdPosE = document.createElement("td");
        const inputPosE = document.createElement("input");
        inputPosE.type = "text";
        inputPosE.className = "input-digit";
        inputPosE.maxLength = 1;
        inputPosE.value = rowData.posE;
        inputPosE.addEventListener("input", (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            rowData.posE = e.target.value;
        });
        tdPosE.appendChild(inputPosE);
        tr.appendChild(tdPosE); // Inyectar Columna 5

        // [COLUMNA 6]: Entrada para Posición de la Vocal (Corresponde al título dinámico)
        const tdPosV = document.createElement("td");
        const inputPosV = document.createElement("input");
        inputPosV.type = "text";
        inputPosV.className = "input-digit";
        inputPosV.maxLength = 1;
        inputPosV.value = rowData.posV;
        inputPosV.addEventListener("input", (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            rowData.posV = e.target.value;
        });
        tdPosV.appendChild(inputPosV);
        tr.appendChild(tdPosV); // Inyectar Columna 6

        // [COLUMNA 7]: Dropdown Multiselección (Fonemas Vocales)
        const tdDropdown = document.createElement("td");
        const dropdownContainer = document.createElement("div");
        dropdownContainer.className = "dropdown-container";
        
        const dropdownBtn = document.createElement("button");
        dropdownBtn.className = "dropdown-button";
        dropdownBtn.type = "button";
        
        const actualizarTextoBtn = () => {
            if (rowData.fonemasSeleccionados.length === 0) {
                dropdownBtn.textContent = "Seleccionar...";
            } else {
                dropdownBtn.textContent = rowData.fonemasSeleccionados.join(", ");
            }
        };
        actualizarTextoBtn();

        dropdownBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            document.querySelectorAll('.dropdown-container').forEach(el => {
                if (el !== dropdownContainer) el.classList.remove('open');
            });
            dropdownContainer.classList.toggle("open");
        });

        const dropdownMenu = document.createElement("div");
        dropdownMenu.className = "dropdown-menu";

        FONEMAS_LISTA.forEach(fonema => {
            const label = document.createElement("label");
            label.className = "dropdown-item";
            
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.value = fonema;
            checkbox.checked = rowData.fonemasSeleccionados.includes(fonema);
            
            checkbox.addEventListener("change", () => {
                if (checkbox.checked) {
                    if (!rowData.fonemasSeleccionados.includes(fonema)) {
                        rowData.fonemasSeleccionados.push(fonema);
                    }
                } else {
                    rowData.fonemasSeleccionados = rowData.fonemasSeleccionados.filter(f => f !== fonema);
                }
                actualizarTextoBtn();
            });

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(fonema));
            dropdownMenu.appendChild(label);
        });

        dropdownContainer.appendChild(dropdownBtn);
        dropdownContainer.appendChild(dropdownMenu);
        // ... código donde se crea el dropdown ...
tdDropdown.appendChild(dropdownContainer);
tdDropdown.className = "col-futura"; // <-- AGREGA ESTA LÍNEA
tr.appendChild(tdDropdown); // Inyectar Columna 7

        // [COLUMNA 8]: Entrada de Transcrito IPA (Antes Símbolos IPA)
        const tdIpa = document.createElement("td");
        const inputIpa = document.createElement("input");
        inputIpa.type = "text";
        inputIpa.className = "input-ipa";
        inputIpa.placeholder = "Opcional";
        inputIpa.value = rowData.ipa;
        inputIpa.addEventListener("input", (e) => {
            rowData.ipa = e.target.value;
        });
        tdIpa.appendChild(inputIpa);
tdIpa.className = "col-futura"; // <-- AGREGA ESTA LÍNEA
tr.appendChild(tdIpa); 
 // Inyectar Columna 8

        tableBody.appendChild(tr);
    }
}

// --- LOGICA DE NAVEGACIÓN ---
function updateControls() {
    btnPrev.disabled = currentTableIndex === 0;
    btnNext.disabled = currentTableIndex === TOTAL_TABLES - 1;
}

btnPrev.addEventListener("click", () => {
    if (currentTableIndex > 0) {
        currentTableIndex--;
        renderTable();
        updateControls();
    }
});

btnNext.addEventListener("click", () => {
    if (currentTableIndex < TOTAL_TABLES - 1) {
        currentTableIndex++;
        renderTable();
        updateControls();
    }
});

// --- PERSISTENCIA Y EXPORTACIÓN ---
function saveToLocalStorage() {
    localStorage.setItem("foneticaDataEstudiante", JSON.stringify(tablesData));
}

function loadFromLocalStorage() {
    const dataGuardada = localStorage.getItem("foneticaDataEstudiante");
    if (dataGuardada) {
        tablesData = JSON.parse(dataGuardada);
    }
}

btnSave.addEventListener("click", () => {
    saveToLocalStorage();
    alert("¡Tu progreso se guardó con éxito en este navegador!");
});

btnExport.addEventListener("click", () => {
    saveToLocalStorage();

    let txtContent = "==================================================\n";
    txtContent += "     REPORTE DE EJERCICIOS DE FONÉTICA INGLESA    \n";
    txtContent += "==================================================\n\n";

    tablesData.forEach((tabla, tIdx) => {
        txtContent += `>>> ${TABLAS_INFO[tIdx].nombre} (Enfoque Vocal: ${TABLAS_INFO[tIdx].fonema}) <<<\n`;
        txtContent += "---------------------------------------------------------------------------------\n";
        
        tabla.forEach((fila, fIdx) => {
            const palabraTexto = TABLAS_INFO[tIdx].palabras[fIdx];
            txtContent += `Fila ${fIdx + 1} (Palabra escuchada: "${palabraTexto}"):\n`;
            txtContent += `  - # de Fonemas (F): ${fila.f || "-"}\n`;
            txtContent += `  - # Consonantes (FC): ${fila.fc || "-"}\n`;
            txtContent += `  - # Vocales (FV): ${fila.fv || "-"}\n`;
            txtContent += `  - Posición Vocal (Pos. de la V): ${fila.posV || "-"}\n`;
            txtContent += `  - Fonemas Vocales Seleccionados: [ ${fila.fonemasSeleccionados.join(", ") || "Ninguno"} ]\n`;
            txtContent += `  - Posición Énfasis (Pos. del E): ${fila.posE || "-"}\n`;
            txtContent += `  - Transcripción IPA (Opcional): ${fila.ipa || "No respondido"}\n`;
            txtContent += "---------------------------------------------------------------------------------\n";
        });
        txtContent += "\n";
    });

    const blob = new Blob([txtContent], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "respuestas_fonetica_alumno.txt";
    link.click();
    URL.revokeObjectURL(link.href);
});
