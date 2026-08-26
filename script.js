document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. CONFIGURACIÓN E INICIO DE SESIÓN INTEGRADO CON GOOGLE ---
    // Clave de Cliente de Google de Pruebas (Usa la de tu consola de desarrollador)
    const GOOGLE_CLIENT_ID = "1038098835533-ljnlngi6p1smnlmk3ocla866af4brv6e.apps.googleusercontent.com"; 

    // === REEMPLAZAR ESTA FUNCIÓN EN LA PARTE 1 DE TU SCRIPT.JS ===
    window.handleCredentialResponse = function(response) {
        try {
            // Desencriptamos el Token de Google de forma segura
            const base64Url = response.credential.split('.');
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            const userData = JSON.parse(jsonPayload);
            console.log("¡Usuario autenticado con éxito!", userData);

            // 1. Ocultamos la pantalla de bienvenida y revelamos tu app estable
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('main-app-content').classList.remove('hidden');

            // 2. Inyectamos la foto de perfil real del estudiante en tu componente .avatar
            const avatarElement = document.getElementById('user-avatar');
            if (avatarElement && userData.picture) {
                avatarElement.style.backgroundImage = `url('${userData.picture}')`;
                avatarElement.textContent = ""; // Quitamos las iniciales "JD" estáticas
            }

            // 3. REPARACIÓN CRÍTICA: Aseguramos el reinicio de las preguntas antes de llamar al JSON
            currentQuestionIndex = 0; 
            currentWordIndex = 0;

            // 4. Arrancamos la carga de la base de datos de palabras
            loadDatabaseFromJSON();

        } catch (e) {
            console.error("Error al procesar la credencial de Google:", e);
        }
    };

    // Inicialización oficial de Google Sign-In dentro del contenedor HTML
    if (window.google && google.accounts) {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: window.handleCredentialResponse
        });
        
        google.accounts.id.renderButton(
            document.getElementById("google-btn-container"),
            { theme: "outline", size: "large", width: "100%" }
        );
        
        google.accounts.id.prompt(); // Despliega la burbuja nativa Smart Lock si está disponible
    }

    // --- 2. MAPEO DE FONEMAS A LOS ENTRIES DEL JSON ---
    const reverseFonemaMapping = { "1": "ə", "2": "ɪ", "3": "ɛ", "4": "æ", "5": "ʌ" };
    
    // Rutas base en GitHub para audios y base de datos
    const baseAudioUrl = "https://raw.githubusercontent.com/vecrecemosmx-cyber/vecrecemosmx-cyber.github.io/main/databases/audio/";
    const jsonUrl = "https://raw.githubusercontent.com/vecrecemosmx-cyber/vecrecemosmx-cyber.github.io/main/databases/tables/words_database.json";
    
    // --- 3. VARIABLES DE CONTROL GLOBALES DEL EJERCICIO ---
    let datasetByFonema = { "ə": [], "ɪ": [], "ɛ": [], "æ": [], "ʌ": [] };
    let currentFonema = "ə";       
    let currentWordIndex = 0;       
    let currentQuestionIndex = 0;   
    let hasAnsweredCorrectly = false; 

    // Lista secuencial de preguntas
    const questionsTexts = [
        "1. ¿Cuántos sonidos componen la palabra?",
        "2. ¿Cuántos fonemas consonantes tiene?",
        "3. ¿Cuántos fonemas vocales tiene?",
        "4. ¿En qué sílaba está el énfasis o acento?",
        "5. ¿En qué sílaba está la vocal que estamos practicando?"
    ];

    // --- 4. CAPTURA DE COMPONENTES DEL DOM (Sincronizado al HTML) ---
    const instructionText = document.querySelector('.instruction-text');
    const answerInput = document.getElementById('student-answer');
    const errorMessage = document.getElementById('error-message');
    const checkAnswerButton = document.getElementById('check-answer-btn'); 
    const actionButton = document.getElementById('action-btn'); 
    const prevButton = document.getElementById('prev-btn'); 
    const fonemaSelect = document.getElementById('fonema-select'); 
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const feedbackCard = document.getElementById('feedback-card');
    const feedbackPhrase = document.getElementById('feedback-phrase');
    const tipText = document.getElementById('tip-text');
    
    const playWordButton = document.getElementById('play-word-btn');
    const playVocalButton = document.getElementById('play-vocal-btn');
    const responseCard = document.querySelector('.response-card');
    const speedSlider = document.getElementById('speed-slider');
    const speedBubble = document.getElementById('speed-bubble');

    // --- 5. FUNCIÓN DE CARGA DINÁMICA CON JSON ---
    async function loadDatabaseFromJSON() {
        try {
            const response = await fetch(jsonUrl);
            if (!response.ok) throw new Error("No se pudo descargar el archivo JSON.");
            
            const wordsArray = await response.json();
            datasetByFonema = { "ə": [], "ɪ": [], "ɛ": [], "æ": [], "ʌ": [] };

            wordsArray.forEach(item => {
                const symbol = reverseFonemaMapping[String(item.fonema_id)];
                if (symbol) {
                    datasetByFonema[symbol].push({
                        word: item.word,
                        f: String(item.f),
                        fc: String(item.fc),
                        fv: String(item.fv),
                        stress: String(item.stress),
                        posVocal: String(item.posVocal)
                    });
                }
            });

            console.log("Base de datos cargada:", datasetByFonema);
            
            if (datasetByFonema[currentFonema].length > 0) {
                initExercise(); 
            } else {
                showError("⚠️ El fonema seleccionado no contiene palabras.");
            }

        } catch (error) {
            console.error("Error al procesar el JSON:", error);
            showError("⚠️ Error al conectar con el servidor.");
        }
    }

    // Inicializamos el reto en pantalla
    function initExercise() {
        const currentDataArray = datasetByFonema[currentFonema];
        if (!currentDataArray || currentDataArray.length === 0) {
            instructionText.textContent = "No hay palabras disponibles para este fonema.";
            return;
        }

        instructionText.textContent = questionsTexts[currentQuestionIndex];
        
        hasAnsweredCorrectly = false;
        actionButton.disabled = true;
        actionButton.classList.add('btn-disabled');

        actionButton.textContent = (currentQuestionIndex === questionsTexts.length - 1) 
            ? "SIGUIENTE PALABRA ➔" 
            : "SIGUIENTE PREGUNTA ➔";

        updateProgressBar();
        togglePrevButtonVisibility();

        // Enlace del deslizador interactivo de velocidad
        if (speedSlider && speedBubble) {
            speedBubble.textContent = `${parseFloat(speedSlider.value).toFixed(2)}x`;
            speedSlider.oninput = (event) => {
                speedBubble.textContent = `${parseFloat(event.target.value).toFixed(2)}x`;
            };
        }
    }

    // AVANZAR EN ORDEN SECUENCIAL (BOTÓN NARANJA DE NAVEGACIÓN)
    function processNextQuestion(event) {
        if (event) event.preventDefault();
        if (!hasAnsweredCorrectly) return;

        if (currentQuestionIndex < questionsTexts.length - 1) {
            currentQuestionIndex++;
            answerInput.value = "";
            feedbackCard.classList.add('hidden');
            
            updateProgressBar();
            initExercise();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            const totalWordsInBlock = datasetByFonema[currentFonema].length;
            currentWordIndex = (currentWordIndex < totalWordsInBlock - 1) ? currentWordIndex + 1 : 0;
            resetEntireExercise();
            alert(`📝 Siguiente reto en orden. Presiona 'Escuchar Palabra' para practicar la palabra #${currentWordIndex + 1}.`);
        }
    }

    // RETROCEDER PREGUNTA (BOTÓN GRIS)
    function processPreviousQuestion(event) {
        if (event) event.preventDefault();

        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            answerInput.value = "";
            feedbackCard.classList.add('hidden');

            updateProgressBar();
            initExercise();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    // EVALUACIÓN DE RESPUESTA
    function processCheckAnswer(event) {
        if (event) event.preventDefault();
        
        const value = answerInput.value.trim();
        let isTwoDigitQuestion = (currentQuestionIndex === 0 || currentQuestionIndex === 4);
        let isValidFormat = isTwoDigitQuestion ? /^[0-9]{1,2}$/.test(value) : /^[0-9]$/.test(value);

        if (value === "") { showError("⚠️ Escribe tu respuesta antes de comprobar."); return; } 
        if (!isValidFormat) { 
            showError(isTwoDigitQuestion ? "⚠️ Ingresa un número de 1 o 2 dígitos." : "⚠️ Ingresa un número de un solo dígito (0-9)."); 
            return; 
        }

        clearError();
        const currentData = datasetByFonema[currentFonema][currentWordIndex];
        if (!currentData) return;

        let isCorrect = false;
        let successNote = "";

        if (currentQuestionIndex < 4) {
            let correctValue = "";
            switch(currentQuestionIndex) {
                case 0: correctValue = currentData.f; successNote = `¡Excelente! Componen la palabra ${currentData.f} sonidos.`; break;
                case 1: correctValue = currentData.fc; successNote = `¡Correcto! Tiene ${currentData.fc} sonidos consonantes.`; break;
                case 2: correctValue = currentData.fv; successNote = `¡Muy bien! Tiene ${currentData.fv} sonidos vocálicos.`; break;
                case 3: correctValue = currentData.stress; successNote = `¡Exacto! El énfasis está en la sílaba ${currentData.stress}.`; break;
            }
            isCorrect = (value === correctValue);
        } else {
            const dbValue = currentData.posVocal;
            if (dbValue.length === 2) {
                const digitoA = dbValue.charAt(0);
                const digitoB = dbValue.charAt(1);
                if (value === digitoA || value === digitoB) {
                    isCorrect = true;
                    successNote = `¡Felicidades! La vocal /${currentFonema}/ se ubica en la sílaba ${value}. También aparece en la sílaba ${value === digitoA ? digitoB : digitoA}.`;
                }
            } else {
                if (value === dbValue) {
                    isCorrect = true;
                    successNote = `¡Felicidades! La vocal /${currentFonema}/ se ubica en la posición o sílaba: ${dbValue}.`;
                }
            }
        }

        feedbackCard.classList.remove('hidden');

        if (isCorrect) {
            feedbackPhrase.innerHTML = `<span class="word-correct">${successNote}</span>`;
            tipText.innerHTML = `Análisis completado para la palabra <strong>${currentData.word}</strong>.`;
            hasAnsweredCorrectly = true;
            actionButton.disabled = false;
            actionButton.classList.remove('btn-disabled');
        } else {
            feedbackPhrase.innerHTML = `Tu respuesta: <span class="word-error">${value}</span>. ¡Inténtalo de nuevo!`;
            tipText.innerHTML = `Anula sonidos de izquierda a derecha para contar de forma óptima los fonemas.<br><br>Revisa la estructura para: <strong>${currentData.word}</strong>.`;
            hasAnsweredCorrectly = false;
            actionButton.disabled = true;
            actionButton.classList.add('btn-disabled');
        }
        setTimeout(() => { feedbackCard.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
    }

    // --- 6. CONTROLADORES DE AUDIO Y REPRODUCCIÓN ---
    function handlePlayWordAudio(event) {
        event.preventDefault();
        
        // Enfoque inmediato al cuadro de texto para abrir el teclado numérico en móviles
        answerInput.focus();
        responseCard.scrollIntoView({ behavior: 'smooth', block: 'center' });

        const currentData = datasetByFonema[currentFonema][currentWordIndex];
        if (!currentData) return;

        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel(); 
            const cleanWord = currentData.word.replace(/\(.*\)/, "").trim();
            const utterance = new SpeechSynthesisUtterance(cleanWord);
            utterance.lang = 'en-US';
            utterance.rate = speedSlider ? parseFloat(speedSlider.value) : 1.25; 
            window.speechSynthesis.speak(utterance);
        }
    }

    function handlePlayVocalAudio(event) {
        event.preventDefault();
        const vocalAudioFiles = { 
            "ə": "PHONEME-DUST.mp3", 
            "ɪ": "PHONEME-PINK.mp3", 
            "ɛ": "PHONEME-RED.mp3", 
            "æ": "PHONEME-SAND.mp3", 
            "ʌ": "PHONEME-CUP.mp3" 
        };
        const fileName = vocalAudioFiles[currentFonema];
        
        if (fileName) {
            const vocalAudio = new Audio(baseAudioUrl + fileName);
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
            vocalAudio.play().catch(error => { console.error("Error al cargar audio:", error); });
        }
    }

    // --- 7. UTILIDADES DE INTERFAZ Y ACTUALIZACIÓN ---
    function changeFonemaDropdown(event) {
        currentFonema = event.target.value;
        currentWordIndex = 0;
        resetEntireExercise();

        document.querySelectorAll('.menu-item').forEach((item) => {
            item.classList.toggle('active', item.textContent.includes(currentFonema));
        });
    }

    function togglePrevButtonVisibility() {
        prevButton.classList.toggle('hidden', currentQuestionIndex === 0);
    }

    function updateProgressBar() {
        const totalQuestions = questionsTexts.length;
        progressBar.style.width = `${((currentQuestionIndex + 1) / totalQuestions) * 100}%`;
        progressText.textContent = `Pregunta ${currentQuestionIndex + 1} de ${totalQuestions}`;
    }

    function resetEntireExercise() {
        currentQuestionIndex = 0;
        answerInput.value = "";
        feedbackCard.classList.add('hidden');
        clearError();
        initExercise();
    }

    function showError(message) {
        errorMessage.textContent = message;
        answerInput.classList.add('input-invalid');
        answerInput.style.transform = 'translateX(5px)';
        setTimeout(() => answerInput.style.transform = 'translateX(0)', 100);
    }

    function clearError() {
        errorMessage.textContent = "";
        answerInput.classList.remove('input-invalid');
    }

    // --- 8. ASOCIACIÓN DE EVENTOS (LISTENERS) ---
    answerInput.addEventListener('input', () => { 
        if (errorMessage.textContent !== "") clearError(); 
    });
    
    answerInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            if (!hasAnsweredCorrectly) processCheckAnswer(e); else processNextQuestion(e);
        }
    });

    checkAnswerButton.addEventListener('click', processCheckAnswer);
    actionButton.addEventListener('click', processNextQuestion);
    prevButton.addEventListener('click', processPreviousQuestion);
    playWordButton.addEventListener('click', handlePlayWordAudio);
    playVocalButton.addEventListener('click', handlePlayVocalAudio);
    fonemaSelect.addEventListener('change', changeFonemaDropdown);

    // CONTROL DEL MENÚ DE HAMBURGUESA MÓVIL
    const menuToggle = document.getElementById('menu-toggle');
    const sidebarElement = document.getElementById('sidebar');

    if (menuToggle && sidebarElement) {
        const toggleSidebarMenu = (e) => { 
            e.preventDefault(); 
            e.stopPropagation(); 
            sidebarElement.classList.toggle('open'); 
        };
        menuToggle.addEventListener('click', toggleSidebarMenu);
        menuToggle.addEventListener('touchstart', toggleSidebarMenu, { passive: false });

        const closeSidebarMenu = (e) => {
            if (!sidebarElement.contains(e.target) && !menuToggle.contains(e.target) && sidebarElement.classList.contains('open')) {
                sidebarElement.classList.remove('open');
            }
        };
        document.addEventListener('click', closeSidebarMenu);
        document.addEventListener('touchstart', closeSidebarMenu);
    }
});
