document.addEventListener('DOMContentLoaded', () => {
    
    // --- MAPEO DE FONEMAS A LOS ENTIRES DEL JSON (fonema_id) ---
    const reverseFonemaMapping = { "1": "ə", "2": "ɪ", "3": "ɛ", "4": "æ", "5": "ʌ" };
    
    // Rutas base de tus archivos en GitHub
    const baseAudioUrl = "https://raw.githubusercontent.com/vecrecemosmx-cyber/vecrecemosmx-cyber.github.io/main/databases/audio/";
    const jsonUrl = "https://raw.githubusercontent.com/vecrecemosmx-cyber/vecrecemosmx-cyber.github.io/main/databases/tables/words_database.json";
    
    // --- VARIABLES DE CONTROL DEL EJERCICIO ---
    let datasetByFonema = { "ə": [], "ɪ": [], "ɛ": [], "æ": [], "ʌ": [] };
    let currentFonema = "ə";       
    let currentWordIndex = 0;       
    let currentQuestionIndex = 0;   
    let hasAnsweredCorrectly = false; // Nueva variable de control de avance

    const questionsTexts = [
        "1. ¿Cuántos sonidos componen la palabra?",
        "2. ¿Cuántos de esos sonidos son fonemas consonantes?",
        "3. ¿Cuántos de esos sonidos son fonemas vocales?",
        "4. ¿En qué sílaba está el énfasis o acento de la palabra?",
        "5. ¿En qué sílaba está la vocal que estamos practicando?"
    ];

    // Elementos de la interfaz (DOM)
    const instructionText = document.querySelector('.instruction-text');
    const answerInput = document.getElementById('student-answer');
    const errorMessage = document.getElementById('error-message');
    const checkAnswerButton = document.getElementById('check-answer-btn'); // Nuevo botón verde
    const actionButton = document.getElementById('action-btn'); // Botón naranja de navegación
    const prevButton = document.getElementById('prev-btn'); 
    const fonemaSelect = document.getElementById('fonema-select'); 
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const feedbackCard = document.getElementById('feedback-card');
    const feedbackPhrase = document.getElementById('feedback-phrase');
    const tipText = document.getElementById('tip-text');
    
    // Botones de audio y tarjeta de respuesta
    const playWordButton = document.getElementById('play-word-btn');
    const playVocalButton = document.getElementById('play-vocal-btn');
    const responseCard = document.querySelector('.response-card');

    // --- FUNCIÓN DE CARGA DINÁMICA CON JSON ---
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

            console.log("Base de datos cargada exitosamente:", datasetByFonema);
            
            if (datasetByFonema[currentFonema].length > 0) {
                initExercise(); 
            } else {
                showError("⚠️ El fonema seleccionado no contiene palabras en el archivo.");
            }

        } catch (error) {
            console.error("Error al procesar el JSON:", error);
            showError("⚠️ Error al conectar con el servidor de ejercicios.");
        }
    }

    // Inicializamos el reto en pantalla (VERSIÓN LIMPIA SIN FONEMA EN PREGUNTA 5)
    // Inicializamos el reto en pantalla
    function initExercise() {
        const currentDataArray = datasetByFonema[currentFonema];
        if (!currentDataArray || currentDataArray.length === 0) {
            instructionText.textContent = "No hay palabras disponibles para este fonema.";
            return;
        }

        // Cargamos el texto plano de la pregunta directamente desde el arreglo
        instructionText.textContent = questionsTexts[currentQuestionIndex];
        
        // Bloqueamos el botón naranja de navegación para la nueva pregunta
        hasAnsweredCorrectly = false;
        actionButton.disabled = true;
        actionButton.classList.add('btn-disabled');

        if (currentQuestionIndex === questionsTexts.length - 1) {
            actionButton.textContent = "SIGUIENTE PALABRA ➔";
        } else {
            actionButton.textContent = "SIGUIENTE PREGUNTA ➔";
        }

        updateProgressBar();
        togglePrevButtonVisibility();

        // --- ENLACE FORZADO DEL DESLIZADOR INTERACTIVO ---
        const speedSlider = document.getElementById('speed-slider');
        const speedBubble = document.getElementById('speed-bubble');

        if (speedSlider && speedBubble) {
            // Aseguramos que muestre el valor inicial al cargar la pregunta
            speedBubble.textContent = `${parseFloat(speedSlider.value).toFixed(2)}x`;

            // Escuchamos el arrastre en tiempo real
            speedSlider.oninput = (event) => {
                const currentVal = parseFloat(event.target.value);
                speedBubble.textContent = `${currentVal.toFixed(2)}x`;
            };
            console.log("[Speakeasy UI] Deslizador de velocidad enlazado y activo.");
        } else {
            console.error("[Speakeasy UI] Error: No se encontraron los elementos #speed-slider o #speed-bubble en la pantalla.");
        }
    }

    function processPreviousQuestion(event) {
        event.preventDefault();
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            answerInput.value = "";
            feedbackCard.classList.add('hidden');
            clearError();
            initExercise();
        }
    }

    // --- EVALUACIÓN DINÁMICA (CON LOGICA PARA DOBLE VOCAL EN PREGUNTA 5) ---
    function processCheckAnswer(event) {
        if (event) event.preventDefault();
        
        const value = answerInput.value.trim();
        let isTwoDigitQuestion = (currentQuestionIndex === 0 || currentQuestionIndex === 4);
        
        let isValidFormat = isTwoDigitQuestion ? /^[0-9]{1,2}$/.test(value) : /^[0-9]$/.test(value);
        let validationMsg = isTwoDigitQuestion ? "⚠️ Ingresa un número de 1 o 2 dígitos." : "⚠️ Ingresa un número de un solo dígito (0-9).";

        if (value === "") { showError("⚠️ Escribe tu respuesta antes de comprobar."); return; } 
        if (!isValidFormat) { showError(validationMsg); return; }

        clearError();
        
        const currentData = datasetByFonema[currentFonema][currentWordIndex];
        if (!currentData) return;

        let isCorrect = false;
        let successNote = "";

        // Evaluamos las primeras preguntas de forma estricta (igualdad directa)
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
            // --- LÓGICA ESPECIAL PARA LA PREGUNTA 5 ---
            const dbValue = currentData.posVocal; // Puede ser un dígito ("1") o dos ("12")

            if (dbValue.length === 2) {
                // Separamos los dos dígitos individuales
                const digitoA = dbValue.charAt(0);
                const digitoB = dbValue.charAt(1);

                // Comprobamos si el alumno ingresó cualquiera de los dos dígitos válidos
                if (value === digitoA || value === digitoB) {
                    isCorrect = true;
                    successNote = `¡Felicidades! La vocal /${currentFonema}/ se ubica en la sílaba ${value}. Ten en cuenta que también aparece en la sílaba o posición ${value === digitoA ? digitoB : digitoA}.`;
                }
            } else {
                // Si en el JSON sólo hay un dígito, hacemos una comparación normal
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
            
            // HABILITAMOS EL BOTÓN NARANJA DE NAVEGACIÓN
            hasAnsweredCorrectly = true;
            actionButton.disabled = false;
            actionButton.classList.remove('btn-disabled');

            setTimeout(() => { feedbackCard.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
        } else {
            feedbackPhrase.innerHTML = `Tu respuesta: <span class="word-error">${value}</span>. ¡Inténtalo de nuevo!`;
            let explanation = `Anula sonidos de izquierda a derecha para contar de forma óptima los fonemas.<br><br>`;
            explanation += `Revisa bien la estructura lógica para la palabra: <strong>${currentData.word}</strong>.`;
            
            tipText.innerHTML = explanation;
            
            // Mantenemos bloqueado el avance si falla
            hasAnsweredCorrectly = false;
            actionButton.disabled = true;
            actionButton.classList.add('btn-disabled');

            setTimeout(() => { feedbackCard.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
        }
    }

    // AVANZAR EN ORDEN SECUENCIAL (EJECUTADO POR EL BOTÓN NARANJA)
    function processNextQuestion(event) {
        if (event) event.preventDefault();
        
        // Validación de seguridad para que no avancen por código de consola
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
            if (currentWordIndex < totalWordsInBlock - 1) {
                currentWordIndex++;
            } else {
                currentWordIndex = 0; 
            }
            resetEntireExercise();
            alert(`📝 Siguiente reto en orden. Presiona 'Escuchar Palabra' para practicar la palabra #${currentWordIndex + 1}.`);
        }
    }

    // --- REPRODUCCIÓN DE AUDIO 1 ---
    // --- REPRODUCCIÓN DE AUDIO 1 (CON VELOCIDAD MODULADA POR EL CONTROL DESLIZANTE) ---
    function handlePlayWordAudio(event) {
        event.preventDefault();
        
        responseCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => { answerInput.focus(); }, 500); 

        const currentData = datasetByFonema[currentFonema][currentWordIndex];
        if (!currentData) return;

        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel(); 
            const cleanWord = currentData.word.replace(/\(.*\)/, "").trim();
            const utterance = new SpeechSynthesisUtterance(cleanWord);
            utterance.lang = 'en-US';
            
            // Buscamos el deslizador de velocidad en el HTML
            const speedSlider = document.getElementById('speed-slider');
            
            if (speedSlider) {
                const currentSpeed = parseFloat(speedSlider.value);
                console.log(`[Speakeasy Audio] Reproduciendo "${cleanWord}" a velocidad: ${currentSpeed}x`);
                utterance.rate = currentSpeed; 
            } else {
                console.warn("[Speakeasy Audio] No se encontró el elemento #speed-slider en el HTML. Usando velocidad por defecto (1.25x).");
                utterance.rate = 1.25; 
            }
            
            window.speechSynthesis.speak(utterance);
        } else {
            console.warn("La síntesis de voz no es compatible con este navegador.");
        }
    }

    // --- REPRODUCCIÓN DE AUDIO 2 ---
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
            const fullUrl = baseAudioUrl + fileName;
            const vocalAudio = new Audio(fullUrl);
            
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();

            vocalAudio.play()
                .then(() => { console.log(`Reproduciendo MP3: ${fileName}`); })
                .catch(error => { console.error("Error al cargar audio de GitHub:", error); });
        }
    }

    // CAMBIAR DE LECCIÓN DESDE EL MENÚ DESPLEGABLE
    function changeFonemaDropdown(event) {
        currentFonema = event.target.value;
        currentWordIndex = 0;
        resetEntireExercise();

        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach((item) => {
            item.classList.remove('active');
            if (item.textContent.includes(currentFonema)) {
                item.classList.add('active');
            }
        });
    }

    function togglePrevButtonVisibility() {
        if (currentQuestionIndex === 0) {
            prevButton.classList.add('hidden');
        } else {
            prevButton.classList.remove('hidden');
        }
    }

    function updateProgressBar() {
        const totalQuestions = questionsTexts.length;
        const progressPercent = ((currentQuestionIndex + 1) / totalQuestions) * 100;
        progressBar.style.width = `${progressPercent}%`;
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

    // --- ASOCIACIÓN DE EVENTOS (LISTENERS) ---
    answerInput.addEventListener('input', () => {
        if (errorMessage.textContent !== "") clearError();
    });

    // Separación de clics: Botón verde comprueba, botón naranja navega
    checkAnswerButton.addEventListener('click', processCheckAnswer);
    actionButton.addEventListener('click', processNextQuestion);
    prevButton.addEventListener('click', processPreviousQuestion);
    
    playWordButton.addEventListener('click', handlePlayWordAudio);
    playVocalButton.addEventListener('click', handlePlayVocalAudio);
    fonemaSelect.addEventListener('change', changeFonemaDropdown);

    // Enter dentro del input simula clic en comprobar (si no ha respondido) o en siguiente (si ya aprobó)
    answerInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            if (!hasAnsweredCorrectly) {
                processCheckAnswer(event);
            } else {
                processNextQuestion(event);
            }
        }
    });

    // --- INTERACCIÓN HAMBURGUESA MÓVIL ---
    const menuToggle = document.getElementById('menu-toggle');
    const sidebarElement = document.getElementById('sidebar');

    if (menuToggle && sidebarElement) {
        function toggleSidebarMenu(event) {
            event.preventDefault();
            event.stopPropagation(); 
            sidebarElement.classList.toggle('open');
        }
        menuToggle.addEventListener('click', toggleSidebarMenu);
        menuToggle.addEventListener('touchstart', toggleSidebarMenu, { passive: false });

        const closeSidebarMenu = (event) => {
            if (!sidebarElement.contains(event.target) && !menuToggle.contains(event.target) && sidebarElement.classList.contains('open')) {
                sidebarElement.classList.remove('open');
            }
        };
        document.addEventListener('click', closeSidebarMenu);
        document.addEventListener('touchstart', closeSidebarMenu);
    }

    loadDatabaseFromJSON();
});
