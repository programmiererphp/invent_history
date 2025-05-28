/**
 * ui.js - Модуль управления пользовательским интерфейсом
 * Отвечает за элементы DOM, модальные окна, обновление UI
 */

// Инициализация глобального объекта UI
window.UI = window.UI || {};

// DOM-элементы - будут доступны после загрузки страницы
window.DOM = window.DOM || {};

// Состояние UI
// Используем глобальные переменные из App
window.App = window.App || {};
window.App.currentTheme = localStorage.getItem("theme") || 'standard';

// Состояния UI, управляемые в этом модуле
// let isSpeaking = false; // Removed: Will use window.App.isSpeaking
// let isRecording = false; // Removed: Declared elsewhere (e.g., speech.js or global)
// let isProcessing = false; // Removed: Declared elsewhere (e.g., app.js or global)

// Инициализация UI-элементов после загрузки DOM
function initializeUI() {
    // Получаем все элементы управления
    cacheAllDOMElements();
    
    // Загружаем сохраненные настройки
    loadAllSettings();
    
    // Настройка интерфейса
    setupTheme();
    updateUILanguage();
    
    // Настройка обработчиков событий для всех элементов
    setupEventListeners();
    
    debugLog("UI initialized");
}

// Кэширование всех DOM-элементов для быстрого доступа
function cacheAllDOMElements() {
    // Используем глобальный объект DOM
    const dom = window.DOM;
    
    // Кнопки управления игрой
    dom.startGameBtn = document.getElementById('startGameBtn');
    dom.restartGameBtn = document.getElementById('restartGameBtn');
    dom.stopGameBtn = document.getElementById('stopGameBtn');
    
    // Кнопки озвучивания
    dom.speakStoryBtn = document.getElementById('speakStoryBtn');
    dom.speakCommentBtn = document.getElementById('speakCommentBtn');
    
    // Элементы для записи речи
    dom.startRecordBtn = document.getElementById('startRecordBtn');
    dom.startRecordBtnText = document.getElementById('startRecordBtnText');
    dom.stopRecordBtn = document.getElementById('stopRecordBtn');
    dom.stopRecordBtnText = document.getElementById('stopRecordBtnText');
    dom.stopTTSBtn = document.getElementById('stopTTSBtn');
    
    // Элементы для текстового ввода
    dom.textInput = document.getElementById('textInput');
    dom.submitTextBtn = document.getElementById('submitTextBtn');
    dom.submitTextBtnText = document.getElementById('submitTextBtnText');
    dom.orText = document.getElementById('orText');
    
    // Управление настройками
    dom.settingsBtn = document.getElementById('settingsBtn');
    dom.settingsClose = document.getElementById('settingsClose');
    dom.saveSettingsBtn = document.getElementById('saveSettingsBtn');
    dom.saveSettingsBtnText = document.getElementById('saveSettingsBtnText');
    dom.showContribsBtn = document.getElementById('showContribsBtn');
    dom.contribsClose = document.getElementById('contribsClose');
    
    // Текстовые области и индикаторы
    dom.lastUserTextDiv = document.getElementById('lastUserText');
    dom.ironicTextDiv = document.getElementById('ironicText');
    dom.storyTextDiv = document.getElementById('storyText');
    dom.hintTextDiv = document.getElementById('hintText');
    dom.helpInfosDiv = document.getElementById('helpInfos');
    dom.processingOverlay = document.getElementById('processingOverlay');
    dom.speakingIndicator = document.getElementById('speakingIndicator');
    dom.debugLogDiv = document.getElementById('debugLog');
    
    // Поля настроек
    dom.apiKeyInput = document.getElementById('apiKey');
    dom.googleApiKeyInput = document.getElementById('googleApiKey');
    dom.languageSelect = document.getElementById('languageSelect');
    dom.themeSelect = document.getElementById('themeSelect');
    dom.ttsProviderSelect = document.getElementById('ttsProvider');
    dom.elevenLabsKeyInput = document.getElementById('elevenLabsKey');
    dom.elevenLabsVoiceInput = document.getElementById('elevenLabsVoice');
    dom.googleVoiceNameInput = document.getElementById('googleVoiceName');
    dom.showHelpInfosCheckbox = document.getElementById('showHelpInfos');
    dom.initialPromptInput = document.getElementById('initialPrompt');
    dom.reactionPromptInput = document.getElementById('reactionPrompt');
    dom.modelSelect = document.getElementById('modelSelect');
    dom.autoStartTimeInput = document.getElementById('autoStartTime');
    
    // Проверка на useBrowserSTT и создание если отсутствует
    if (!document.getElementById("useBrowserSTT")) {
        const parentDiv = document.getElementById("otherSettingsTitle")?.parentNode;
        if (parentDiv) {
            const checkboxDiv = document.createElement("div");
            checkboxDiv.className = "form-check mt-3";
            checkboxDiv.innerHTML = `
                <input class="form-check-input" type="checkbox" id="useBrowserSTT" name="useBrowserSTT" checked>
                <label class="form-check-label" for="useBrowserSTT" id="useBrowserSttText">Use Browser Speech Recognition</label>
            `;
            parentDiv.appendChild(checkboxDiv);
            console.log("Восстановлен элемент useBrowserSTT");
        }
    }
    dom.useBrowserSTTCheckbox = document.getElementById('useBrowserSTT');
    
    // Кнопки для отладки
    dom.copyDebugBtn = document.getElementById('copyDebug');
    dom.clearDebugBtn = document.getElementById('clearDebug');
    
    // Список вкладов пользователя
    dom.contribList = document.getElementById('contributionsList');
    
    // Копируем ссылки в локальный DOM для совместимости
    DOM = window.DOM; 
    
    console.log("DOM elements cached successfully.");
}

// Безопасное добавление обработчика событий с проверкой на существование элемента
function addSafeEventListener(elementId, event, handler) {
    // Используем глобальный DOM объект
    const dom = window.DOM;
    
    // Получаем элемент разными способами
    let element;
    if (typeof elementId === 'string') {
        // Сначала проверяем в глобальном DOM
        element = dom[elementId];
        
        // Затем, если не нашли, пробуем локальный DOM
        if (!element) element = DOM[elementId];
        
        // Наконец, пытаемся найти элемент напрямую в DOM
        if (!element) element = document.getElementById(elementId);
    } else {
        // Если передан непосредственно элемент, используем его
        element = elementId;
    }
    
    if (element) {
        // Добавляем обработчик только если элемент найден
        element.addEventListener(event, handler);
        return true;
    } else {
        // Логируем ошибку, если элемент не найден и не входит в список намеренно удаленных
        const elemName = (typeof elementId === 'string') ? elementId : 'unknown';
        const intentionallyRemoved = ['speakStoryBtn', 'speakCommentBtn'];
        
        // Проверяем, является ли элемент намеренно удаленным
        if (!intentionallyRemoved.includes(elemName)) {
            console.warn(`Элемент для события ${event} не найден: ${elemName}`);
            console.log(`Предупреждение: Элемент для события ${event} не найден (${elemName})`);
        }
        return false;
    }
}

// Настройка всех обработчиков событий
function setupEventListeners() {
    // Проверка наличия всех необходимых элементов
    // Список элементов, которые были намеренно удалены из интерфейса
    const intentionallyRemovedElements = ['speakStoryBtn', 'speakCommentBtn'];
    
    const allElements = Object.entries(DOM);
    for (const [name, element] of allElements) {
        if (!element && !intentionallyRemovedElements.includes(name)) {
            console.warn(`Отсутствует элемент: ${name}`);
            debugLog(`Предупреждение: Отсутствует элемент ${name}`);
        }
    }
    
    // Кнопки управления модальными окнами
    addSafeEventListener('settingsBtn', "click", () => {
        // Загружаем API ключ из localStorage перед открытием модального окна
        if (DOM.apiKey) {
            const apiKey = localStorage.getItem("openrouter_api_key");
            if (apiKey) DOM.apiKey.value = apiKey;
            debugLog("API key loaded from localStorage: " + (apiKey ? "[FOUND]" : "[NOT FOUND]"));
        }
        
        openModal("settingsModal");
    });
    addSafeEventListener('settingsClose', "click", () => closeModal("settingsModal"));
    
    // Обработчик для кнопки сохранения настроек
    addSafeEventListener('saveSettingsBtn', "click", () => {
        // Сохраняем настройки в localStorage
        saveAllSettings();
        
        // Закрываем модальное окно
        closeModal("settingsModal");
        
        // Показываем уведомление о успешном сохранении
        alert(getTranslation('settingsSaved') || 'Настройки успешно сохранены');
    });
    addSafeEventListener('showContribsBtn', "click", () => { 
        updateContribsModal(); 
        openModal("contributionsModal"); 
    });
    addSafeEventListener('contribsClose', "click", () => closeModal("contributionsModal"));
    
    // Кнопки управления игрой
    addSafeEventListener('startGameBtn', "click", () => { 
        if (window.App.isProcessing || window.App.isSpeaking) { 
            alert("Please wait..."); 
            return; 
        } 
        debugLog("Start Game clicked."); 
        startGame(); 
    });
    
    addSafeEventListener('restartGameBtn', "click", () => { 
        if (window.App.isProcessing || window.App.isSpeaking) { 
            alert("Please wait..."); 
            return; 
        } 
        debugLog("Restart Game clicked."); 
        restartGame(); 
    });
    
    addSafeEventListener('stopGameBtn', "click", () => { 
        if (window.App.isProcessing) { 
            alert("Please wait..."); 
            return; 
        } 
        debugLog("Stop Game clicked."); 
        stopGame(); 
    });
    
    // Кнопки управления записью и TTS
    addSafeEventListener('startRecordBtn', "click", () => { 
        if (window.App.isProcessing || window.App.isSpeaking) { 
            alert("Please wait..."); 
            return; 
        } 
        debugLog("Start Rec clicked."); 
        recordUserSpeech(); 
    });
    
    addSafeEventListener('stopRecordBtn', "click", () => { 
        debugLog("Stop Rec clicked."); 
        stopRecording(); 
    });
    
    // Обработчик отправки текстового ввода
    addSafeEventListener('submitTextBtn', "click", () => {
        if (window.App.isProcessing || window.App.isSpeaking) {
            alert("Please wait...");
            return;
        }
        const textInput = DOM.textInput;
        if (textInput && textInput.value.trim() !== "") {
            debugLog(`Text submitted: "${textInput.value}"`); 
            processUserInput(textInput.value.trim());
            textInput.value = ""; // Очищаем поле ввода после отправки
        }
    });
    
    // Добавляем обработку Enter в поле ввода
    addSafeEventListener('textInput', "keypress", (event) => {
        if (event.key === "Enter" && !event.shiftKey && !DOM.submitTextBtn.disabled) {
            event.preventDefault(); // Предотвращаем стандартное поведение
            DOM.submitTextBtn.click(); // Имитируем клик по кнопке отправки
        }
    });
    
    addSafeEventListener('stopTTSBtn', "click", () => { 
        debugLog("Stop TTS clicked."); 
        stopSpeaking(); 
    });
    
    // Обработчик для кнопки озвучивания истории
    if (document.getElementById('speakStoryBtn')) {
        addSafeEventListener('speakStoryBtn', "click", speakStoryText);
    }
    
    // Обработчик для кнопки озвучивания комментария ИИ - кнопка удалена из интерфейса
    if (document.getElementById('speakCommentBtn')) {
        addSafeEventListener('speakCommentBtn', "click", () => { 
            debugLog("Speak Comment clicked."); 
            speakCommentText(); 
        });
    }

    // Настройки
    addSafeEventListener('apiKeyInput', "change", () => { 
        apiKey = DOM.apiKeyInput.value.trim(); 
        localStorage.setItem("openrouter_api_key", apiKey); 
        updateModelInfo();
        debugLog("OpenRouter API Key " + (apiKey ? "saved." : "removed.")); 
    });
    
    addSafeEventListener('googleApiKeyInput', "change", () => { 
        googleApiKey = DOM.googleApiKeyInput.value.trim(); 
        localStorage.setItem("google_api_key", googleApiKey); 
        debugLog("Google API Key " + (googleApiKey ? "saved." : "removed.")); 
    });
    
    addSafeEventListener('elevenLabsKeyInput', "change", () => { 
        elevenLabsKey = DOM.elevenLabsKeyInput.value.trim(); 
        localStorage.setItem("elevenlabs_key", elevenLabsKey); 
        debugLog("ElevenLabs Key saved."); 
    });
    
    addSafeEventListener('elevenLabsVoiceInput', "change", () => { 
        localStorage.setItem("elevenlabs_voice", DOM.elevenLabsVoiceInput.value.trim()); 
        debugLog("ElevenLabs Voice saved."); 
    });
    
    addSafeEventListener('googleVoiceNameInput', "change", () => { 
        localStorage.setItem("google_voice_name", DOM.googleVoiceNameInput.value.trim()); 
        debugLog("Google Voice saved."); 
    });
    
    addSafeEventListener('useBrowserSTTCheckbox', "change", () => { 
        if (DOM.useBrowserSTTCheckbox) {
            const useSTT = DOM.useBrowserSTTCheckbox.checked;
            // Используем новый метод Speech для изменения настроек STT
            Speech.setUseBrowserSTT(useSTT);
            updateModelInfo();
        }
    });

    // Обработчики для отладки
    addSafeEventListener('copyDebugBtn', "click", () => { 
        navigator.clipboard.writeText(DOM.debugLogDiv.textContent); 
        alert("Debug log copied to clipboard."); 
    });
    
    addSafeEventListener('clearDebugBtn', "click", () => { 
        DOM.debugLogDiv.textContent = ""; 
        debugLog("Debug log cleared."); 
    });
    
    addSafeEventListener('showHelpInfosCheckbox', "change", () => { 
        window.App.helpInfosVisible = DOM.showHelpInfosCheckbox.checked; 
        localStorage.setItem("show_help_infos", window.App.helpInfosVisible); 
        updateHelpInfosVisibility();
        debugLog("Help infos " + (window.App.helpInfosVisible ? "shown." : "hidden.")); 
    });

    // Обработчики выбора языка, темы и провайдера TTS
    addSafeEventListener('languageSelect', "change", () => { 
        window.App.currentLanguage = DOM.languageSelect.value; 
        // Update the local variable to ensure consistency
        currentLanguage = window.App.currentLanguage;
        localStorage.setItem("interface_language", window.App.currentLanguage); 
        updateUILanguage();
        // Update any in-progress content to use the new language
        if (window.App.gameActive) {
            debugLog("Game is active, updating content with new language...");
            // If we're in the middle of a game, show a message indicating language change
            DOM.hintText.innerHTML += `<p><em>${getTranslation("languageChangedNotice") || "Language changed. New content will be generated in the selected language."}</em></p>`;
        }
        debugLog("Language changed to: " + window.App.currentLanguage); 
    });
    
    addSafeEventListener('ttsProviderSelect', "change", () => { 
        if (DOM.ttsProviderSelect) {
            const provider = DOM.ttsProviderSelect.value;
            // Используем новый метод Speech для изменения TTS провайдера
            Speech.setTTSProvider(provider);
            updateTTSProviderVisibility();
        }
    });
    
    addSafeEventListener('themeSelect', "change", () => { 
        const theme = DOM.themeSelect.value; 
        localStorage.setItem("theme", theme); 
        applyTheme(theme);
        debugLog("Theme changed to: " + theme + "."); 
    });
    
    // Обработчик изменения модели
    addSafeEventListener('modelSelect', "change", () => { 
        model = DOM.modelSelect.value; 
        customModelId = model.startsWith("custom:") ? model.substring(7) : ""; 
        localStorage.setItem("model", model);
        if (customModelId) localStorage.setItem("custom_model_id", customModelId);
        updateModelInfo();
        debugLog("Model changed to: " + model); 
    });
    
    debugLog("Event listeners set up");
}

// Функция для открытия модального окна
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        modal.classList.add('show');
        document.body.classList.add('modal-open');
        debugLog(`Modal ${modalId} opened.`);
    } else {
        debugLog(`Error: Modal ${modalId} not found.`);
    }
}

// Функция для закрытия модального окна
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');
        debugLog(`Modal ${modalId} closed.`);
    } else {
        debugLog(`Error: Modal ${modalId} not found.`);
    }
}

// Обновление модального окна с вкладами пользователя
function updateContribsModal() {
    if (DOM.contribList) {
        DOM.contribList.innerHTML = ""; 
        if (userContributions.length === 0) {
            DOM.contribList.innerHTML = `<li>${getTranslation('noContributions')}</li>`;
        } else {
            userContributions.forEach((c, i) => {
                const li = document.createElement("li");
                li.textContent = `${i + 1}. ${c}`;
                DOM.contribList.appendChild(li);
            });
        }
    }
}

// Функция для обновления всего текста UI на основе выбранного языка
function updateUILanguage() {
    try {
        // Основные элементы кнопок и заголовков с проверкой существования
        const elementsToUpdate = {
            "appTitle": "appTitle",
            "startGameBtn": "startGame",
            "restartGameBtn": "restartGame",
            "stopGameBtn": "stopGame",
            "settingsBtn": "settings",
            "showContribsBtn": "showContribs",
            "stopTTSBtn": "stopSpeaking",
            "processingText": "processing",
            "lastUserInputTitle": "lastUserInput",
            "commentFeedbackTitle": "commentFeedback",
            "currentStoryTitle": "currentStory",
            "hintTitle": "hint",
            "startRecordBtn": "startRecording",
            "stopRecordBtn": "stopRecording",
            
            // Настройки
            "settingsTitle": "settings",
            "openRouterNote": "openRouterNote",
            "apiKeyLabel": "apiKeyLabel",
            "apiKey": "apiKeyPlaceholder", // placeholder
            "modelSelectLabel": "modelSelectLabel",
            "interfaceLanguageLabel": "interfaceLanguage",
            "ttsSettingsTitle": "ttsSettings",
            "ttsProviderLabel": "ttsProvider",
            "storyGenSettingsTitle": "storyGenSettings",
            "initialPromptLabel": "initialPrompt",
            "reactionPromptLabel": "reactionPrompt",
            "themeLabel": "themeLabel",
            "otherSettingsTitle": "otherSettings",
            "autoStartTimeLabel": "autoStartTime",
            "useBrowserSttText": "useBrowserStt",
            "showDebugInfoText": "showDebugInfo",
            "debugLogTitle": "debugLog",
            "copyDebugBtn": "copyDebug",
            "clearDebugBtn": "clearDebug",
            
            // Модальное окно вкладов
            "allContributionsTitle": "allContributions"
        };
        
        // Безопасное обновление всех элементов
        for (const [elementId, translationKey] of Object.entries(elementsToUpdate)) {
            const element = document.getElementById(elementId);
            if (element) {
                if (elementId === "apiKey") {
                    element.placeholder = getTranslation(translationKey);
                } else {
                    element.textContent = getTranslation(translationKey);
                }
            } else {
                debugLog(`Warning: Element ${elementId} not found for translation`);
            }
        }
        
        // Обновление заголовка
        document.title = getTranslation("pageTitle") || "Story Generator";
        
        // Устанавливаем значение в селекторе языка
        if (DOM.languageSelect) {
            DOM.languageSelect.value = window.App.currentLanguage;
        }
        
        // Обновляем новые элементы текстового ввода
        if (DOM.textInput) {
            DOM.textInput.placeholder = getTranslation("textInputPlaceholder");
        }
        
        if (DOM.submitTextBtnText) {
            DOM.submitTextBtnText.textContent = getTranslation("submitText");
        }
        
        if (DOM.orText) {
            DOM.orText.textContent = getTranslation("orText");
        }
        
        // Обновляем текст кнопки сохранения настроек
        if (DOM.saveSettingsBtnText) {
            DOM.saveSettingsBtnText.textContent = getTranslation("saveSettings");
        }
        
        // Обновление контента, зависящего от состояния игры
        updateUIState();
        
        // Обновление плейсхолдеров и подсказок
        updatePlaceholders();
    } catch (err) {
        debugLog(`updateUILanguage Error: ${err}`);
    }
}

// Функция для обновления плейсхолдеров и подсказок
function updatePlaceholders() {
    try {
        const lang = window.App.currentLanguage;
        
        // Обновление плейсхолдеров для всех полей ввода
        if (DOM.userInput) {
            DOM.userInput.placeholder = getTranslation('userInputPlaceholder');
        }
        
        if (DOM.feedbackInput) {
            DOM.feedbackInput.placeholder = getTranslation('feedbackPlaceholder');
        }
        
        if (DOM.apiKey) {
            DOM.apiKey.placeholder = getTranslation('apiKeyPlaceholder');
        }
        
        debugLog(`Плейсхолдеры обновлены на языке: ${lang}`);
    } catch (err) {
        debugLog(`updatePlaceholders Error: ${err}`);
    }
}

// Установка темы оформления
function setupTheme() {
    const savedTheme = localStorage.getItem("theme") || "standard";
    currentTheme = savedTheme;
    
    if (DOM.themeSelect) {
        DOM.themeSelect.value = savedTheme;
    }
    
    applyTheme(savedTheme);
    debugLog(`Theme set to: ${savedTheme}`);
}

// Применение темы оформления
function applyTheme(theme) {
    currentTheme = theme;
    
    // Удаляем все классы тем
    document.body.classList.remove('dark-theme', 'light-theme');
    
    // Применяем выбранную тему
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
    } else if (theme === 'light') {
        document.body.classList.add('light-theme');
    }
    // 'standard' тема не требует дополнительных классов
    
    debugLog(`Theme applied: ${theme}`);
}

// Обновление видимости подсказок
function updateHelpInfosVisibility() {
    if (DOM.helpInfosDiv) {
        if (window.App.helpInfosVisible) {
            DOM.helpInfosDiv.classList.add('active');
        } else {
            DOM.helpInfosDiv.classList.remove('active');
        }
    }
}

// Обновление содержимого подсказок
function updateHelpInfosContent() {
    if (DOM.helpInfosDiv && window.App.helpInfosVisible) {
        // Форматируем и обновляем текст подсказки
        formatAndDisplayHint();
    }
}

// Форматирование и отображение подсказки
function formatAndDisplayHint() {
    if (DOM.hintTextDiv && currentHint) {
        // Проверяем, является ли подсказка объектом с вопросом и вариантами
        if (typeof currentHint === 'object' && currentHint.question && Array.isArray(currentHint.options)) {
            // Форматируем подсказку как вопрос с вариантами
            let formattedHint = `<strong>${currentHint.question}</strong><br>`;
            currentHint.options.forEach((option, index) => {
                formattedHint += `<br>${index + 1}. ${option}`;
            });
            DOM.hintTextDiv.innerHTML = formattedHint;
        } else {
            // Обычная текстовая подсказка
            DOM.hintTextDiv.textContent = currentHint;
        }
        
        // Применяем анимацию к подсказке
        DOM.hintTextDiv.classList.add('hint-highlight');
        setTimeout(() => {
            DOM.hintTextDiv.classList.remove('hint-highlight');
        }, 2000);
    }
    
    // Обновляем содержимое справочной информации
    if (DOM.helpInfosDiv && window.App.helpInfosVisible) {
        DOM.helpInfosDiv.textContent = getTranslation('helpInfos');
    }
}

// Установка статуса обработки (показ/скрытие оверлея)
function setProcessingStatus(isActive) {
    window.App.isProcessing = isActive;
    
    if (DOM.processingOverlay) {
        if (isActive) {
            DOM.processingOverlay.classList.add('active');
        } else {
            DOM.processingOverlay.classList.remove('active');
        }
    }
    
    updateUIState();
}

// Установка статуса озвучивания (показ/скрытие индикатора)
function setSpeakingStatus(isActive) {
    window.App.isSpeaking = isActive;
    
    if (DOM.speakingIndicator) {
        if (isActive) {
            DOM.speakingIndicator.classList.add('active');
        } else {
            DOM.speakingIndicator.classList.remove('active');
        }
    }
    updateUIState(); // Обновляем состояние UI кнопок
}

// Обновление состояния UI в зависимости от игрового статуса
function updateUIState() {
    // Активируем/деактивируем кнопки в зависимости от состояния игры
    if (DOM.startGameBtn) DOM.startGameBtn.disabled = window.App.gameActive || window.App.isProcessing;
    if (DOM.restartGameBtn) DOM.restartGameBtn.disabled = !window.App.gameActive;
    if (DOM.stopGameBtn) DOM.stopGameBtn.disabled = !window.App.gameActive;
    
    // Устанавливаем состояние кнопок записи и стоп в зависимости от статуса
    if (DOM.startRecordBtn) {
        DOM.startRecordBtn.disabled = !window.App.gameActive || window.App.isRecording || window.App.isProcessing;
        // Обновляем стиль кнопки записи
        if (window.App.isRecording) {
            DOM.startRecordBtn.classList.add('btn-danger');
            DOM.startRecordBtn.classList.remove('btn-primary');
        } else {
            DOM.startRecordBtn.classList.remove('btn-danger');
            DOM.startRecordBtn.classList.add('btn-primary');
        }
    }
    
    if (DOM.stopRecordBtn) {
        DOM.stopRecordBtn.disabled = !window.App.isRecording;
        // Обновляем видимость и стиль кнопки остановки записи
        if (!window.App.isRecording) {
            // После остановки записи скрываем красную кнопку и возвращаем ей оригинальный стиль
            DOM.stopRecordBtn.classList.remove('btn-danger');
            DOM.stopRecordBtn.classList.add('btn-secondary');
        } else {
            DOM.stopRecordBtn.classList.remove('btn-secondary');
            DOM.stopRecordBtn.classList.add('btn-danger');
        }
    }
    
    // Управление полем текстового ввода и кнопкой отправки
    if (DOM.textInput) {
        // Текстовый ввод активен только когда игра активна и не идет обработка
        DOM.textInput.disabled = !window.App.gameActive || window.App.isProcessing;
    }
    
    if (DOM.submitTextBtn) {
        // Кнопка отправки текста активна при тех же условиях, что и текстовый ввод
        DOM.submitTextBtn.disabled = !window.App.gameActive || window.App.isProcessing;
    }

    // Обновляем кнопку остановки TTS
    if (DOM.stopTTSBtn) DOM.stopTTSBtn.disabled = !window.App.isSpeaking;
    
    // Обновляем индикатор говорения
    if (DOM.speakingIndicator) {
        DOM.speakingIndicator.style.display = window.App.isSpeaking ? 'inline-block' : 'none';
    }
}

// Обновление видимости настроек TTS-провайдера
function updateTTSProviderVisibility() {
    // Получаем текущий провайдер TTS
    const ttsProvider = localStorage.getItem("tts_provider") || "browser";
    
    // ElevenLabs настройки
    const elevenLabsSettings = document.getElementById('elevenLabsSettings');
    if (elevenLabsSettings) {
        elevenLabsSettings.style.display = ttsProvider === 'elevenlabs' ? 'block' : 'none';
    }
    
    // Google Cloud TTS настройки
    const googleTTSSettings = document.getElementById('googleTTSSettings');
    if (googleTTSSettings) {
        googleTTSSettings.style.display = ttsProvider === 'google' ? 'block' : 'none';
    }
}

// Функция логирования для отладки
function debugLog(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    
    console.log(logMessage);
    
    // Используем глобальный DOM объект
    const dom = window.DOM;
    
    // Проверяем несколько вариантов доступа к debugLogDiv
    const debugLogDiv = dom?.debugLogDiv || DOM?.debugLogDiv || document.getElementById('debugLog');
    
    if (debugLogDiv) {
        debugLogDiv.textContent += logMessage + '\n';
        debugLogDiv.scrollTop = debugLogDiv.scrollHeight;
    }
}

// Функция для переключения видимости полей с паролями
function togglePasswordVisibility(targetId) {
    const inputField = document.getElementById(targetId);
    const button = event.currentTarget;
    const icon = button.querySelector('i');
    
    if (!inputField) {
        alert(`Поле ${targetId} не найдено`);
        return;
    }
    
    // Переключаем тип поля между password и text
    if (inputField.type === 'password') {
        inputField.type = 'text';
        icon.className = 'fa fa-eye-slash';
        debugLog(`Показан API ключ для поля ${targetId}`);
    } else {
        inputField.type = 'password';
        icon.className = 'fa fa-eye';
        debugLog(`Скрыт API ключ для поля ${targetId}`);
    }
}

// Экспортируем функцию для использования в HTML
window.togglePasswordVisibility = togglePasswordVisibility;

// Функция для загрузки всех сохраненных настроек
function loadAllSettings() {
    try {
        // API ключи
        if (DOM.apiKey) {
            const apiKey = localStorage.getItem("openrouter_api_key");
            if (apiKey) DOM.apiKey.value = apiKey;
        }
        if (DOM.elevenLabsKey) {
            const elevenLabsKey = localStorage.getItem("elevenlabs_key");
            if (elevenLabsKey) DOM.elevenLabsKey.value = elevenLabsKey;
        }
        if (DOM.googleApiKey) {
            const googleApiKey = localStorage.getItem("google_api_key");
            if (googleApiKey) DOM.googleApiKey.value = googleApiKey;
        }
        
        // Модель ИИ
        if (DOM.modelSelect) {
            const model = localStorage.getItem("model");
            if (model) DOM.modelSelect.value = model;
        }
        
        // Язык интерфейса
        if (DOM.languageSelect) {
            const language = localStorage.getItem("interface_language");
            if (language) DOM.languageSelect.value = language;
        }
        
        // Настройки TTS
        if (DOM.ttsProvider) {
            const ttsProvider = localStorage.getItem("tts_provider");
            if (ttsProvider) DOM.ttsProvider.value = ttsProvider;
        }
        if (DOM.elevenLabsVoice) {
            const elevenLabsVoice = localStorage.getItem("elevenlabs_voice");
            if (elevenLabsVoice) DOM.elevenLabsVoice.value = elevenLabsVoice;
        }
        if (DOM.googleVoiceName) {
            const googleVoiceName = localStorage.getItem("google_voice_name");
            if (googleVoiceName) DOM.googleVoiceName.value = googleVoiceName;
        }
        
        // Настройки генерации историй
        if (DOM.initialPrompt) {
            const initialPrompt = localStorage.getItem("initial_prompt");
            if (initialPrompt) DOM.initialPrompt.value = initialPrompt;
        }
        if (DOM.reactionPrompt) {
            const reactionPrompt = localStorage.getItem("reaction_prompt");
            if (reactionPrompt) DOM.reactionPrompt.value = reactionPrompt;
        }
        if (DOM.themeSelect) {
            const theme = localStorage.getItem("theme");
            if (theme) DOM.themeSelect.value = theme;
        }
        
        // Другие настройки
        if (DOM.autoStartTime) {
            const autoStartTime = localStorage.getItem("auto_start_time");
            if (autoStartTime) DOM.autoStartTime.value = autoStartTime;
        }
        if (DOM.useBrowserSTT) {
            const useBrowserSTT = localStorage.getItem("use_browser_stt");
            if (useBrowserSTT !== null) DOM.useBrowserSTT.checked = useBrowserSTT === "true";
        }
        if (DOM.showHelpInfos) {
            const showHelpInfos = localStorage.getItem("show_help_infos");
            if (showHelpInfos !== null) DOM.showHelpInfos.checked = showHelpInfos === "true";
        }
        
        // Обновляем видимость панелей настроек TTS
        updateTTSProviderVisibility();
        updateHelpInfosVisibility();
        
        debugLog("All settings loaded successfully.");
        return true;
    } catch (error) {
        debugLog(`Error loading settings: ${error.message}`);
        return false;
    }
}

// Функция для централизованного сохранения всех настроек
function saveAllSettings() {
    try {
        // API ключи
        if (DOM.apiKey) localStorage.setItem("openrouter_api_key", DOM.apiKey.value);
        if (DOM.elevenLabsKey) localStorage.setItem("elevenlabs_key", DOM.elevenLabsKey.value);
        if (DOM.googleApiKey) localStorage.setItem("google_api_key", DOM.googleApiKey.value);
        
        // Модель ИИ
        if (DOM.modelSelect) localStorage.setItem("model", DOM.modelSelect.value);
        
        // Язык интерфейса
        if (DOM.languageSelect) {
            localStorage.setItem("interface_language", DOM.languageSelect.value);
            window.App.currentLanguage = DOM.languageSelect.value;
        }
        
        // Настройки TTS
        if (DOM.ttsProvider) localStorage.setItem("tts_provider", DOM.ttsProvider.value);
        if (DOM.elevenLabsVoice) localStorage.setItem("elevenlabs_voice", DOM.elevenLabsVoice.value);
        if (DOM.googleVoiceName) localStorage.setItem("google_voice_name", DOM.googleVoiceName.value);
        
        // Настройки генерации историй
        if (DOM.initialPrompt) localStorage.setItem("initial_prompt", DOM.initialPrompt.value);
        if (DOM.reactionPrompt) localStorage.setItem("reaction_prompt", DOM.reactionPrompt.value);
        if (DOM.themeSelect) localStorage.setItem("theme", DOM.themeSelect.value);
        
        // Другие настройки
        if (DOM.autoStartTime) localStorage.setItem("auto_start_time", DOM.autoStartTime.value);
        if (DOM.useBrowserSTT) localStorage.setItem("use_browser_stt", DOM.useBrowserSTT.checked);
        if (DOM.showHelpInfos) {
            localStorage.setItem("show_help_infos", DOM.showHelpInfos.checked);
            window.App.helpInfosVisible = DOM.showHelpInfos.checked;
        }
        
        // Обновляем интерфейс
        updateUILanguage();
        updateTTSProviderVisibility();
        updateHelpInfosVisibility();
        
        debugLog("All settings saved successfully.");
        return true;
    } catch (error) {
        debugLog(`Error saving settings: ${error.message}`);
        return false;
    }
}

// Функция для озвучивания текста истории
function speakStoryText() {
    if (!window.App.gameActive) {
        debugLog("История ещё не начата.");
        return;
    }
    
    if (window.App.isSpeaking) {
        debugLog("Остановка озвучивания истории через speakStoryText.");
        Speech.stopSpeaking(); 
        return;
    }
    
    if (!DOM.storyText || !DOM.storyText.textContent || DOM.storyText.textContent.trim() === '') {
        debugLog("Нет текста для озвучивания.");
        return;
    }
    
    const storyTextContent = DOM.storyText.textContent;
    debugLog(`Начало озвучивания истории (${storyTextContent.length} символов).`);
    
    const storyLang = (DOM.themeSelect && DOM.themeSelect.value === 'german-a2') ? 'de' : window.App.currentLanguage;
    
    setSpeakingStatus(true);
    
    Speech.speak(storyTextContent, storyLang, 
        () => { 
            debugLog("Озвучивание истории завершено.");
            setSpeakingStatus(false);
        }, 
        (error) => { 
            debugLog("Ошибка озвучивания истории: " + (error.message || error));
            setSpeakingStatus(false);
        }
    );
}

// Функция для озвучивания комментария ИИ
function speakCommentText() {
    if (!window.App.gameActive) {
        debugLog("История ещё не начата.");
        return;
    }
    
    if (window.App.isSpeaking) {
        debugLog("Остановка озвучивания комментария через speakCommentText.");
        Speech.stopSpeaking(); 
        return;
    }
    
    // Проверка наличия комментария для озвучивания
    if (!DOM.ironicTextDiv || !DOM.ironicTextDiv.textContent || DOM.ironicTextDiv.textContent.trim() === '') {
        debugLog("Нет комментария для озвучивания.");
        return;
    }
    
    const commentTextContent = DOM.ironicTextDiv.textContent;
    debugLog(`Начало озвучивания комментария (${commentTextContent.length} символов).`);
    const commentLang = window.App.currentLanguage;

    setSpeakingStatus(true);
    
    Speech.speak(commentTextContent, commentLang, 
        () => { 
            debugLog("Озвучивание комментария завершено.");
            setSpeakingStatus(false);
        }, 
        (error) => { 
            debugLog("Ошибка озвучивания комментария: " + (error.message || error));
            setSpeakingStatus(false);
        }
    );
}

// Function to parse markdown content to HTML
function parseMarkdown(text) {
    if (!text) return '';
    
    try {
        // If the marked library is available (from marked.js), use it
        if (typeof marked !== 'undefined') {
            return marked.parse(text);
        } else {
            // Basic fallback if marked is not available
            // This is very minimal and won't handle most markdown features
            return text
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.+?)\*/g, '<em>$1</em>')
                .replace(/\n/g, '<br>');
        }
    } catch (error) {
        console.error('Error parsing markdown:', error);
        return text; // Return original text if parsing fails
    }
}

// NEW FUNCTION to handle API response content extraction
function handleApiResponseContent(apiResponse, isContinuation = false) {
    debugLog("handleApiResponseContent received: " + JSON.stringify(apiResponse).substring(0, 200) + "...");
    let storyText = "";
    let commentText = ""; // For AI's comment/feedback

    // Check for completely empty response or empty content field
    if (apiResponse && apiResponse.choices && apiResponse.choices.length > 0 && 
        apiResponse.choices[0].message && 
        (apiResponse.choices[0].message.content === undefined || apiResponse.choices[0].message.content === null || apiResponse.choices[0].message.content === "")) {
        
        debugLog("API returned empty content field in response: " + JSON.stringify(apiResponse));
        storyText = getTranslation('apiReturnedEmptyStory') || 
            "В некотором царстве, в некотором государстве жил-был старый король. У него было три сына. Однажды король собрал сыновей и сказал: 'Дети мои, я стар и скоро покину этот мир. Но прежде чем это случится, я хочу знать, кто из вас достоин унаследовать моё королевство.'";
        commentText = "Что бы вы хотели добавить к истории?";
        
    } else if (apiResponse && apiResponse.choices && apiResponse.choices.length > 0 && 
        apiResponse.choices[0].message && typeof apiResponse.choices[0].message.content === 'string') {
        
        const contentStr = apiResponse.choices[0].message.content;
        
        try {
            // Try to parse the response as JSON
            const parsedResponse = JSON.parse(contentStr);
            
            // Check if it has the expected structure
            if (parsedResponse.integratedStory || parsedResponse.story) {
                storyText = parsedResponse.integratedStory || parsedResponse.story;
                commentText = parsedResponse.comment || "";
                debugLog("Extracted JSON story and comment successfully");
            } else {
                // If not in the expected structure, use the whole content as story
                storyText = contentStr;
                debugLog("Response was valid JSON but not in expected structure, using raw content");
            }
        } catch (e) {
            // If not valid JSON, use the content directly
            storyText = contentStr;
            debugLog("Response was not valid JSON, using raw content");
        }

        if (storyText.trim() === "") {
            debugLog("API returned empty content after parsing.");
            storyText = getTranslation('apiReturnedEmptyStory') || 
                "В далёкой стране, где горы касаются облаков, стояла маленькая деревня. В этой деревне жил молодой кузнец, известный своим мастерством и добрым сердцем. Однажды утром он нашёл у порога своей кузницы странный светящийся камень.";
            commentText = "Как вы думаете, что произойдёт дальше?";
        } else {
            debugLog("Extracted content successfully: " + storyText.substring(0, 100) + "...");
        }
    } else {
        debugLog("Unknown API response format or content missing. Full response: " + JSON.stringify(apiResponse));
        storyText = getTranslation('apiErrorStoryFormat') || 
            "Жила-была девочка, которая очень любила читать книги о приключениях. Однажды, перелистывая старый том в библиотеке, она нашла странную карту, спрятанную между страницами. На карте был отмечен путь к таинственному месту в лесу недалеко от её дома.";
        commentText = "Интересно, что же она обнаружит, следуя этой карте?";
    }

    if (storyText) {
        // Determine if it's a continuation by checking if storyTextDiv already has content
        const isActuallyContinuation = window.App.gameActive && DOM.storyTextDiv && DOM.storyTextDiv.textContent.trim() !== '';
        displayStoryText(storyText, false, isActuallyContinuation);
    }
    
    if (commentText && commentText.trim() !== "") {
        debugLog("Displaying AI comment: " + commentText.substring(0, 50) + (commentText.length > 50 ? "..." : ""));
        displayIronicComment(commentText);
    } else {
        debugLog("No comment to display");
    }

    setProcessingStatus(false);
    updateUIState();
    // Check if hints should be fetched/displayed after story update
    if (window.App.settings && window.App.settings.showAiHints && storyText.trim() !== "") {
        fetchAndDisplayHint(storyText);
    } else {
        debugLog("Skipping hint fetching - either settings not defined or showAiHints is false");
    }
}

// Обновление отображения истории
function displayStoryText(text, isUser = false, isContinuation = false) {
    if (DOM.storyTextDiv) {
        if (isUser) {
            const p = document.createElement('p');
            p.className = 'user-text';
            p.innerHTML = parseMarkdown(text);
            DOM.storyTextDiv.appendChild(p);
        } else {
            if (isContinuation) {
                const p = document.createElement('p');
                p.innerHTML = parseMarkdown(text);
                DOM.storyTextDiv.appendChild(p);
            } else {
                DOM.storyTextDiv.innerHTML = '';
                const p = document.createElement('p');
                p.innerHTML = parseMarkdown(text);
                DOM.storyTextDiv.appendChild(p);
            }
        }
        DOM.storyTextDiv.scrollTop = DOM.storyTextDiv.scrollHeight;
        debugLog("Story text displayed.");
    } else {
        debugLog("Story text div not found.");
    }
    updateUIState(); // Обновить состояние кнопок после отображения истории
}

// Отображение ироничного комментария ИИ
function displayIronicComment(text) {
    if (DOM.ironicTextDiv) {
        DOM.ironicTextDiv.innerHTML = ''; // Очищаем предыдущий комментарий
        const p = document.createElement('p');
        p.innerHTML = parseMarkdown(text); // Используем parseMarkdown для форматирования
        DOM.ironicTextDiv.appendChild(p);
        DOM.ironicTextDiv.scrollTop = DOM.ironicTextDiv.scrollHeight;
        debugLog("Ironic comment displayed.");
    } else {
        debugLog("Ironic text div not found.");
    }
    updateUIState(); // Обновить состояние кнопок после отображения комментария
}

// Экспорт функций для использования в других модулях
window.UI = {
    initializeUI,
    updateUIState,
    updateUILanguage,
    setProcessingStatus,
    setSpeakingStatus,
    openModal,
    closeModal,
    updateContribsModal,
    updateHelpInfosVisibility,
    updateHelpInfosContent,
    formatAndDisplayHint,
    speakStoryText,
    speakCommentText,
    debugLog
};

// Кнопки управления игрой
addSafeEventListener('startGameBtn', "click", () => { 
    if (window.App.isProcessing || window.App.isSpeaking) { 
        alert(getTranslation('pleaseWait') || "Please wait..."); 
        return; 
    } 
    // debugLog("Start Game clicked."); // Moved into App.startGame or keep here if preferred
    // startGame(); // This was likely a direct call to window.App.startGame()
    window.App.startGame(); // Assuming window.App.startGame handles its own debugLog and state changes initially
    debugLog("Start Game button clicked, initiating game start process.");
    setProcessingStatus(true); // UI indication that processing has started
    updateUIState();
    debugLog("Fetching initial story using model: " + (DOM.modelSelect ? DOM.modelSelect.value : "default") + "...");
    
    // Safely get values with fallbacks in case DOM elements aren't found
    const modelValue = DOM.modelSelect && DOM.modelSelect.value ? DOM.modelSelect.value : 'deepseek/deepseek-chat-v3-0324:free';
    const themeValue = DOM.themeSelect && DOM.themeSelect.value ? DOM.themeSelect.value : 'standard';
    
    window.App.game.fetchInitialStory(modelValue, window.App.currentLanguage, themeValue)
        .then(storyData => {
            handleApiResponseContent(storyData, false); // Use the new handler
            // debugLog("Game started."); // Log after content is handled
        })
        .catch(error => {
            console.error("Error fetching initial story:", error);
            debugLog("Error fetching initial story: " + (error.message || error));
            displayStoryText(getTranslation('errorStartGame') || "Error starting game. Please try again.");
            setProcessingStatus(false);
            updateUIState();
        });
});

// Отправка пользовательского ввода - добавляем слушатель только если элемент существует
// Этот блок кода неактивен, так как пользовательский ввод удален из интерфейса
// При необходимости можно раскомментировать если функциональность будет восстановлена
if (document.getElementById('sendInputBtn')) {
    addSafeEventListener('sendInputBtn', "click", () => {
        const userInput = DOM.userInput.value.trim();
        if (userInput === '' || window.App.isProcessing || window.App.isSpeaking) {
            if (userInput === '') alert(getTranslation('enterYourIdea') || "Please enter your idea.");
            else alert(getTranslation('pleaseWait') || "Please wait...");
            return;
        }
        
        displayStoryText(userInput, true, true); // Display user's text immediately
        DOM.userInput.value = ''; // Clear input field
        setProcessingStatus(true);
        updateUIState();
        debugLog("Sending user input: " + userInput);

        // Safely get values with fallbacks in case DOM elements aren't found
        const modelValue = DOM.modelSelect && DOM.modelSelect.value ? DOM.modelSelect.value : 'deepseek/deepseek-chat-v3-0324:free';
        const themeValue = DOM.themeSelect && DOM.themeSelect.value ? DOM.themeSelect.value : 'standard';
        
        window.App.game.fetchContinuation(userInput, modelValue, window.App.currentLanguage, themeValue)
            .then(responseData => {
                handleApiResponseContent(responseData, true); // Use the new handler
            })
            .catch(error => {
                console.error("Error fetching continuation:", error);
                debugLog("Error fetching continuation: " + (error.message || error));
                // Display an error message in the story area or as an alert
                displayStoryText(getTranslation('errorContinueGame') || "Error continuing game. Please try again.");
                setProcessingStatus(false);
                updateUIState();
            });
    });
}
