/**
 * speech.js - Модуль для работы с распознаванием и синтезом речи
 * Отвечает за взаимодействие с Web Speech API и внешними сервисами TTS
 */

// Настройки речи
let ttsProvider = localStorage.getItem("tts_provider") || "browser";
let useBrowserSTT = localStorage.getItem("use_browser_stt") !== "false" ? true : false; // Явно конвертируем в boolean
// Используем только глобальную переменную window.App.isRecording
let recognition = null;
let utterance = null;
let currentAudioElement = null; // Для внешних TTS провайдеров

// Обновление отображения конфигурации речи
function updateSpeechConfigDisplay() {
    const speechConfigElement = document.getElementById('speechConfigStatus');
    if (speechConfigElement) {
        let sttProvider = useBrowserSTT ? "Browser SpeechRecognition" : "Disabled";
        let ttsProviderName = "Browser SpeechSynthesis";
        
        if (ttsProvider === "elevenlabs") {
            ttsProviderName = "ElevenLabs";
        } else if (ttsProvider === "google") {
            ttsProviderName = "Google Cloud TTS";
        }
        
        speechConfigElement.innerHTML = `
            <i class="fas fa-microphone me-1"></i> STT: ${sttProvider} | 
            <i class="fas fa-volume-up me-1"></i> TTS: ${ttsProviderName}
        `;
    }
}

// Инициализация распознавания речи
function initSpeechRecognition() {
    try {
        // Обновляем отображение конфигурации речи
        updateSpeechConfigDisplay();
        
        // Если браузерное распознавание отключено, просто выходим
        if (!useBrowserSTT) {
            UI.debugLog("Browser STT is disabled. Speech recognition not initialized.");
            return false;
        }
        
        // Создаем экземпляр распознавания речи
        window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!window.SpeechRecognition) {
            throw new Error("Speech Recognition API not supported in this browser.");
        }
        
        recognition = new SpeechRecognition();
        
        // Настройка распознавания
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = currentLanguage;
        
        // Обработчик результатов распознавания
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            UI.debugLog(`Speech recognized: "${transcript}"`);
            processUserInput(transcript);
        };
        
        // Обработчики ошибок и завершения
        recognition.onerror = (event) => {
            UI.debugLog(`Speech recognition error: ${event.error}`);
            stopRecording();
            alert(getTranslation('speechRecognitionError'));
        };
        
        recognition.onend = () => {
            window.App.isRecording = false;
            UI.updateUIState();
            UI.debugLog("Speech recognition ended.");
        };
        
        UI.debugLog("Speech recognition initialized using Web Speech API.");
        return true;
    } catch (error) {
        UI.debugLog(`Speech recognition init error: ${error.message}`);
        alert(getTranslation('speechRecognitionNotSupported'));
        return false;
    }
}

// Начало записи речи
function recordUserSpeech() {
    if (!window.App.gameActive) {
        alert(getTranslation('startGameFirst'));
        return;
    }
    
    if (window.App.isRecording) return;
    
    // Используем только браузерные возможности для распознавания речи
    if (!useBrowserSTT) {
        UI.debugLog("Browser STT is disabled. Enabling it.");
        useBrowserSTT = true;
        localStorage.setItem("use_browser_stt", "true");
        
        if (DOM.useBrowserSTTCheckbox) {
            DOM.useBrowserSTTCheckbox.checked = true;
        }
    }
    
    // Для встроенного распознавания речи браузера
    if (!recognition) {
        if (!initSpeechRecognition()) {
            alert("Speech recognition could not be initialized in your browser.");
            return;
        }
    }
    
    try {
        // Устанавливаем язык распознавания
        recognition.lang = window.App.currentLanguage;
        recognition.start();
        window.App.isRecording = true;
        // Обновляем UI после изменения состояния записи
        UI.updateUIState();
        UI.debugLog("Speech recording started using Web Speech API.");
    } catch (error) {
        UI.debugLog(`Start recording error: ${error.message}`);
        alert(getTranslation('speechRecognitionError'));
        window.App.isRecording = false;
        UI.updateUIState();
    }
}

// Остановка записи речи
function stopRecording() {
    if (window.App.isRecording && recognition) {
        try {
            recognition.stop();
            UI.debugLog("Speech recording stopped manually.");
        } catch (error) {
            UI.debugLog(`Stop recording error: ${error.message}`);
        }
        
        // Сбрасываем флаг записи и обновляем UI
        window.App.isRecording = false;
        // Обновляем состояние управляющих элементов
        UI.updateUIState();
    }
}

// Озвучивание текста
async function speakText(text, language = currentLanguage) {
    if (window.App.isSpeaking) { // Check global state
        stopSpeaking(); // This should call UI.setSpeakingStatus(false)
    }
    
    if (!text || text.trim() === '') {
        UI.debugLog("No text to speak.");
        return;
    }
    
    window.UI.setSpeakingStatus(true); // Set global state and update UI
    
    try {
        // Используем выбранный провайдер TTS
        switch (ttsProvider) {
            case 'elevenlabs':
                // Проверяем наличие ключа для ElevenLabs
                const elevenLabsKey = localStorage.getItem("elevenlabs_key") || "";
                if (!elevenLabsKey) {
                    UI.debugLog("No ElevenLabs API key. Falling back to browser TTS.");
                    await speakWithBrowserTTS(text, language);
                } else {
                    await speakWithElevenLabs(text);
                }
                break;
            case 'google':
                // Проверяем наличие ключа для Google TTS
                const googleApiKey = localStorage.getItem("google_api_key") || "";
                if (!googleApiKey) {
                    UI.debugLog("No Google API key. Falling back to browser TTS.");
                    await speakWithBrowserTTS(text, language);
                } else {
                    await speakWithGoogleTTS(text, language);
                }
                break;
            case 'browser':
            default:
                // Используем встроенное TTS браузера по умолчанию
                await speakWithBrowserTTS(text, language);
                break;
        }
    } catch (error) {
        UI.debugLog(`TTS error: ${error.message}`);
        if (error.name !== 'AbortError' && error.message !== 'Cancelled') { // Don't fallback if user cancelled
            UI.debugLog("Falling back to browser TTS due to error.");
            try {
                await speakWithBrowserTTS(text, language);
            } catch (fallbackError) {
                UI.debugLog(`Browser TTS fallback error: ${fallbackError.message}`);
                window.UI.setSpeakingStatus(false); // Ensure state is reset on final failure
            }
        } else {
            window.UI.setSpeakingStatus(false); // Ensure state is reset if cancelled
        }
    } finally {
        // Ensure isSpeaking is false if no specific error handling above reset it.
        // However, individual speakWith... functions should handle their own onend/onerror.
        // This is a final safeguard, but ideally not reached if helpers are correct.
        if (window.App.isSpeaking) {
             // UI.debugLog("TTS speakText finally block: resetting speaking status if still true.");
             // window.UI.setSpeakingStatus(false); // Re-evaluating if this is needed here or only in helpers
        }
    }
}

// Озвучивание с помощью встроенного в браузер TTS
async function speakWithBrowserTTS(text, language) {
    return new Promise((resolve, reject) => {
        if (utterance && speechSynthesis.speaking) {
            speechSynthesis.cancel();
        }
        
        utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language;
        
        const voices = speechSynthesis.getVoices();
        const selectedVoiceName = localStorage.getItem("browser_voice_name");
        if (selectedVoiceName) {
            const voice = voices.find(v => v.name === selectedVoiceName && v.lang.startsWith(language.split('-')[0]));
            if (voice) utterance.voice = voice;
        }
        
        utterance.onstart = () => {
            UI.debugLog("Browser TTS started.");
            // window.UI.setSpeakingStatus(true); // Already set by speakText
        };
        
        utterance.onend = () => {
            UI.debugLog("Browser TTS finished.");
            window.UI.setSpeakingStatus(false);
            resolve();
        };
        
        utterance.onerror = (event) => {
            UI.debugLog(`Browser TTS error: ${event.error}`);
            window.UI.setSpeakingStatus(false);
            reject(new Error(event.error));
        };
        
        speechSynthesis.speak(utterance);
    });
}

// Озвучивание с помощью ElevenLabs
async function speakWithElevenLabs(text) {
    const apiKey = localStorage.getItem("elevenlabs_key");
    const voiceId = localStorage.getItem("elevenlabs_voice_id") || '21m00Tcm4TlvDq8ikWAM'; // Default voice
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': apiKey
            },
            body: JSON.stringify({
                text: text,
                model_id: 'eleven_multilingual_v2', // Or other model
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`ElevenLabs API error: ${response.status} - ${errorData.detail ? errorData.detail.message : 'Unknown error'}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        if (currentAudioElement) {
            currentAudioElement.pause();
        }
        currentAudioElement = new Audio(audioUrl);
        await new Promise((resolve, reject) => {
            currentAudioElement.onended = () => {
                UI.debugLog("ElevenLabs TTS finished.");
                window.UI.setSpeakingStatus(false);
                resolve();
            };
            currentAudioElement.onerror = (e) => {
                UI.debugLog("ElevenLabs TTS error during playback.");
                window.UI.setSpeakingStatus(false);
                reject(new Error('ElevenLabs audio playback error'));
            };
            currentAudioElement.play();
        });
    } catch (error) {
        UI.debugLog(`ElevenLabs TTS request error: ${error.message}`);
        window.UI.setSpeakingStatus(false); // Ensure state reset on fetch/setup error
        throw error; // Re-throw to be caught by speakText
    }
}

// Озвучивание с помощью Google Cloud TTS
async function speakWithGoogleTTS(text, language) {
    const apiKey = localStorage.getItem("google_api_key");
    const voiceName = localStorage.getItem("google_voice_name") || ''; // e.g., 'en-US-Wavenet-D'
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

    const body = {
        input: { text: text },
        voice: {
            languageCode: language,
            name: voiceName // Optional: specify voice name if known
            // ssmlGender: 'NEUTRAL' // Optional
        },
        audioConfig: { audioEncoding: 'MP3' }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Google TTS API error: ${response.status} - ${errorData.error ? errorData.error.message : 'Unknown error'}`);
        }

        const responseData = await response.json();
        const audioContent = responseData.audioContent;
        const audioBlob = base64ToBlob(audioContent, 'audio/mpeg');
        const audioUrl = URL.createObjectURL(audioBlob);

        if (currentAudioElement) {
            currentAudioElement.pause();
        }
        currentAudioElement = new Audio(audioUrl);
        await new Promise((resolve, reject) => {
            currentAudioElement.onended = () => {
                UI.debugLog("Google TTS finished.");
                window.UI.setSpeakingStatus(false);
                resolve();
            };
            currentAudioElement.onerror = () => {
                UI.debugLog("Google TTS error during playback.");
                window.UI.setSpeakingStatus(false);
                reject(new Error('Google TTS audio playback error'));
            };
            currentAudioElement.play();
        });
    } catch (error) {
        UI.debugLog(`Google TTS request error: ${error.message}`);
        window.UI.setSpeakingStatus(false); // Ensure state reset on fetch/setup error
        throw error; // Re-throw to be caught by speakText
    }
}

// Вспомогательная функция для конвертации base64 в Blob
function base64ToBlob(base64, mimeType) {
    const byteCharacters = atob(base64);
    const byteArrays = [];
    
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }
    
    return new Blob(byteArrays, { type: mimeType });
}

// Остановка воспроизведения речи
function stopSpeaking() {
    UI.debugLog("stopSpeaking called");
    if (speechSynthesis && speechSynthesis.speaking) {
        speechSynthesis.cancel(); // For browser TTS
        UI.debugLog("Browser speech cancelled.");
    }
    if (utterance) {
        utterance.onend = null; // Prevent onend from firing after explicit stop
        utterance.onerror = null;
        utterance = null;
    }
    if (currentAudioElement) {
        currentAudioElement.pause();
        currentAudioElement.src = ''; // Release audio resource
        currentAudioElement.onended = null;
        currentAudioElement.onerror = null;
        currentAudioElement = null;
        UI.debugLog("External audio element stopped and cleared.");
    }
    // Always update status, as this is an explicit stop action
    window.UI.setSpeakingStatus(false);
}

// Обновление настроек типа TTS
function setTTSProvider(provider) {
    ttsProvider = provider;
    localStorage.setItem("tts_provider", ttsProvider);
    updateSpeechConfigDisplay();
    UI.debugLog(`TTS provider changed to: ${ttsProvider}`);
}

// Обновление настроек распознавания речи
function setUseBrowserSTT(value) {
    useBrowserSTT = value;
    localStorage.setItem("use_browser_stt", value ? "true" : "false");
    updateSpeechConfigDisplay();
    UI.debugLog(`Browser STT ${value ? "enabled" : "disabled"}`);
}

// Экспорт функций для использования в других модулях
window.Speech = {
    initSpeechRecognition,
    recordUserSpeech,
    stopRecording,
    speakText,
    stopSpeaking,
    setTTSProvider,
    setUseBrowserSTT,
    updateSpeechConfigDisplay
};
