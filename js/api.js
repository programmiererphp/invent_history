/**
 * api.js - Модуль для работы с API сервисов генерации текста
 * Отвечает за все взаимодействия с внешними API
 */

// Настройки API
let apiKey = localStorage.getItem("openrouter_api_key") || "";
let googleApiKey = localStorage.getItem("google_api_key") || "";
let elevenLabsKey = localStorage.getItem("elevenlabs_key") || "";
let model = localStorage.getItem("model") || "anthropic/claude-3-opus";
let customModelId = localStorage.getItem("custom_model_id") || "";

// Резервные модели (в порядке предпочтения)
const backupModels = [
    "anthropic/claude-3-opus",
    "anthropic/claude-3-sonnet",
    "google/gemini-1.5-pro",
    "google/gemini-pro",
    "anthropic/claude-3-haiku",
    "anthropic/claude-2",
    "openai/gpt-4-turbo",
    "openai/gpt-4",
    "openai/gpt-3.5-turbo"
];

// Получение информации о выбранной модели
function updateModelInfo() {
    if (!apiKey) {
        UI.debugLog("API key is not set. Using default model.");
        return;
    }
    
    // Если используется пользовательская модель
    if (model.startsWith("custom:")) {
        UI.debugLog(`Using custom model ID: ${customModelId}`);
        return;
    }
    
    UI.debugLog(`Model set to: ${model}`);
}

// Функция для получения начального ответа от бота
async function fetchBotStart(retryCount = 0) {
    if (!apiKey) {
        alert(getTranslation('apiKeyRequired'));
        UI.openModal("settingsModal");
        return null;
    }

    UI.setProcessingStatus(true);
    try {
        let p = DOM.initialPromptInput?.value || localStorage.getItem("initial_prompt") || defaultPrompts.initial; 
        // Always use window.App.currentLanguage to ensure consistency across the application
        const lN = languageNameMap[window.App.currentLanguage] || 'English'; 
        p += `\nGenerate the response in ${lN}.`; 
        
        UI.debugLog(`Fetching initial story using model: ${model}...`);
        
        // Подготовка запроса к OpenRouter API
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': window.location.href,
                'X-Title': 'Geschichte Erfinden'
            },
            body: JSON.stringify({
                model: model.startsWith("custom:") ? customModelId : model,
                messages: [
                    {
                        role: "user",
                        content: p
                    }
                ],
                temperature: 0.7,
                max_tokens: 1024
            }),
            // Добавляем таймаут для запроса
            signal: AbortSignal.timeout(40000) // 40 секунд таймаут
        });

        if (!response.ok) {
            const errorData = await response.json();
            UI.debugLog(`API Error: ${JSON.stringify(errorData)}`);
            
            // Обработка ошибки rate limit
            if (response.status === 429 || (errorData.error && errorData.error.includes("rate limit"))) {
                UI.debugLog("Rate limit reached. Trying with a different model...");
                
                // Переход на резервную модель
                if (retryCount < backupModels.length) {
                    const backupModel = backupModels[retryCount];
                    UI.debugLog(`Switching to backup model: ${backupModel}`);
                    model = backupModel;
                    
                    // Обновляем UI
                    const modelSelect = document.getElementById('modelSelect');
                    if (modelSelect) modelSelect.value = backupModel;
                    
                    // Повторяем запрос с новой моделью
                    return await fetchBotStart(retryCount + 1);
                }
            }
            
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        UI.debugLog("Response received from API.");
        UI.debugLog(`API Response structure: ${JSON.stringify(data).substring(0, 200)}...`);
        
        // Проверяем на ошибки rate limit и другие ошибки
        if (data.error) {
            // Проверяем на rate limit для автоматического переключения модели
            const errorMsg = data.error.message || data.error.toString();
            const rawError = data.error.metadata?.raw || errorMsg;
            
            UI.debugLog(`API Error: ${rawError}`);
            
            // Проверяем на ошибку rate limit
            if (data.error.code === 429 || rawError.includes('rate-limit') || rawError.includes('rate limit')) {
                UI.debugLog("Rate limit reached. Trying with another model...");
                
                // Переключаемся на альтернативную модель
                if (model === "google/gemini-2.0-flash-exp:free") {
                    model = "deepseek/deepseek-chat-v3-0324:free";
                    UI.debugLog(`Switching to model: ${model}`);
                } else {
                    model = "google/gemini-2.0-flash-exp:free";
                    UI.debugLog(`Switching to model: ${model}`);
                }
                
                // Обновляем UI
                const modelSelect = document.getElementById('modelSelect');
                if (modelSelect) modelSelect.value = model;
                
                // Повторяем запрос с новой моделью
                return await fetchBotStart(retryCount + 1);
            }
            
            // Если не rate limit, то другая ошибка
            throw new Error(rawError);
        }
        
        UI.debugLog("Initial story received successfully.");
        
        // Обрабатываем разные форматы ответов от разных моделей
        let responseText = "";
        
        // Формат OpenAI, Claude и большинства моделей
        if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
            responseText = data.choices[0].message.content.trim();
        }
        // Формат Gemini
        else if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
            const parts = data.candidates[0].content.parts;
            for (const part of parts) {
                if (part.text) {
                    responseText += part.text;
                }
            }
            responseText = responseText.trim();
        }
        // Другие форматы
        else if (data.response) {
            responseText = data.response.trim();
        }
        // Если не смогли найти данные в известных форматах
        else {
            UI.debugLog(`Unknown API response format: ${JSON.stringify(data)}`);
            // Пытаемся получить хоть какой-то текст
            responseText = JSON.stringify(data);
        }
        
        if (!responseText) {
            throw new Error("Could not extract response text from API response");
        }
        
        // Удаляем маркеры json if any
        responseText = responseText.replace(/```json|```/g, '');
        
        try {
            // Попытка разобрать JSON
            const botObject = JSON.parse(responseText);
            
            // Проверка структуры
            if (!botObject.story) {
                throw new Error("Response missing 'story' field.");
            }
            
            UI.debugLog("Bot response parsed successfully.");
            return {
                integratedStory: botObject.story,
                hint: formatHint(botObject.hint),
                comment: botObject.comment || getTranslation('defaultComment')
            };
        } catch (parseError) {
            // Если JSON разбор не удался, но формат ответа похож на JSON
            if (responseText.includes('"story":') && responseText.includes('"hint":')) {
                UI.debugLog("Response looks like JSON but failed to parse. Attempting manual extraction...");
                
                // Попытка извлечь данные вручную
                const storyMatch = responseText.match(/"story"\s*:\s*"([^"]*)"/);
                const hintMatch = responseText.match(/"hint"\s*:\s*"([^"]*)"/);
                const commentMatch = responseText.match(/"comment"\s*:\s*"([^"]*)"/);
                
                if (storyMatch && hintMatch) {
                    return {
                        integratedStory: storyMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
                        hint: formatHint(hintMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"')),
                        comment: commentMatch ? commentMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : getTranslation('defaultComment')
                    };
                }
            }
            
            // Если не удалось распарсить как JSON, пробуем другой формат
            UI.debugLog("Failed to parse JSON response, treating as plain text.");
            
            // Делим текст на части: история, подсказка, комментарий
            const parts = responseText.split('\n\n');
            
            return {
                integratedStory: parts[0] || responseText,
                hint: formatHint(parts[1] || getTranslation('defaultHint')),
                comment: parts[2] || getTranslation('defaultComment')
            };
        }
    } catch (error) {
        UI.debugLog(`fetchBotStart Error: ${error.message}`);
        
        // Для ошибок таймаута или сети - повторяем запрос с задержкой
        if (error.name === 'AbortError' || error.message.includes('network') || error.message.includes('fetch')) {
            if (retryCount < 3) { // максимум 3 повторных попытки
                const delay = 1000 * (retryCount + 1); // увеличиваем задержку с каждой попыткой
                UI.debugLog(`Retrying after ${delay/1000} seconds...`);
                await new Promise(r => setTimeout(r, delay));
                return await fetchBotStart(retryCount + 1);
            }
        }
        
        // Для ошибок связанных с rate limit - пробуем другую модель
        if (error.message.includes('429') || error.message.includes('rate limit')) {
            if (retryCount < backupModels.length) {
                const backupModel = backupModels[retryCount];
                UI.debugLog(`Rate limit reached. Switching to backup model: ${backupModel}`);
                model = backupModel;
                
                // Обновляем UI
                const modelSelect = document.getElementById('modelSelect');
                if (modelSelect) modelSelect.value = backupModel;
                
                return await fetchBotStart(retryCount + 1);
            }
        }
        
        alert(getTranslation('apiError') + error.message);
        return null;
    } finally {
        UI.setProcessingStatus(false);
    }
}

// Функция для получения реакции бота на ввод пользователя
async function fetchBotReaction(story, userInput, retryCount = 0) {
    if (!apiKey) {
        alert(getTranslation('apiKeyRequired'));
        UI.openModal("settingsModal");
        return null;
    }

    UI.setProcessingStatus(true);
    try {
        let p = DOM.reactionPromptInput?.value || localStorage.getItem("reaction_prompt") || defaultPrompts.reaction;
        p = p.replace("{currentStory}", story).replace("{userInput}", userInput);
        
        // Always use window.App.currentLanguage to ensure consistency across the application
        const lN = languageNameMap[window.App.currentLanguage] || 'English';
        p += `\nGenerate the response in ${lN}.`;
        
        UI.debugLog(`Fetching bot reaction using model: ${model}...`);
        
        // Подготовка запроса к OpenRouter API
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': window.location.href,
                'X-Title': 'Geschichte Erfinden'
            },
            body: JSON.stringify({
                model: model.startsWith("custom:") ? customModelId : model,
                messages: [
                    {
                        role: "user",
                        content: p
                    }
                ],
                temperature: 0.7,
                max_tokens: 1024
            }),
            // Добавляем таймаут для запроса
            signal: AbortSignal.timeout(40000) // 40 секунд таймаут
        });

        if (!response.ok) {
            const errorData = await response.json();
            UI.debugLog(`API Error: ${JSON.stringify(errorData)}`);
            
            // Обработка ошибки rate limit
            if (response.status === 429 || (errorData.error && errorData.error.includes("rate limit"))) {
                UI.debugLog("Rate limit reached. Trying with a different model...");
                
                // Переход на резервную модель
                if (retryCount < backupModels.length) {
                    const backupModel = backupModels[retryCount];
                    UI.debugLog(`Switching to backup model: ${backupModel}`);
                    model = backupModel;
                    
                    // Обновляем UI
                    const modelSelect = document.getElementById('modelSelect');
                    if (modelSelect) modelSelect.value = backupModel;
                    
                    // Повторяем запрос с новой моделью
                    return await fetchBotReaction(story, userInput, retryCount + 1);
                }
            }
            
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        UI.debugLog("Response received from API.");
        UI.debugLog(`API Response structure: ${JSON.stringify(data).substring(0, 200)}...`);
        
        // Проверяем на ошибки rate limit и другие ошибки
        if (data.error) {
            // Проверяем на rate limit для автоматического переключения модели
            const errorMsg = data.error.message || data.error.toString();
            const rawError = data.error.metadata?.raw || errorMsg;
            
            UI.debugLog(`API Error: ${rawError}`);
            
            // Проверяем на ошибку rate limit
            if (data.error.code === 429 || rawError.includes('rate-limit') || rawError.includes('rate limit')) {
                UI.debugLog("Rate limit reached. Trying with another model...");
                
                // Переключаемся на альтернативную модель
                if (model === "google/gemini-2.0-flash-exp:free") {
                    model = "deepseek/deepseek-chat-v3-0324:free";
                    UI.debugLog(`Switching to model: ${model}`);
                } else {
                    model = "google/gemini-2.0-flash-exp:free";
                    UI.debugLog(`Switching to model: ${model}`);
                }
                
                // Обновляем UI
                const modelSelect = document.getElementById('modelSelect');
                if (modelSelect) modelSelect.value = model;
                
                // Повторяем запрос с новой моделью
                return await fetchBotReaction(story, userInput, retryCount + 1);
            }
            
            // Если не rate limit, то другая ошибка
            throw new Error(rawError);
        }
        
        UI.debugLog("Bot reaction received successfully.");
        
        // Обрабатываем разные форматы ответов от разных моделей
        let responseText = "";
        
        // Формат OpenAI, Claude и большинства моделей
        if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
            responseText = data.choices[0].message.content.trim();
        }
        // Формат Gemini
        else if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
            const parts = data.candidates[0].content.parts;
            for (const part of parts) {
                if (part.text) {
                    responseText += part.text;
                }
            }
            responseText = responseText.trim();
        }
        // Другие форматы
        else if (data.response) {
            responseText = data.response.trim();
        }
        // Если не смогли найти данные в известных форматах
        else {
            UI.debugLog(`Unknown API response format: ${JSON.stringify(data)}`);
            // Пытаемся получить хоть какой-то текст
            responseText = JSON.stringify(data);
        }
        
        if (!responseText) {
            throw new Error("Could not extract response text from API response");
        }
        
        // Удаляем маркеры json if any
        responseText = responseText.replace(/```json|```/g, '');
        
        try {
            // Попытка разобрать JSON
            const botObject = JSON.parse(responseText);
            
            // Проверка структуры
            if (!botObject.integratedStory) {
                throw new Error("Response missing 'integratedStory' field.");
            }
            
            UI.debugLog("Bot response parsed successfully.");
            return {
                integratedStory: botObject.integratedStory,
                hint: formatHint(botObject.hint),
                comment: botObject.comment || getTranslation('defaultComment')
            };
        } catch (parseError) {
            // Если JSON разбор не удался, но формат ответа похож на JSON
            if (responseText.includes('"integratedStory":') && responseText.includes('"hint":')) {
                UI.debugLog("Response looks like JSON but failed to parse. Attempting manual extraction...");
                
                // Попытка извлечь данные вручную
                const storyMatch = responseText.match(/"integratedStory"\s*:\s*"([^"]*)"/);
                const hintMatch = responseText.match(/"hint"\s*:\s*"([^"]*)"/);
                const commentMatch = responseText.match(/"comment"\s*:\s*"([^"]*)"/);
                
                if (storyMatch && hintMatch) {
                    return {
                        integratedStory: storyMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
                        hint: formatHint(hintMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"')),
                        comment: commentMatch ? commentMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : getTranslation('defaultComment')
                    };
                }
            }
            
            // Если не удалось распарсить как JSON, пробуем другой формат
            UI.debugLog("Failed to parse JSON response, treating as plain text.");
            
            // Делим текст на части: история, подсказка, комментарий
            const parts = responseText.split('\n\n');
            
            return {
                integratedStory: parts[0] || responseText,
                hint: formatHint(parts[1] || getTranslation('defaultHint')),
                comment: parts[2] || getTranslation('defaultComment')
            };
        }
    } catch (error) {
        UI.debugLog(`fetchBotReaction Error: ${error.message}`);
        
        // Для ошибок таймаута или сети - повторяем запрос с задержкой
        if (error.name === 'AbortError' || error.message.includes('network') || error.message.includes('fetch')) {
            if (retryCount < 3) { // максимум 3 повторных попытки
                const delay = 1000 * (retryCount + 1); // увеличиваем задержку с каждой попыткой
                UI.debugLog(`Retrying after ${delay/1000} seconds...`);
                await new Promise(r => setTimeout(r, delay));
                return await fetchBotReaction(story, userInput, retryCount + 1);
            }
        }
        
        // Для ошибок связанных с rate limit - пробуем другую модель
        if (error.message.includes('429') || error.message.includes('rate limit')) {
            if (retryCount < backupModels.length) {
                const backupModel = backupModels[retryCount];
                UI.debugLog(`Rate limit reached. Switching to backup model: ${backupModel}`);
                model = backupModel;
                
                // Обновляем UI
                const modelSelect = document.getElementById('modelSelect');
                if (modelSelect) modelSelect.value = backupModel;
                
                return await fetchBotReaction(story, userInput, retryCount + 1);
            }
        }
        
        alert(getTranslation('apiError') + error.message);
        return null;
    } finally {
        UI.setProcessingStatus(false);
    }
}

// Функция для форматирования подсказки
function formatHint(hint) {
    // Если подсказка уже является объектом с вопросом и вариантами, возвращаем как есть
    if (typeof hint === 'object' && hint !== null && hint.question && Array.isArray(hint.options)) {
        return hint;
    }
    
    // Если подсказка - строка, но содержит JSON-объект
    if (typeof hint === 'string' && (hint.startsWith('{') || hint.startsWith('[')) && (hint.endsWith('}') || hint.endsWith(']'))) {
        try {
            const parsedHint = JSON.parse(hint);
            if (parsedHint.question && Array.isArray(parsedHint.options)) {
                return parsedHint;
            }
        } catch (e) {
            // Если не удалось распарсить, возвращаем как текст
            UI.debugLog(`Failed to parse hint as JSON: ${e.message}`);
        }
    }
    
    // Если подсказка - строка в формате "вопрос? 1. опция1, 2. опция2..."
    if (typeof hint === 'string' && hint.includes('?') && /\d+\./.test(hint)) {
        const parts = hint.split('?');
        if (parts.length >= 2) {
            const question = parts[0].trim() + '?';
            const optionsText = parts.slice(1).join('?').trim();
            const options = optionsText.split(/\d+\./).filter(o => o.trim().length > 0).map(o => o.trim());
            
            return { question, options };
        }
    }
    
    // Возвращаем как обычный текст
    return hint;
}

// Функция для генерации стандартного контента при пустом ответе API
function generateDefaultContent(language) {
    // Определяем язык для контента
    const lang = language || window.App.currentLanguage || 'en';
    
    // Содержимое на разных языках
    const content = {
        en: {
            story: "Once upon a time in a quaint little village, there lived a curious child named Alex. With bright eyes and an even brighter imagination, Alex was known for asking questions about everything and everyone.",
            hint: {
                question: "What adventure might Alex embark on today?",
                options: [
                    "Discover a hidden door in the old oak tree",
                    "Meet a mysterious stranger with an unusual request",
                    "Find a map that shows the way to a forgotten treasure"
                ]
            },
            comment: "Let's see where your creativity takes this story!"
        },
        de: {
            story: "Es war einmal in einem malerischen kleinen Dorf, dort lebte ein neugieriges Kind namens Alex. Mit leuchtenden Augen und einer noch leuchtenderen Fantasie war Alex dafür bekannt, Fragen über alles und jeden zu stellen.",
            hint: {
                question: "Welches Abenteuer könnte Alex heute erleben?",
                options: [
                    "Entdecke eine versteckte Tür im alten Eichenbaum",
                    "Triff einen mysteriösen Fremden mit einer ungewöhnlichen Bitte",
                    "Finde eine Karte, die den Weg zu einem vergessenen Schatz zeigt"
                ]
            },
            comment: "Lass uns sehen, wohin deine Kreativität diese Geschichte führt!"
        },
        ru: {
            story: "Однажды в живописной маленькой деревне жил любознательный ребенок по имени Алекс. С яркими глазами и еще более яркой фантазией, Алекс был известен тем, что задавал вопросы обо всем на свете.",
            hint: {
                question: "Какое приключение может ожидать Алекса сегодня?",
                options: [
                    "Обнаружить потайную дверь в старом дубе",
                    "Встретить загадочного незнакомца с необычной просьбой",
                    "Найти карту, которая указывает путь к забытому сокровищу"
                ]
            },
            comment: "Давайте посмотрим, куда приведет эту историю твоя фантазия!"
        }
    };
    
    // Возвращаем контент для запрошенного языка или английский по умолчанию
    return content[lang] || content['en'];
}

// Экспорт функций для использования в других модулях
window.API = {
    updateModelInfo,
    fetchBotStart,
    fetchBotReaction,
    formatHint,
    generateDefaultContent
};
