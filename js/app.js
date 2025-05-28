/**
 * app.js - Главный модуль приложения
 * Координирует работу всех компонентов и содержит основную логику
 */

// Глобальные переменные, доступные всем модулям
window.App = window.App || {};

// Глобальные переменные состояния
window.App.gameActive = false;
window.App.isProcessing = false;
window.App.currentLanguage = localStorage.getItem("interface_language") || "en";
window.App.fullStory = "";
window.App.currentHint = "";
window.App.lastComment = "";
window.App.lastUserInput = "";
window.App.userContributions = [];
window.App.helpInfosVisible = localStorage.getItem("show_help_infos") === "true";

// Для удобства использования в коде - используем let вместо const для возможности изменения
let gameActive = window.App.gameActive;
let isProcessing = window.App.isProcessing;
let currentLanguage = window.App.currentLanguage;
let fullStory = window.App.fullStory;
let currentHint = window.App.currentHint;
let lastComment = window.App.lastComment;
let lastUserInput = window.App.lastUserInput;
let userContributions = window.App.userContributions;
let helpInfosVisible = window.App.helpInfosVisible;

// Карта имен языков
const languageNameMap = {
    "en": "English",
    "de": "German",
    "ru": "Russian",
    "es": "Spanish",
    "fr": "French",
    "it": "Italian",
    "pt": "Portuguese",
    "zh": "Chinese",
    "ja": "Japanese",
    "ko": "Korean"
};

// Стандартные промпты
const defaultPrompts = {
    initial: `You are a creative storyteller. Create a story beginning on the selected theme and provide an engaging hint for how the user could continue the story.
Please respond in this exact JSON format:
{
  "story": "The initial story text (2-3 sentences)",
  "hint": {
    "question": "A question to guide the user's contribution",
    "options": ["option 1", "option 2", "option 3"]
  },
  "comment": "A friendly comment about the story or encouragement to contribute"
}`,
    reaction: `You are continuing a collaborative story. Here's what we have so far:
{currentStory}

The user just contributed:
{userInput}

Integrate the user's contribution naturally into the story. Then provide a hint to guide them for the next contribution.
Please respond in this exact JSON format:
{
  "integratedStory": "The updated story with user's contribution integrated seamlessly",
  "hint": {
    "question": "A question to guide the next contribution",
    "options": ["option 1", "option 2", "option 3"]
  },
  "comment": "A friendly reaction to their contribution"
}`
};

// Словарь переводов
const translations = {
    en: {
        appTitle: "Story Generator",
        startGame: "Start Game",
        restartGame: "Restart",
        stopGame: "End Game",
        settings: "Settings",
        showContribs: "Show Contributions",
        stopSpeaking: "Stop Speech",
        readComment: "Read Comment",
        processing: "Processing...",
        lastUserInput: "Your Last Input",
        commentFeedback: "AI Comment",
        currentStory: "Current Story",
        hint: "Hint",
        helpInfos: "Use the microphone button to record your continuation of the story, or type your response below.",
        startRecording: "Start Recording",
        stopRecording: "Stop Recording",
        textInputPlaceholder: "Type your response...",
        submitText: "Submit",
        orText: "or",
        allContributions: "All Your Contributions",
        noContributions: "No contributions yet",
        apiKeyRequired: "Please enter your OpenRouter API key in the settings.",
        apiError: "Error communicating with AI: ",
        speechRecognitionError: "Error with speech recognition.",
        speechRecognitionNotSupported: "Speech recognition is not supported in your browser.",
        startGameFirst: "Please start a game first.",
        defaultComment: "What would you like to add to the story?",
        defaultHint: "Continue the story with your own ideas.",
        languageChangedNotice: "Language changed to English. New content will be generated in English.",
        // Settings translations
        apiKeyLabel: "OpenRouter API Key",
        apiKeyPlaceholder: "Enter your API key here",
        modelSelectLabel: "AI Model",
        interfaceLanguage: "Interface Language",
        ttsSettings: "Text-to-Speech Settings",
        ttsProvider: "TTS Provider",
        storyGenSettings: "Story Generation Settings",
        initialPrompt: "Initial Prompt",
        reactionPrompt: "Reaction Prompt",
        themeLabel: "Theme",
        otherSettings: "Other Settings",
        autoStartTime: "Auto-start Time (HH:MM)",
        useBrowserStt: "Use Browser Speech Recognition",
        showDebugInfo: "Show Debug Info",
        debugLog: "Debug Log",
        copyDebug: "Copy Log",
        clearDebug: "Clear Log",
        openRouterNote: "Get your API key from openrouter.ai",
        readStory: "Read Story",
        stopReading: "Stop Reading",
        saveSettings: "Save Settings",
        settingsSaved: "Settings saved successfully!"
    },
    ru: {
        appTitle: "Генератор Историй",
        startGame: "Начать Игру",
        restartGame: "Начать Заново",
        stopGame: "Завершить Игру",
        settings: "Настройки",
        showContribs: "Показать Вклады",
        stopSpeaking: "Остановить Речь",
        readComment: "Прочитать Комментарий",
        processing: "Обработка...",
        lastUserInput: "Ваш Последний Ввод",
        commentFeedback: "Комментарий ИИ",
        currentStory: "Текущая История",
        hint: "Подсказка",
        helpInfos: "Используйте кнопку микрофона для записи вашего продолжения истории или введите текст ниже.",
        startRecording: "Начать Запись",
        stopRecording: "Остановить Запись",
        textInputPlaceholder: "Введите свой ответ...",
        submitText: "Отправить",
        orText: "или",
        allContributions: "Все Ваши Вклады",
        noContributions: "Пока нет вкладов",
        apiKeyRequired: "Пожалуйста, введите ваш API ключ OpenRouter в настройках.",
        apiError: "Ошибка связи с ИИ: ",
        speechRecognitionError: "Ошибка распознавания речи.",
        speechRecognitionNotSupported: "Распознавание речи не поддерживается в вашем браузере.",
        startGameFirst: "Пожалуйста, сначала начните игру.",
        defaultComment: "Что бы вы хотели добавить к истории?",
        defaultHint: "Продолжите историю своими идеями.",
        languageChangedNotice: "Язык изменен на русский. Новый контент будет генерироваться на русском языке.",
        // Settings translations
        apiKeyLabel: "API Ключ OpenRouter",
        apiKeyPlaceholder: "Введите ваш API ключ здесь",
        modelSelectLabel: "Модель ИИ",
        interfaceLanguage: "Язык Интерфейса",
        ttsSettings: "Настройки Синтеза Речи",
        ttsProvider: "Провайдер TTS",
        storyGenSettings: "Настройки Генерации Историй",
        initialPrompt: "Начальный Промпт",
        reactionPrompt: "Промпт Реакции",
        themeLabel: "Тема",
        otherSettings: "Другие Настройки",
        autoStartTime: "Время Авто-запуска (ЧЧ:ММ)",
        useBrowserStt: "Использовать Распознавание Речи Браузера",
        showDebugInfo: "Показать Отладочную Информацию",
        debugLog: "Журнал Отладки",
        copyDebug: "Копировать Журнал",
        clearDebug: "Очистить Журнал",
        openRouterNote: "Получите API ключ на openrouter.ai",
        readStory: "Прочитать Историю",
        stopReading: "Остановить Чтение",
        saveSettings: "Сохранить настройки",
        settingsSaved: "Настройки успешно сохранены!"
    },
    de: {
        appTitle: "Geschichtengenerator",
        startGame: "Spiel Starten",
        restartGame: "Neustart",
        stopGame: "Spiel Beenden",
        settings: "Einstellungen",
        showContribs: "Beiträge Anzeigen",
        stopSpeaking: "Sprache Stoppen",
        readComment: "Kommentar Lesen",
        processing: "Verarbeitung...",
        lastUserInput: "Deine Letzte Eingabe",
        commentFeedback: "KI-Kommentar",
        currentStory: "Aktuelle Geschichte",
        hint: "Hinweis",
        helpInfos: "Verwende die Mikrofontaste, um deine Fortsetzung der Geschichte aufzunehmen, oder gib unten deine Antwort ein.",
        startRecording: "Aufnahme Starten",
        stopRecording: "Aufnahme Stoppen",
        textInputPlaceholder: "Gib deine Antwort ein...",
        submitText: "Senden",
        orText: "oder",
        allContributions: "Alle Deine Beiträge",
        noContributions: "Noch keine Beiträge",
        apiKeyRequired: "Bitte gib deinen OpenRouter API-Schlüssel in den Einstellungen ein.",
        apiError: "Fehler bei der Kommunikation mit der KI: ",
        speechRecognitionError: "Fehler bei der Spracherkennung.",
        speechRecognitionNotSupported: "Spracherkennung wird in deinem Browser nicht unterstützt.",
        startGameFirst: "Bitte starte zuerst ein Spiel.",
        defaultComment: "Was möchtest du zur Geschichte hinzufügen?",
        defaultHint: "Setze die Geschichte mit deinen eigenen Ideen fort.",
        languageChangedNotice: "Sprache auf Deutsch geändert. Neue Inhalte werden auf Deutsch generiert.",
        // Settings translations
        apiKeyLabel: "OpenRouter API-Schlüssel",
        apiKeyPlaceholder: "Gib hier deinen API-Schlüssel ein",
        modelSelectLabel: "KI-Modell",
        interfaceLanguage: "Oberflächensprache",
        ttsSettings: "Text-zu-Sprache Einstellungen",
        ttsProvider: "TTS-Anbieter",
        storyGenSettings: "Einstellungen zur Geschichtengenerierung",
        initialPrompt: "Anfangsprompt",
        reactionPrompt: "Reaktionsprompt",
        themeLabel: "Thema",
        otherSettings: "Andere Einstellungen",
        autoStartTime: "Auto-Start-Zeit (HH:MM)",
        useBrowserStt: "Browser-Spracherkennung Verwenden",
        showDebugInfo: "Debug-Info Anzeigen",
        debugLog: "Debug-Protokoll",
        copyDebug: "Protokoll Kopieren",
        clearDebug: "Protokoll Löschen",
        openRouterNote: "Hol dir deinen API-Schlüssel von openrouter.ai",
        readStory: "Geschichte Vorlesen",
        stopReading: "Vorlesen Stoppen",
        saveSettings: "Einstellungen Speichern",
        settingsSaved: "Einstellungen wurden erfolgreich gespeichert!"
    }
};

// Функция для инициализации приложения
window.initializeApp = function() {
    // Загрузка сохраненных настроек
    loadSavedSettings();
    
    // Инициализация распознавания речи
    Speech.initSpeechRecognition();
    
    // Обновление интерфейса
    UI.updateUILanguage();
    
    UI.debugLog("Application initialized");
}

// Загрузка сохраненных настроек из localStorage
function loadSavedSettings() {
    // API ключи и настройки моделей
    apiKey = localStorage.getItem("openrouter_api_key") || "";
    googleApiKey = localStorage.getItem("google_api_key") || "";
    elevenLabsKey = localStorage.getItem("elevenlabs_key") || "";
    model = localStorage.getItem("model") || "anthropic/claude-3-opus";
    customModelId = localStorage.getItem("custom_model_id") || "";
    
    // UI настройки
    helpInfosVisible = localStorage.getItem("show_help_infos") === "true";
    currentLanguage = localStorage.getItem("interface_language") || "en";
    ttsProvider = localStorage.getItem("tts_provider") || "browser";
    useBrowserSTT = localStorage.getItem("use_browser_stt") !== "false";
    
    // Сохраненные промпты
    const savedInitialPrompt = localStorage.getItem("initial_prompt");
    const savedReactionPrompt = localStorage.getItem("reaction_prompt");
    
    // Применение сохраненных настроек к DOM
    // Используем реальные ID элементов из HTML
    const apiKeyElement = document.getElementById('apiKey');
    if (apiKeyElement) apiKeyElement.value = apiKey;
    
    const googleApiKeyElement = document.getElementById('googleApiKey');
    if (googleApiKeyElement) googleApiKeyElement.value = googleApiKey;
    
    const elevenLabsKeyElement = document.getElementById('elevenLabsKey');
    if (elevenLabsKeyElement) elevenLabsKeyElement.value = elevenLabsKey;
    
    const elevenLabsVoiceElement = document.getElementById('elevenLabsVoice');
    if (elevenLabsVoiceElement) elevenLabsVoiceElement.value = localStorage.getItem("elevenlabs_voice") || "";
    
    const googleVoiceNameElement = document.getElementById('googleVoiceName');
    if (googleVoiceNameElement) googleVoiceNameElement.value = localStorage.getItem("google_voice_name") || "";
    
    const showHelpInfosElement = document.getElementById('showHelpInfos');
    if (showHelpInfosElement) showHelpInfosElement.checked = helpInfosVisible;
    
    const languageSelectElement = document.getElementById('languageSelect');
    if (languageSelectElement) languageSelectElement.value = currentLanguage;
    
    const ttsProviderElement = document.getElementById('ttsProvider');
    if (ttsProviderElement) ttsProviderElement.value = ttsProvider;
    
    const useBrowserSTTElement = document.getElementById('useBrowserSTT');
    if (useBrowserSTTElement) useBrowserSTTElement.checked = useBrowserSTT;
    
    const initialPromptElement = document.getElementById('initialPrompt');
    if (initialPromptElement && savedInitialPrompt) initialPromptElement.value = savedInitialPrompt;
    
    const reactionPromptElement = document.getElementById('reactionPrompt');
    if (reactionPromptElement && savedReactionPrompt) reactionPromptElement.value = savedReactionPrompt;
    
    const modelSelectElement = document.getElementById('modelSelect');
    if (modelSelectElement) modelSelectElement.value = model;
    
    const autoStartTimeElement = document.getElementById('autoStartTime');
    if (autoStartTimeElement) autoStartTimeElement.value = localStorage.getItem("auto_start_time") || "08:00";
    
    // Добавляем элементы в кэш DOM, если они отсутствуют
    if (window.DOM) {
        window.DOM.apiKey = apiKeyElement;
        window.DOM.googleApiKey = googleApiKeyElement;
        window.DOM.elevenLabsKey = elevenLabsKeyElement;
        window.DOM.elevenLabsVoice = elevenLabsVoiceElement;
        window.DOM.googleVoiceName = googleVoiceNameElement;
        window.DOM.showHelpInfos = showHelpInfosElement;
        window.DOM.languageSelect = languageSelectElement;
        window.DOM.ttsProvider = ttsProviderElement;
        window.DOM.useBrowserSTT = useBrowserSTTElement;
        window.DOM.initialPrompt = initialPromptElement;
        window.DOM.reactionPrompt = reactionPromptElement;
        window.DOM.modelSelect = modelSelectElement;
        window.DOM.autoStartTime = autoStartTimeElement;
    }
    
    // Обновление видимости настроек TTS-провайдера
    updateTTSProviderVisibility();
    
    // Обновление информации о модели
    API.updateModelInfo();
    
    UI.debugLog("Settings loaded from localStorage");
}

// Обновление видимости настроек TTS-провайдера
function updateTTSProviderVisibility() {
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

// Получение перевода по ключу
function getTranslation(key) {
    // Используем глобальный объект window.App вместо локальной переменной
    const lang = window.App.currentLanguage;
    const languageData = translations[lang] || translations.en;
    return languageData[key] || translations.en[key] || key;
}

// ФУНКЦИИ УПРАВЛЕНИЯ ИГРОЙ

// Начало новой игры
async function startGame() {
    if (gameActive || isProcessing) return;
    
    UI.debugLog("Starting new game...");
    
    fullStory = "";
    currentHint = "";
    lastComment = "";
    lastUserInput = "";
    userContributions = [];
    
    // Синхронизируем локальные и глобальные переменные
    gameActive = true;
    window.App.gameActive = true;
    
    // Синхронизируем остальные переменные
    window.App.fullStory = fullStory;
    window.App.currentHint = currentHint;
    window.App.lastComment = lastComment;
    window.App.lastUserInput = lastUserInput;
    window.App.userContributions = userContributions;
    
    UI.updateUIState();
    
    // Получение начального ответа от бота
    const botData = await API.fetchBotStart();
    
    if (botData) {
        fullStory = botData.integratedStory || botData.story;
        // Очищаем текст истории от служебных сообщений и JSON-разметки
        fullStory = cleanStoryText(fullStory);
        // Извлекаем объект подсказки из JSON или используем имеющийся объект
        currentHint = extractHint(botData.hint || fullStory);
        lastComment = botData.comment;
        
        // Обновление UI элементов с проверкой на существование
        if (DOM.storyTextDiv) DOM.storyTextDiv.textContent = fullStory;
        else console.warn('storyTextDiv not found, unable to update content');
        
        if (DOM.ironicTextDiv) DOM.ironicTextDiv.textContent = lastComment;
        else console.warn('ironicTextDiv not found, unable to update content');
        
        if (DOM.lastUserTextDiv) DOM.lastUserTextDiv.textContent = "";
        else console.warn('lastUserTextDiv not found, unable to update content');
        
        // Обновление подсказки с форматированием
        formatAndDisplayHint();
        
        UI.updateHelpInfosContent();
        UI.debugLog("Game started.");
        
        // Озвучивание истории и подсказки
        UI.setSpeakingStatus(true);
        try {
            const storyLang = (DOM.themeSelect.value === 'german-a2') ? 'de' : currentLanguage;
            await Speech.speakText(fullStory, storyLang);
            if (window.App.isSpeaking) await new Promise(r => setTimeout(r, 300));
            if (window.App.isSpeaking) await Speech.speakText(currentHint, storyLang);
        } catch (ttsError) {
            if (ttsError !== "Cancelled") {
                UI.debugLog(`TTS sequence error: ${ttsError}`);
                alert("Speech error.");
            } else {
                UI.debugLog("TTS sequence cancelled by user.");
            }
        } finally {
            UI.setSpeakingStatus(false);
        }
    } else {
        gameActive = false;
        UI.updateUIState();
        UI.debugLog("Failed to start game.");
    }
}

// Перезапуск игры
async function restartGame() {
    if (!gameActive || isProcessing) return;
    
    // Останавливаем текущую игру
    gameActive = false;
    window.App.gameActive = false;
    UI.updateUIState();
    
    // Небольшая пауза перед новым запуском
    await new Promise(r => setTimeout(r, 500));
    
    // Запускаем новую игру
    startGame();
}

// Остановка текущей игры
function stopGame() {
    if (!gameActive) return;
    
    // Останавливаем озвучивание и запись, если активны
    try { stopRecording(); } catch(e) {}
    try { stopSpeaking(); } catch(e) {}
    
    gameActive = false;
    window.App.gameActive = false;
    UI.updateUIState();
    
    // Сбрасываем состояние игры
    fullStory = "";
    currentHint = "";
    lastComment = "";
    lastUserInput = "";
    
    // Синхронизируем глобальные переменные
    window.App.fullStory = fullStory;
    window.App.currentHint = currentHint;
    window.App.lastComment = lastComment;
    window.App.lastUserInput = lastUserInput;
    
    // Очищаем интерфейс
    DOM.storyTextDiv.textContent = "";
    DOM.ironicTextDiv.textContent = "";
    DOM.lastUserTextDiv.textContent = "";
    DOM.hintTextDiv.textContent = "";
}

// Обработка ввода пользователя
async function processUserInput(transcript) {
    if (!gameActive) {
        UI.debugLog("processUserInput skipped: inactive.");
        return;
    }
    
    lastUserInput = transcript;
    DOM.lastUserTextDiv.textContent = transcript;
    UI.debugLog(`User contribution processed: "${transcript}"`);
    
    try {
        // Добавление вклада пользователя
        userContributions.push(transcript);
        
        // Получение реакции от бота
        const botData = await API.fetchBotReaction(fullStory, transcript);
        
        if (botData) {
            fullStory = botData.integratedStory;
            // Очищаем текст истории от служебных сообщений и JSON-разметки
            fullStory = cleanStoryText(fullStory);
            // Извлекаем объект подсказки из JSON или используем имеющийся объект
            currentHint = extractHint(botData.hint || fullStory);
            lastComment = botData.comment;
            
            // Обновление UI элементов
            DOM.storyTextDiv.textContent = fullStory;
            DOM.ironicTextDiv.textContent = lastComment;
            
            // Обновление и форматирование подсказки
            formatAndDisplayHint();
            
            // Обновление содержимого справки
            UI.updateHelpInfosContent();
            UI.debugLog("Bot reaction processed.");
            
            // Озвучивание комментария, истории и подсказки
            UI.setSpeakingStatus(true);
            try {
                const storyLang = (DOM.themeSelect.value === 'german-a2') ? 'de' : currentLanguage;
                await Speech.speakText(lastComment, currentLanguage); // Комментарий на языке интерфейса
                if (window.App.isSpeaking) await new Promise(r => setTimeout(r, 300));
                if (window.App.isSpeaking) await Speech.speakText(fullStory, storyLang); // История на выбранном языке
                if (window.App.isSpeaking) await new Promise(r => setTimeout(r, 300));
                if (window.App.isSpeaking) await Speech.speakText(currentHint, storyLang); // Подсказка на выбранном языке
            } catch (ttsError) {
                if (ttsError !== "Cancelled") {
                    UI.debugLog(`TTS sequence error: ${ttsError}`);
                    alert("Speech error.");
                } else {
                    UI.debugLog("TTS sequence cancelled by user.");
                }
            } finally {
                UI.setSpeakingStatus(false);
            }
            
            UI.debugLog("User input processing & TTS sequence finished.");
        } else {
            DOM.ironicTextDiv.textContent = "Error processing response.";
            DOM.hintTextDiv.textContent = "";
            UI.debugLog("Processing failed: botData null.");
        }
    } catch (error) {
        UI.debugLog(`processUserInput Error: ${error}`);
        alert("Error processing input.");
        DOM.ironicTextDiv.textContent = "Error.";
        DOM.hintTextDiv.textContent = "";
        UI.setSpeakingStatus(false);
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
}

// Авто-запуск игры по таймеру
setInterval(() => {
    const now = new Date();
    const autoStartTime = DOM.autoStartTimeInput?.value || "08:00";
    const [h, m] = autoStartTime.split(":").map(Number);
    
    if (!isNaN(h) && !isNaN(m) && 
        now.getHours() === h && 
        now.getMinutes() === m && 
        !gameActive && !isProcessing && !isSpeaking) {
        UI.debugLog(`Auto-Start Time (${autoStartTime}) reached.`);
        startGame();
    }
}, 60000);

// Функция для очистки текста истории от служебных сообщений и JSON-разметки
function cleanStoryText(text) {
    if (!text) return "";
    
    // Удаляем любые служебные сообщения о JSON формате (более гибкое регулярное выражение)
    text = text.replace(/Here is the story with(?: a)?(?: continuation)? hint in \w+, in the requested JSON format:?/g, "");
    
    // Если весь текст - это JSON объект
    if (text.trim().startsWith('{') && text.trim().endsWith('}')) {
        try {
            // Пытаемся разобрать JSON
            const json = JSON.parse(text.trim());
            if (json && json.story) {
                // Если удалось успешно разобрать JSON, возвращаем только текст истории
                return json.story;
            } else if (json && json.integratedStory) {
                // Если имеется integratedStory, используем ее
                return json.integratedStory;
            }
        } catch (e) {
            UI.debugLog(`Failed to parse JSON object: ${e.message}`);
        }
    }
    
    // Если текст содержит необработанный JSON (с кавычками)
    if (text.includes('"story":') || text.includes('"integratedStory":')) {
        try {
            // Пытаемся извлечь текст истории из JSON строки
            let storyMatch = text.match(/"story"\s*:\s*"([^"]*(?:\\"[^"]*)*)"/m);
            if (!storyMatch) {
                storyMatch = text.match(/"integratedStory"\s*:\s*"([^"]*(?:\\"[^"]*)*)"/m);
            }
            
            if (storyMatch && storyMatch[1]) {
                // Возвращаем только текст истории, декодируя экранированные символы
                return storyMatch[1].replace(/\\n/g, '\n').replace(/\\r/g, '').replace(/\\"/g, '"').replace(/\\'/g, "'");
            }
        } catch (e) {
            UI.debugLog(`Error extracting story from JSON string: ${e.message}`);
        }
    }
    
    return text.trim();
}

// Функция для извлечения объекта подсказки из JSON или текста
function extractHint(source) {
    if (!source) return "";
    
    // Если источник - строка, проверяем, не JSON ли это
    if (typeof source === 'string') {
        const trimmed = source.trim();
        
        // Если это похоже на JSON
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            try {
                const json = JSON.parse(trimmed);
                // Проверяем различные варианты структуры JSON
                if (json.hint) {
                    return json.hint;
                } else if (json.integratedStory && json.hint) {
                    return json.hint;
                }
            } catch (e) {
                UI.debugLog(`Failed to parse hint JSON: ${e.message}`);
            }
        }
        
        // Пытаемся извлечь подсказку с помощью регулярных выражений
        try {
            const hintMatch = source.match(/"hint"\s*:\s*(\{[^}]*})/m);
            if (hintMatch && hintMatch[1]) {
                const hintStr = '{' + hintMatch[1].replace(/\\n/g, '\n').replace(/\\r/g, '').replace(/\\"/g, '"') + '}';
                try {
                    return JSON.parse(hintStr);
                } catch (jsonErr) {
                    UI.debugLog(`Failed to parse extracted hint: ${jsonErr.message}`);
                }
            }
        } catch (e) {
            UI.debugLog(`Error extracting hint with regex: ${e.message}`);
        }
    } else if (typeof source === 'object') {
        // Если источник - объект, проверяем его структуру
        if (source.hint) {
            return source.hint;
        }
    }
    
    // Если не удалось извлечь подсказку, возвращаем исходный источник
    return source;
}

// Экспортируем глобальные функции для доступа из HTML и другими модулями
window.App.startGame = startGame;
window.App.restartGame = restartGame;
window.App.stopGame = stopGame;
window.App.game = {
    fetchInitialStory: (model, language, theme) => {
        // Use the existing fetchBotStart function which already implements the initial story generation
        return API.fetchBotStart()
            .then(response => {
                // Return the raw API response for handleApiResponseContent to process
                return {
                    choices: [{
                        message: {
                            content: JSON.stringify(response)
                        }
                    }]
                };
            })
            .catch(error => {
                console.error("Error fetching initial story:", error);
                throw error;
            });
    },
    fetchContinuation: (userInput, model, language, theme) => {
        // Use the existing fetchBotReaction function which already implements story continuation
        return API.fetchBotReaction(window.App.fullStory || '', userInput)
            .then(response => {
                // Return the raw API response for handleApiResponseContent to process
                return {
                    choices: [{
                        message: {
                            content: JSON.stringify(response)
                        }
                    }]
                };
            })
            .catch(error => {
                console.error("Error fetching continuation:", error);
                throw error;
            });
    }
};

// Maintain backward compatibility with any code that might use the global functions
window.initializeApp = initializeApp;
window.getTranslation = getTranslation;
window.loadSavedSettings = loadSavedSettings;
window.extractHint = extractHint;
