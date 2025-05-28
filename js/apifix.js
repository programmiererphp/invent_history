/**
 * API Fix - Handles empty responses from models
 */

// After the page has loaded
document.addEventListener('DOMContentLoaded', function() {
    // Store the original fetchBotStart function
    const originalFetchBotStart = window.API.fetchBotStart;
    
    // Override the fetchBotStart function with our improved version
    window.API.fetchBotStart = async function(retryCount = 0) {
        try {
            // Call the original implementation
            const result = await originalFetchBotStart.call(this, retryCount);
            
            // Handle empty responses
            if (!result || 
                (result.integratedStory === undefined) || 
                (typeof result.integratedStory === 'string' && result.integratedStory.trim() === '')) {
                
                console.log("Empty response detected, using default content");
                
                // Get default content based on the current language
                return generateDefaultContent(window.App.currentLanguage);
            }
            
            return result;
        } catch (error) {
            console.error("Error in fetchBotStart wrapper:", error);
            
            // In case of error, use default content as fallback
            return generateDefaultContent(window.App.currentLanguage);
        }
    };
    
    // Store the original fetchBotReaction function
    const originalFetchBotReaction = window.API.fetchBotReaction;
    
    // Override the fetchBotReaction function with our improved version
    window.API.fetchBotReaction = async function(story, userInput, retryCount = 0) {
        try {
            // Call the original implementation
            const result = await originalFetchBotReaction.call(this, story, userInput, retryCount);
            
            // Handle empty responses
            if (!result || 
                (result.integratedStory === undefined) || 
                (typeof result.integratedStory === 'string' && result.integratedStory.trim() === '')) {
                
                console.log("Empty response detected, using default content");
                
                // Get default content based on current language but incorporate user input
                const defaultContent = generateDefaultContent(window.App.currentLanguage);
                defaultContent.integratedStory = story + "\n\n" + userInput;
                return defaultContent;
            }
            
            return result;
        } catch (error) {
            console.error("Error in fetchBotReaction wrapper:", error);
            
            // In case of error, use default content as fallback but incorporate user input
            const defaultContent = generateDefaultContent(window.App.currentLanguage);
            defaultContent.integratedStory = story + "\n\n" + userInput;
            return defaultContent;
        }
    };
});

/**
 * Function to generate default content when API returns empty responses
 */
function generateDefaultContent(language) {
    // Determine language for content
    const lang = language || window.App.currentLanguage || 'en';
    
    // Content in different languages
    const content = {
        en: {
            integratedStory: "Once upon a time in a quaint little village, there lived a curious child named Alex. With bright eyes and an even brighter imagination, Alex was known for asking questions about everything and everyone.",
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
            integratedStory: "Es war einmal in einem malerischen kleinen Dorf, dort lebte ein neugieriges Kind namens Alex. Mit leuchtenden Augen und einer noch leuchtenderen Fantasie war Alex dafür bekannt, Fragen über alles und jeden zu stellen.",
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
            integratedStory: "Однажды в живописной маленькой деревне жил любознательный ребенок по имени Алекс. С яркими глазами и еще более яркой фантазией, Алекс был известен тем, что задавал вопросы обо всем на свете.",
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
    
    // Return content for requested language or English by default
    return content[lang] || content['en'];
}
