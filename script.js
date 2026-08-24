// --- CONFIGURACIÓN GLOBAL ---
const TOTAL_TABLES = 5;
const ROWS = 6;

const TABLAS_INFO = [
    { nombre: "Tabla 1", fonema: "/ə/", palabras: ["about", "banana", "camera", "support", "pencil", "circus"] },
    { nombre: "Tabla 2", fonema: "/ɪ/", palabras: ["sit", "pin", "bit", "fish", "window", "kitchen"] },
    { nombre: "Tabla 3", fonema: "/ɛ/", palabras: ["bed", "desk", "pen", "head", "member", "seven"] },
    { nombre: "Tabla 4", fonema: "/æ/", palabras: ["cat", "map", "bad", "hand", "family", "apple"] },
    { nombre: "Tabla 5", fonema: "/ʌ/", palabras: ["cup", "bus", "sun", "love", "mother", "under"] }
];

const FONEMAS_LISTA = [
    "/i:/", "/ɪ/", "/e/", "/ɛ/", "/æ/", "/ɑ:/", "/ɒ/", "/ɔ:/", "/ʊ/", "/u:/", "/ʌ/", "/ɜ:r/", "/ə/",
    "/eɪ/", "/aɪ/", "/ɔɪ/", "/oʊ/", "/aʊ/", "/ɪə/", "/eə/"
];

let currentTableIndex = 0;

let tablesData = Array.from({ length: TOTAL_TABLES }, () => 
    Array.from({ length: ROWS }, () => ({
        f: "", fc: "", fv: "", posV: "", posE: "",
        fonemasSeleccionados: [],
        ipa: ""
    }))
);

// --- CAPTURA DE ELEMENTOS DEL DOM ---
const tableBody = document.getElementById("table-body");
const tableIndicator = document.getElementById("table-indicator");
const fonemaFocus = document.getElementById("fonema-focus");
const thDinamico = document.getElementById("th-dinamico"); 
const btnPrev = document.getElementById("btn-prev");
const btnNext = document.getElementById("btn-next");
const btnSave = document.getElementById("btn-save");
const btnExport = document.getElementById("btn-export");
const btnAudioMain = document.getElementById("btn-audio-main");

// --- FUNCIÓN MOTOR DE VOZ ---
function hablarTexto(texto, idioma) {
    window.speechSynthesis.cancel();
    const lectura = new SpeechSynthesisUtterance(texto);
    lectura.lang = idioma;
    lectura.rate = 0.6;   
    window.speechSynthesis.speak(lectura);
}

// Oidores de eventos base
btnAudioMain.addEventListener("click", () => {
    const textoInstrucciones = "Escucha el audio de cada fila y analiza la palabra. Llena las celdas numéricas con un solo dígito, selecciona los fonemas correspondientes en el menú desplegable y, de forma opcional, escribe la transcripción fonética.";
    hablarTexto(textoInstrucciones, "es-ES");
});

// --- RENDERIZADO DINÁMICO DE FILAS ---
function renderTable() {
    tableBody.innerHTML = "";
    const tablaActualInfo = TABLAS_INFO[currentTableIndex];
    
    tableIndicator.textContent = `${tablaActualInfo.nombre} / ${TOTAL_TABLES}`;
    fonemaFocus.textContent = `Enfoque del fonema: ${tablaActualInfo.fonema}`;
    thDinamico.innerHTML = `Pos. de<br>${tablaActualInfo.fonema} <button class="btn-help" data-tooltip="¿Cuál es el lugar del fonema vocal que se practica?">?</button>`;

    for (let r = 0; r < ROWS; r++) {
        const rowData = tablesData[currentTableIndex][r];
        const palabraActual = tablaActualInfo.palabras[r];
        const tr = document.createElement("tr");

        // Columna 1: Audio
        const tdAudio = document.createElement("td");
        const btnPlayWord = document.createElement("button");
        btnPlayWord.className = "btn-audio-row";
        btnPlayWord.textContent = `▶️ Escuchar Palabra ${r + 1}`;
        btnPlayWord.addEventListener("click", () => hablarTexto(palabraActual, "en-US"));
        tdAudio.appendChild(btnPlayWord);
        tr.appendChild(tdAudio);

        // Columnas 2, 3, 4: Numéricos (F, FC, FV)
        ["f", "fc", "fv"].forEach(key => {
            const td = document.createElement("td");
            const input = document.createElement("input");
            input.type = "text";
            input.className = "input-digit";
            input.maxLength = 1;
            input.value = rowData[key];
            input.addEventListener("input", (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
                rowData[key] = e.target.value;
            });
            td.appendChild(input);
            tr.appendChild(td);
        });

        // Columna 5: Énfasis
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
        tr.appendChild(tdPosE);

        // Columna 6: Posición Vocal
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
        tr.appendChild(tdPosV);

        // Columna 7: Dropdown
        const tdDropdown = document.createElement("td");
        tdDropdown.className = "col-futura";
        const dropdownContainer = document.createElement("div");
        dropdownContainer.className = "dropdown-container";
        const dropdownBtn = document.createElement("button");
        dropdownBtn.className = "dropdown-button";
        dropdownBtn.type = "button";
        
        const actualizarTextoBtn = () => {
            dropdownBtn.textContent = rowData.fonemasSeleccionados.length === 0 ? "Seleccionar..." : rowData.fonemasSeleccionados.join(", ");
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
                    if (!rowData.fonemasSeleccionados.includes(fonema)) rowData.fonemasSeleccionados.push(fonema);
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
        tdDropdown.appendChild(dropdownContainer);
        tr.appendChild(tdDropdown);

        // Columna 8: IPA
        const tdIpa = document.createElement("td");
        tdIpa.className = "col-futura";
        const inputIpa = document.createElement("input");
        inputIpa.type = "text";
        inputIpa.className = "input-ipa";
        inputIpa.placeholder = "Opcional";
        inputIpa.value = rowData.ipa;
        inputIpa.addEventListener("input", (e) => {
            rowData.ipa = e.target.value;
        });
        tdIpa.appendChild(inputIpa);
        tr.appendChild(tdIpa);

        tableBody.appendChild(tr);
    }
}

// --- NAVEGACIÓN Y PERSISTENCIA ---
function updateControls() {
    btnPrev.disabled = currentTableIndex === 0;
    btnNext.disabled = currentTableIndex === TOTAL_TABLES - 1;
}

btnPrev.addEventListener("click", () => {
    if (currentTableIndex > 0) { currentTableIndex--; renderTable(); updateControls(); }
});

btnNext.addEventListener("click", () => {
    if (currentTableIndex < TOTAL_TABLES - 1) { currentTableIndex++; renderTable(); updateControls(); }
});

function saveToLocalStorage() { localStorage.setItem("foneticaDataEstudiante", JSON.stringify(tablesData)); }
function loadFromLocalStorage() {
    const dataGuardada = localStorage.getItem("foneticaDataEstudiante");
    if (dataGuardada) tablesData = JSON.parse(dataGuardada);
}

btnSave.addEventListener("click", () => { saveToLocalStorage(); alert("¡Tu progreso se guardó con éxito!"); });

btnExport.addEventListener("click", () => {
    saveToLocalStorage();
    let txtContent = "==================================================\n   REPORTE DE EJERCICIOS DE FONÉTICA INGLESA    \n==================================================\n\n";
    tablesData.forEach((tabla, tIdx) => {
        txtContent += `>>> ${TABLAS_INFO[tIdx].nombre} (Enfoque Vocal: ${TABLAS_INFO[tIdx].fonema}) <<<\n---------------------------------------------------------------------------------\n`;
        tabla.forEach((fila, fIdx) => {
            txtContent += `Fila ${fIdx + 1} (Palabra: "${TABLAS_INFO[tIdx].palabras[fIdx]}"):\n  - # de Fonemas (F): ${fila.f || "-"}\n  - # Consonantes (FC): ${fila.fc || "-"}\n  - # Vocales (FV): ${fila.fv || "-"}\n  - Posición Vocal: ${fila.posV || "-"}\n  - Fonemas: [ ${fila.fonemasSeleccionados.join(", ") || "Ninguno"} ]\n  - Posición Énfasis: ${fila.posE || "-"}\n  - Transcripción IPA: ${fila.ipa || "No respondido"}\n---------------------------------------------------------------------------------\n`;
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

// --- INICIALIZACIÓN INMEDIATA ---
loadFromLocalStorage();
renderTable();
updateControls();

document.addEventListener("click", (e) => {
    if (!e.target.closest('.dropdown-container')) {
        document.querySelectorAll('.dropdown-container').forEach(el => el.classList.remove('open'));
    }
});
