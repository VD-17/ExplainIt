let currentState = {
    selectedText: "",
    explainedText: "",
    summary: "",
    translation: "",
    keyPoints: [],
    currentTab: "explain",
    wordDifficulty: []
};

// Add this diagnostic function
async function diagnoseAIAvailability() {
    console.log("Starting AI Diagnostics...");
    console.log("Chrome version:", navigator.userAgent);
    
    const results = {
        windowAI: typeof window.ai !== 'undefined',
        languageModel: false,
        summarizer: false,
        translator: false,
        languageModelCapabilities: null,
        summarizerCapabilities: null,
        translatorCapabilities: null
    };
    
    console.log("window.ai exists:", results.windowAI);
    
    if (window.ai) {
        console.log("window.ai object:", Object.keys(window.ai));
        
        // Check Language Model
        if (window.ai.languageModel) {
            console.log("window.ai.languageModel exists");
            try {
                const caps = await window.ai.languageModel.capabilities();
                results.languageModelCapabilities = caps;
                results.languageModel = caps.available !== 'no';
                console.log("Language Model capabilities:", caps);
            } catch (e) {
                console.error("Error checking language model:", e);
            }
        } else {
            console.log("window.ai.languageModel NOT found");
        }
        
        // Check Summarizer
        if (window.ai.summarizer) {
            console.log("window.ai.summarizer exists");
            try {
                const caps = await window.ai.summarizer.capabilities();
                results.summarizerCapabilities = caps;
                results.summarizer = caps.available !== 'no';
                console.log("Summarizer capabilities:", caps);
            } catch (e) {
                console.error("Error checking summarizer:", e);
            }
        } else {
            console.log("window.ai.summarizer NOT found");
        }
        
        // Check Translator
        if (window.ai.translator) {
            console.log("window.ai.translator exists");
            try {
                const caps = await window.ai.translator.capabilities();
                results.translatorCapabilities = caps;
                results.translator = caps.available !== 'no';
                console.log("Translator capabilities:", caps);
            } catch (e) {
                console.error("Error checking translator:", e);
            }
        } else {
            console.log("window.ai.translator NOT found");
        }
    } else {
        console.log("window.ai is completely undefined");
    }
    
    console.log("Final AI Availability Results:", results);
    return results;
}

// DOM elements - Fixed IDs
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize elements after DOM is loaded
    window.elements = {
        welcomeState: document.getElementById("welcomeState"),
        processingState: document.getElementById("processingState"),
        resultsSection: document.getElementById("resultsSection"),

        tabButtons: document.querySelectorAll(".tab-btn"),
        tabPanels: document.querySelectorAll(".tab-panel"),

        originalText: document.getElementById("originalText"),
        collapseOriginal: document.getElementById("collapseOriginal"),

        explainOutput: document.getElementById("explainOutput"),
        explanationLevel: document.getElementById("explanationLevel"),
        readAloudExplain: document.getElementById("readAloudExplain"),
        copyExplain: document.getElementById("copyExplain"),

        summaryOutput: document.getElementById('summaryOutput'),
        keyPointsList: document.getElementById("keyPointsList"),
        readAloudSummary: document.getElementById("readAloudSummary"),
        copySummary: document.getElementById("copySummary"),

        translateOutput: document.getElementById('translateOutput'),
        targetLanguage: document.getElementById('targetLanguage'),
        translateBtn: document.getElementById("translateBtn"),
        readAloudTranslate: document.getElementById("readAloudTranslate"),
        copyTranslate: document.getElementById("copyTranslate"),

        notesList: document.getElementById("notesList"),
        clearNotesBtn: document.getElementById("clearNotesBtn"),
        saveNoteBtn: document.getElementById("saveNoteBtn"),

        makeVideoBtn: document.getElementById("makeVideoBtn"),
        settingsBtn: document.getElementById("settingsBtn")
    };

    initializeEventListeners();
    setupStorageListener();
    await loadSavedNotes();

    const aiStatus = await diagnoseAIAvailability();
    
    await checkAIAvailability();
    await checkForSelectedText();
});

// Word difficulty analysis
const commonWords = new Set([
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
    'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
    'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
    'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
    'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
    'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
    'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
    'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
    'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
    'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us'
]);

function countSyllables(word) {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;
    
    // Count vowel groups
    const vowels = word.match(/[aeiouy]+/g);
    let count = vowels ? vowels.length : 1;
    
    // Adjust for silent e
    if (word.endsWith('e')) count--;
    
    // Adjust for special cases
    if (word.endsWith('le') && word.length > 2 && !/[aeiouy]/.test(word[word.length - 3])) {
        count++;
    }
    
    return Math.max(1, count);
}

function hasComplexConsonantClusters(word) {
    // Check for difficult consonant combinations
    const difficultClusters = /thr|chr|shr|str|spr|scr|squ|sch|phr|ght|dge|tch/i;
    return difficultClusters.test(word);
}

function analyzeWordDifficulty(word) {
    const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
    
    if (cleanWord.length < 3) {
        return { level: 'easy', score: 0 };
    }
    
    let score = 0;
    const syllables = countSyllables(cleanWord);
    
    // Length scoring
    if (cleanWord.length > 12) score += 3;
    else if (cleanWord.length > 8) score += 2;
    else if (cleanWord.length > 5) score += 1;
    
    // Syllable scoring
    if (syllables > 4) score += 3;
    else if (syllables > 3) score += 2;
    else if (syllables > 2) score += 1;
    
    // Common word penalty
    if (commonWords.has(cleanWord)) {
        score = Math.max(0, score - 2);
    }
    
    // Pronunciation difficulty
    if (hasComplexConsonantClusters(cleanWord)) {
        score += 1;
    }
    
    // Contains rare letters
    if (/[qxz]/.test(cleanWord)) {
        score += 1;
    }
    
    // Determine difficulty level
    let level, color, label;
    if (score >= 5) {
        level = 'very-hard';
        color = '#DC2626'; // Red
        label = 'Very Difficult';
    } else if (score >= 3) {
        level = 'hard';
        color = '#F59E0B'; // Orange
        label = 'Difficult';
    } else if (score >= 2) {
        level = 'medium';
        color = '#3B82F6'; // Blue
        label = 'Moderate';
    } else {
        level = 'easy';
        color = '#10B981'; // Green
        label = 'Easy';
    }
    
    return {
        word: word,
        cleanWord: cleanWord,
        level: level,
        score: score,
        syllables: syllables,
        color: color,
        label: label,
        pronunciation: hasComplexConsonantClusters(cleanWord) ? 'difficult' : 'normal'
    };
}

function analyzeTextDifficulty(text) {
    const words = text.match(/\b[a-zA-Z]+\b/g) || [];
    const analysis = words.map(word => analyzeWordDifficulty(word));
    
    // Get only words that are medium or harder
    const difficultWords = analysis.filter(w => w.score >= 2);
    
    return {
        allWords: analysis,
        difficultWords: difficultWords,
        stats: {
            total: words.length,
            easy: analysis.filter(w => w.level === 'easy').length,
            medium: analysis.filter(w => w.level === 'medium').length,
            hard: analysis.filter(w => w.level === 'hard').length,
            veryHard: analysis.filter(w => w.level === 'very-hard').length
        }
    };
}

function highlightDifficultWords(text) {
    const words = text.match(/\b[a-zA-Z]+\b/g) || [];
    const wordMap = new Map();
    
    // Analyze each unique word
    words.forEach(word => {
        if (!wordMap.has(word.toLowerCase())) {
            const analysis = analyzeWordDifficulty(word);
            if (analysis.score >= 2) { // Only highlight medium or harder
                wordMap.set(word.toLowerCase(), analysis);
            }
        }
    });
    
    let highlightedText = text;
    
    // Replace words with highlighted versions
    wordMap.forEach((analysis, wordLower) => {
        const regex = new RegExp(`\\b(${wordLower})\\b`, 'gi');
        highlightedText = highlightedText.replace(regex, (match) => {
            return `<span class="word-highlight word-${analysis.level}" 
                          data-difficulty="${analysis.label}" 
                          data-syllables="${analysis.syllables}"
                          data-pronunciation="${analysis.pronunciation}"
                          title="${analysis.label} - ${analysis.syllables} syllables${analysis.pronunciation === 'difficult' ? ' - Challenging pronunciation' : ''}"
                          style="background-color: ${analysis.color}15; 
                                 border: 2px solid ${analysis.color}; 
                                 border-radius: 4px; 
                                 padding: 2px 4px;
                                 cursor: help;
                                 position: relative;
                                 display: inline-block;">${match}</span>`;
        });
    });
    
    return highlightedText;
}

function createDifficultyLegend(stats) {
    return `
        <div class="difficulty-legend" style="
            background: #000000;
            border: 1px solid #E5E7EB;
            border-radius: 8px;
            padding: 12px;
            margin: 12px 0;
            font-size: 13px;
        ">
            <div style="font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                📊 Word Difficulty Analysis
            </div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="display: inline-block; width: 16px; height: 16px; background: #10B98115; border: 2px solid #10B981; border-radius: 3px;"></span>
                    <span>Easy: ${stats.easy}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="display: inline-block; width: 16px; height: 16px; background: #3B82F615; border: 2px solid #3B82F6; border-radius: 3px;"></span>
                    <span>Moderate: ${stats.medium}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="display: inline-block; width: 16px; height: 16px; background: #F59E0B15; border: 2px solid #F59E0B; border-radius: 3px;"></span>
                    <span>Difficult: ${stats.hard}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="display: inline-block; width: 16px; height: 16px; background: #DC262615; border: 2px solid #DC2626; border-radius: 3px;"></span>
                    <span>Very Difficult: ${stats.veryHard}</span>
                </div>
            </div>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #E5E7EB; font-size: 12px; color: #6B7280;">
                💡 Hover over highlighted words for details
            </div>
        </div>
    `;
}

async function checkForSelectedText() {
    console.log("Checking for selected text...");
    
    let retries = 0;
    const maxRetries = 15;
    
    const checkStorage = async () => {
        try {
            const result = await chrome.storage.local.get(["selectedText", "timestamp"]);
            
            console.log("Storage check result:", {
                hasText: !!result.selectedText,
                textLength: result.selectedText?.length,
                timestamp: result.timestamp,
                age: result.timestamp ? Date.now() - result.timestamp : null
            });

            if (result.selectedText && result.timestamp) {
                const now = Date.now();
                const age = now - result.timestamp;
                
                // Increase time window to 15 seconds
                if (age < 15000) {
                    console.log("Found selected text:", result.selectedText.substring(0, 50));
                    currentState.selectedText = result.selectedText;
                    await processText(result.selectedText);
                    
                    // Clear after processing
                    await chrome.storage.local.remove(["selectedText", "timestamp"]);
                    console.log("Text processed and cleared from storage");
                    return true;
                } else {
                    console.log("Text found but too old (age:", age, "ms)");
                }
            }
            return false;
        } catch (error) {
            console.error('Error checking for selected text:', error);
            return false;
        }
    };
    
    // First immediate check
    const found = await checkStorage();
    if (found) return;
    
    // If not found, retry with delays
    console.log("Text not found immediately, starting retry loop...");
    
    while (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 200));
        retries++;
        
        console.log(`Retry ${retries}/${maxRetries}...`);
        const found = await checkStorage();
        
        if (found) {
            console.log(`Found text after ${retries} retries`);
            return;
        }
    }
    
    console.log("No selected text found after all retries");
}

function initializeEventListeners() {
    elements.tabButtons.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    elements.collapseOriginal?.addEventListener('click', toggleOriginalText);

    elements.explanationLevel?.addEventListener('change', async (e) => {
        if (currentState.selectedText) {
            await generateExplanation(currentState.selectedText, e.target.value);
        }
    });

    elements.readAloudExplain?.addEventListener('click', () => readAloud(elements.explainOutput.textContent));
    elements.readAloudSummary?.addEventListener('click', () => readAloud(elements.summaryOutput.textContent));
    elements.readAloudTranslate?.addEventListener('click', () => readAloud(elements.translateOutput.textContent));

    elements.copyExplain?.addEventListener('click', () => copyToClipboard(elements.explainOutput.textContent, 'Explanation copied!'));
    elements.copySummary?.addEventListener('click', () => copyToClipboard(elements.summaryOutput.textContent, 'Summary copied!'));
    elements.copyTranslate?.addEventListener('click', () => copyToClipboard(elements.translateOutput.textContent, 'Translation copied!'));

    elements.translateBtn?.addEventListener('click', async () => {
        if (currentState.selectedText) {
            await translateText(currentState.selectedText, elements.targetLanguage.value);
        }
    });

    elements.saveNoteBtn?.addEventListener('click', saveCurrentNote);
    elements.clearNotesBtn?.addEventListener('click', clearAllNotes);
    elements.makeVideoBtn?.addEventListener('click', createVideo);
    elements.settingsBtn?.addEventListener('click', openSettings);
}

function setupStorageListener() {
    // Listen for storage changes in real-time
    chrome.storage.onChanged.addListener(async (changes, namespace) => {
        if (namespace === 'local' && changes.selectedText && changes.selectedText.newValue) {
            console.log("Storage changed! New text detected:", changes.selectedText.newValue.substring(0, 50));
            
            const text = changes.selectedText.newValue;
            if (text && text.length > 10) {
                currentState.selectedText = text;
                await processText(text);
                
                // Clear after a short delay to ensure processing started
                setTimeout(() => {
                    chrome.storage.local.remove(["selectedText", "timestamp"]);
                }, 500);
            }
        }
    });
    
    console.log("Storage listener setup complete");
}

// Listen for storage changes
chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace === 'local' && changes.selectedText) {
        console.log("Storage changed, new text detected");
        const text = changes.selectedText.newValue;
        if (text && text.length > 10) {
            currentState.selectedText = text;
            await processText(text);
            // Clear after processing
            chrome.storage.local.remove(["selectedText", "timestamp"]);
        }
    }
});

function switchTab(tabKey) {
    currentState.currentTab = tabKey;

    elements.tabButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabKey);
    });

    elements.tabPanels.forEach(panel => {
        panel.classList.toggle('hidden', panel.id !== `${tabKey}Panel`);
        panel.classList.toggle('active', panel.id === `${tabKey}Panel`);
    });
}

function toggleOriginalText() {
    const card = elements.collapseOriginal.closest('.original-text-card');
    card.classList.toggle('collapsed');
    
    const svg = elements.collapseOriginal.querySelector('svg polyline');
    if (card.classList.contains('collapsed')) {
        svg.setAttribute('points', '6 9 12 15 18 9');
    } else {
        svg.setAttribute('points', '18 15 12 9 6 15');
    }
}

async function processText(text) {
    console.log("Processing text started:", text.substring(0, 100));
    console.log("Text length:", text.length);
    
    if (!text || text.length < 10) {
        console.error("Text too short or missing");
        showError('Text is too short to process');
        showState('welcome');
        return;
    }
    
    showState("processing");

    try {
        // Display original text with difficulty highlighting
        const difficultyAnalysis = analyzeTextDifficulty(text);
        currentState.wordDifficulty = difficultyAnalysis;
        
        const highlightedText = highlightDifficultWords(text);
        const legend = createDifficultyLegend(difficultyAnalysis.stats);
        
        elements.originalText.innerHTML = legend + highlightedText;
        
        console.log("Generating explanation...");
        await generateExplanation(text, elements.explanationLevel.value);
        
        console.log("Generating summary...");
        await generateSummary(text);
        
        console.log("Processing complete, showing results");
        showState("results");
    } catch (error) {
        console.error('Error processing text:', error);
        showError('Failed to process text. Please try again.');
        showState('welcome');
    }
}

// Fallback function for when AI is not available
function generateFallbackExplanation(text, level) {
    const words = text.split(' ');
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const difficultyAnalysis = analyzeTextDifficulty(text);
    
    let explanation = "";
    
    switch(level) {
        case "simple":
            explanation = `This text talks about: "${text.substring(0, 50)}..."\n\n`;
            explanation += `It has ${words.length} words and ${sentences.length} sentence(s).\n\n`;
            explanation += `Difficulty: ${difficultyAnalysis.stats.hard + difficultyAnalysis.stats.veryHard} challenging words found.\n\n`;
            explanation += "The main idea seems to be about the topic mentioned in the text.\n";
            explanation += "To understand it better, try reading it slowly and looking up any hard words.";
            break;
            
        case "teen":
            explanation = `This text discusses: "${text.substring(0, 100)}..."\n\n`;
            explanation += `Key Information:\n`;
            explanation += `• Length: ${words.length} words\n`;
            explanation += `• Structure: ${sentences.length} sentence(s)\n`;
            explanation += `• Challenging words: ${difficultyAnalysis.stats.hard + difficultyAnalysis.stats.veryHard}\n\n`;
            explanation += "The text appears to cover the subject matter shown above. ";
            explanation += "Breaking it down into smaller parts might help with understanding.";
            break;
            
        case "standard":
        case "technical":
            explanation = `Text Analysis:\n\n`;
            explanation += `Content Preview: "${text.substring(0, 150)}..."\n\n`;
            explanation += `Statistics:\n`;
            explanation += `• Word count: ${words.length}\n`;
            explanation += `• Sentence count: ${sentences.length}\n`;
            explanation += `• Average words per sentence: ${Math.round(words.length/sentences.length)}\n`;
            explanation += `• Vocabulary difficulty: ${difficultyAnalysis.stats.hard + difficultyAnalysis.stats.veryHard} complex words\n\n`;
            explanation += "For a detailed explanation, consider breaking down the text into key concepts and analyzing each part separately.";
            break;
    }
    
    return explanation;
}

function generateFallbackSummary(text) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const words = text.split(' ');
    const difficultyAnalysis = analyzeTextDifficulty(text);
    
    let summary = "Summary:\n\n";
    
    if (sentences.length > 0) {
        summary += `• First point: ${sentences[0].substring(0, 100)}...\n`;
    }
    if (sentences.length > 1) {
        summary += `• Additional context: ${sentences[Math.floor(sentences.length/2)].substring(0, 100)}...\n`;
    }
    if (sentences.length > 2) {
        summary += `• Final point: ${sentences[sentences.length-1].substring(0, 100)}...\n`;
    }
    
    summary += `\n(Text contains ${words.length} words with ${difficultyAnalysis.stats.hard + difficultyAnalysis.stats.veryHard} challenging terms)`;
    
    return summary;
}

function generateFallbackKeyPoints(text) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const difficultyAnalysis = analyzeTextDifficulty(text);
    const points = [];
    
    if (sentences.length > 0) points.push(`First mentioned: ${sentences[0].substring(0, 80)}...`);
    if (sentences.length > 2) points.push(`Also discussed: ${sentences[Math.floor(sentences.length/2)].substring(0, 80)}...`);
    if (sentences.length > 1) points.push(`Finally noted: ${sentences[sentences.length-1].substring(0, 80)}...`);
    
    if (difficultyAnalysis.difficultWords.length > 0) {
        const topDifficult = difficultyAnalysis.difficultWords
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .map(w => w.word)
            .join(', ');
        points.push(`Challenging vocabulary: ${topDifficult}`);
    }
    
    return points.length > 0 ? points : ["The text discusses the topic shown above"];
}

async function generateExplanation(text, level = "teen") {
    console.log("generateExplanation called with level:", level);
    
    try {
        const levelPrompts = {
            simple: "Explain this text in very simple terms that an 8-10 year old would understand. Use easy words and short sentences.",
            teen: "Explain this text clearly for a teenager (12-15 years old). Break down complex terms and make it easy to understand.",
            standard: "Explain this text in clear, accessible language for a general audience. Simplify technical terms.",
            technical: "Provide a detailed explanation of this text, maintaining technical accuracy while ensuring clarity."
        };

        // Check if Chrome AI is available
        if (typeof window.ai !== "undefined" && window.ai.languageModel) {
            console.log("Attempting to use Chrome AI...");
            try {
                const capabilities = await window.ai.languageModel.capabilities();
                console.log("AI Capabilities:", capabilities);
                
                if (capabilities.available === "after-download") {
                    elements.explainOutput.innerHTML = `
                        <div style="padding: 12px; background: #E3F2FD; border-left: 3px solid #2196F3; border-radius: 4px;">
                            <strong>Downloading AI model...</strong><br>
                            <p style="margin-top: 8px; font-size: 12px;">
                                This may take a few minutes on first use. Using fallback analysis for now...
                            </p>
                        </div>
                    `;
                }
                
                if (capabilities.available !== "no") {
                    console.log("Chrome AI is available, creating session...");
                    const session = await window.ai.languageModel.create({
                        systemPrompt: 'You are a helpful educational assistant that explains complex topics in simple, clear language.'
                    });
                    
                    const prompt = `${levelPrompts[level]}\n\nText to explain: ${text}`;
                    console.log("Sending prompt to AI...");
                    const result = await session.prompt(prompt);
                    
                    console.log("Got AI response, length:", result.length);
                    currentState.explainedText = result;
                    elements.explainOutput.textContent = result;
                    
                    await session.destroy();
                    return;
                }
            } catch (aiError) {
                console.log("Chrome AI failed, using fallback:", aiError);
            }
        } else {
            console.log("Chrome AI not found (window.ai missing)");
        }
        
        // Use fallback
        console.log("Using fallback explanation...");
        const fallbackResult = generateFallbackExplanation(text, level);
        currentState.explainedText = fallbackResult;
        
        elements.explainOutput.innerHTML = `
            <div style="padding: 12px; background: #4A90E2; border-left: 3px solid #FFC107; border-radius: 4px; margin-bottom: 12px;">
                <strong>Using Basic Analysis</strong><br>
                <p style="margin-top: 8px; font-size: 12px;">
                    Chrome AI not available. Enable it at <code>chrome://flags</code>:
                    <br>• Search for "Prompt API for Gemini Nano"
                    <br>• Enable it and restart Chrome
                    <br>• Wait 5-10 minutes for model download
                </p>
            </div>
            <div style="white-space: pre-wrap;">${fallbackResult}</div>
        `;
        
    } catch (error) {
        console.error('Error in generateExplanation:', error);
        
        const fallbackResult = generateFallbackExplanation(text, level);
        currentState.explainedText = fallbackResult;
        elements.explainOutput.innerHTML = `
            <div style="padding: 12px; background: #4A90E2; border-left: 3px solid #F44336; border-radius: 4px; margin-bottom: 12px;">
                <strong>Error occurred</strong><br>
                <p style="margin-top: 8px; font-size: 12px;">${error.message}</p>
            </div>
            <div style="white-space: pre-wrap;">${fallbackResult}</div>
        `;
    }
}

async function generateSummary(text) {
    try {
        // Try Chrome AI first
        if (window.ai && window.ai.summarizer) {
            try {
                const capabilities = await window.ai.summarizer.capabilities();
                
                if (capabilities.available !== 'no') {
                    if (capabilities.available === 'after-download') {
                        elements.summaryOutput.textContent = 'Downloading summarizer model...';
                    }

                    const summarizer = await window.ai.summarizer.create({
                        type: 'key-points',
                        format: 'plain-text',
                        length: 'medium'
                    });
                    
                    const summary = await summarizer.summarize(text);
                    currentState.summary = summary;
                    elements.summaryOutput.textContent = summary;
                    await summarizer.destroy();
                    
                    await generateKeyPoints(text);
                    return;
                }
            } catch (aiError) {
                console.log("Summarizer not ready, using fallback");
            }
        }
        
        // Fallback summary
        const fallbackSummary = generateFallbackSummary(text);
        currentState.summary = fallbackSummary;
        elements.summaryOutput.textContent = fallbackSummary;
        
        // Fallback key points
        const fallbackPoints = generateFallbackKeyPoints(text);
        currentState.keyPoints = fallbackPoints;
        
        elements.keyPointsList.innerHTML = '';
        fallbackPoints.forEach(point => {
            const li = document.createElement('li');
            li.textContent = point;
            elements.keyPointsList.appendChild(li);
        });
        
    } catch (error) {
        console.error('Error generating summary:', error);
        
        // Always provide fallback
        const fallbackSummary = generateFallbackSummary(text);
        currentState.summary = fallbackSummary;
        elements.summaryOutput.textContent = fallbackSummary;
    }
}

async function generateKeyPoints(text) {
    try {
        if (window.ai && window.ai.languageModel) {
            const session = await window.ai.languageModel.create();
            const prompt = `Extract 3-5 key points from this text. Format as a simple list:\n\n${text}`;
            const result = await session.prompt(prompt);

            const points = result
                .split('\n')
                .filter(line => line.trim().length > 0)
                .map(line => line.replace(/^[-•*\d.)\s]+/, '').trim())
                .filter(line => line.length > 10);
            
            currentState.keyPoints = points;

            elements.keyPointsList.innerHTML = '';
            if (points.length > 0) {
                points.forEach(point => {
                    const li = document.createElement('li');
                    li.textContent = point;
                    elements.keyPointsList.appendChild(li);
                });
            }
            
            await session.destroy();
        } else {
            // Use fallback
            const fallbackPoints = generateFallbackKeyPoints(text);
            currentState.keyPoints = fallbackPoints;
            
            elements.keyPointsList.innerHTML = '';
            fallbackPoints.forEach(point => {
                const li = document.createElement('li');
                li.textContent = point;
                elements.keyPointsList.appendChild(li);
            });
        }
    } catch (error) {
        console.error("Error generating key points:", error);
        
        // Use fallback
        const fallbackPoints = generateFallbackKeyPoints(text);
        elements.keyPointsList.innerHTML = '';
        fallbackPoints.forEach(point => {
            const li = document.createElement('li');
            li.textContent = point;
            elements.keyPointsList.appendChild(li);
        });
    }
}

async function translateText(text, targetLang) {
    try {
        elements.translateOutput.textContent = "Translating...";
        
        // Simple fallback translation message
        const languageNames = {
            es: 'Spanish', fr: 'French', de: 'German', it: 'Italian',
            pt: 'Portuguese', zh: 'Chinese', ja: 'Japanese', ko: 'Korean',
            ar: 'Arabic', hi: 'Hindi', ru: 'Russian'
        };
        
        // Try Chrome AI translator if available
        if (window.ai && window.ai.translator) {
            try {
                const capabilities = await window.ai.translator.capabilities();
                
                if (capabilities.available !== 'no') {
                    const translator = await window.ai.translator.create({
                        sourceLanguage: "en",
                        targetLanguage: targetLang
                    });

                    const translation = await translator.translate(text);
                    currentState.translation = translation;
                    elements.translateOutput.textContent = translation;
                    await translator.destroy();
                    return;
                }
            } catch (aiError) {
                console.log("Translator not ready, using fallback");
            }
        }
        
        // Fallback message
        const fallbackMessage = `Translation to ${languageNames[targetLang]} requested:\n\n"${text.substring(0, 200)}..."\n\n`;
        
        currentState.translation = fallbackMessage;
        elements.translateOutput.innerHTML = `
            <div style="padding: 12px; background: #4A90E2; border-left: 3px solid #FFC107; border-radius: 4px;">
                <strong>Translation Feature Unavailable</strong><br>
                <p style="margin-top: 8px; font-size: 12px;">
                    Chrome's built-in translation is experimental. 
                    <a href="https://translate.google.com" target="_blank" style="color: #667eea;">Use Google Translate</a> instead.
                </p>
            </div>
            <div style="margin-top: 12px;">
                <strong>Original text:</strong><br>
                ${text.substring(0, 300)}${text.length > 300 ? '...' : ''}
            </div>
        `;
        
    } catch (error) {
        console.error('Error translating text:', error);
        elements.translateOutput.innerHTML = `
            <div style="padding: 12px; background: #4A90E2; border-left: 3px solid #F56565; border-radius: 4px;">
                <strong>Translation Error</strong><br>
                <p style="margin-top: 8px; font-size: 12px;">Unable to translate. Please try again later.</p>
            </div>
        `;
    }
}

async function checkAIAvailability() {
    const checks = {
        languageModel: false,
        summarizer: false,
        translator: false
    };

    try {
        if (window.ai) {
            if (window.ai.languageModel) {
                try {
                    const caps = await window.ai.languageModel.capabilities();
                    checks.languageModel = caps.available !== 'no';
                } catch (e) {
                    console.log("Language model check failed:", e);
                }
            }
            
            if (window.ai.summarizer) {
                try {
                    const caps = await window.ai.summarizer.capabilities();
                    checks.summarizer = caps.available !== 'no';
                } catch (e) {
                    console.log("Summarizer check failed:", e);
                }
            }
            
            if (window.ai.translator) {
                checks.translator = true;
            }
        }
    } catch (error) {
        console.error('Error checking AI availability:', error);
    }

    console.log('AI Availability:', checks);
    
    // Show warning if no AI features are available
    if (!checks.languageModel && !checks.summarizer && !checks.translator) {
        console.log("Chrome AI features not available - using fallback methods");
    }
    
    return checks;
}

// Rest of your functions remain the same...
function readAloud(text) {
    window.speechSynthesis.cancel();
    
    if (!text || text.includes("will appear here")) {
        showNotification("No content to read", "warning");
        return;
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    window.speechSynthesis.speak(utterance);
    showNotification("Reading aloud...", "info");
}

async function copyToClipboard(text, message = "Copied!") {
    if (!text || text.includes("will appear here")) {
        showNotification("No content to copy", "warning");
        return;
    }
    
    try {
        await navigator.clipboard.writeText(text);
        showNotification(message, "success");
    } catch (error) {
        console.error("Copy failed:", error);
        showNotification("Failed to copy", "error");
    }
}

async function saveCurrentNote() {
    if (!currentState.selectedText) {
        showNotification('No content to save', 'warning');
        return;
    }
    
    try {
        const note = {
            id: Date.now(),
            originalText: currentState.selectedText,
            explanation: currentState.explainedText,
            summary: currentState.summary,
            wordDifficulty: currentState.wordDifficulty,
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString()
        };
        
        const { notes = [] } = await chrome.storage.local.get("notes");
        notes.unshift(note);
        
        if (notes.length > 50) {
            notes.splice(50);
        }
        
        await chrome.storage.local.set({ notes });
        await loadSavedNotes();
        
        showNotification("Note saved successfully!", "success");
    } catch (error) {
        console.error("Error saving note:", error);
        showNotification("Failed to save note", "error");
    }
}

async function loadSavedNotes() {
    try {
        const { notes = [] } = await chrome.storage.local.get("notes");
        
        if (notes.length === 0) {
            elements.notesList.innerHTML = `
                <div class="empty-state">
                    <p>No saved notes yet. Save explanations to access them later!</p>
                </div>
            `;
            return;
        }
        
        elements.notesList.innerHTML = "";
        notes.forEach(note => {
            const noteItem = createNoteElement(note);
            elements.notesList.appendChild(noteItem);
        });
    } catch (error) {
        console.error("Error loading notes:", error);
    }
}

function createNoteElement(note) {
    const div = document.createElement("div");
    div.className = "note-item";
    
    // Create difficulty badge if available
    let difficultyBadge = '';
    if (note.wordDifficulty && note.wordDifficulty.stats) {
        const stats = note.wordDifficulty.stats;
        const totalDifficult = stats.hard + stats.veryHard;
        difficultyBadge = `<span style="
            display: inline-block;
            padding: 2px 8px;
            background: ${totalDifficult > 5 ? '#DC2626' : totalDifficult > 2 ? '#F59E0B' : '#10B981'};
            color: white;
            border-radius: 12px;
            font-size: 11px;
            margin-left: 8px;
        ">${totalDifficult} difficult words</span>`;
    }
    
    div.innerHTML = `
        <div class="note-header">
            <span class="note-date">${note.date} at ${note.time} ${difficultyBadge}</span>
            <button class="note-delete" data-id="${note.id}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
            </button>
        </div>
        <div class="note-content">
            <strong>Original:</strong> ${truncateText(note.originalText, 100)}<br>
            <strong>Explanation:</strong> ${truncateText(note.explanation, 150)}
        </div>
    `;
    
    div.querySelector(".note-delete").addEventListener('click', () => deleteNote(note.id));
    
    return div;
}

async function deleteNote(noteId) {
    try {
        const { notes = [] } = await chrome.storage.local.get("notes");
        const updatedNotes = notes.filter(note => note.id !== noteId);
        
        await chrome.storage.local.set({ notes: updatedNotes });
        await loadSavedNotes();
        
        showNotification("Note deleted", "info");
    } catch (error) {
        console.error("Error deleting note:", error);
        showNotification("Failed to delete note", "error");
    }
}

async function clearAllNotes() {
    if (!confirm("Are you sure you want to delete all notes?")) {
        return;
    }
    
    try {
        await chrome.storage.local.set({ notes: [] });
        await loadSavedNotes();
        showNotification("All notes cleared", "info");
    } catch (error) {
        console.error("Error clearing notes:", error);
        showNotification("Failed to clear notes", "error");
    }
}

function createVideo() {
    showNotification("Video creation coming soon!", "info");
}

function openSettings() {
    showNotification("Settings coming soon!", "info");
}

function showState(state) {
    elements.welcomeState.classList.toggle('hidden', state !== "welcome");
    elements.processingState.classList.toggle('hidden', state !== "processing");
    elements.resultsSection.classList.toggle('hidden', state !== "results");
}

function showNotification(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'success' ? '#48BB78' : type === 'error' ? '#F56565' : type === 'warning' ? '#F6AD55' : '#4299E1'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showError(message) {
    showNotification(message, "error");
}

function truncateText(text, maxLength) {
    if (!text) return "";
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
    
    /* Word highlight hover effect */
    .word-highlight:hover {
        transform: scale(1.05);
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        z-index: 10;
    }
    
    /* Tooltip for word difficulty */
    .word-highlight::after {
        content: attr(data-difficulty) " - " attr(data-syllables) " syllables";
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%) translateY(-5px);
        background: #1F2937;
        color: white;
        padding: 6px 10px;
        border-radius: 6px;
        font-size: 11px;
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s, transform 0.2s;
        z-index: 1000;
    }
    
    .word-highlight:hover::after {
        opacity: 1;
        transform: translateX(-50%) translateY(-8px);
    }
    
    /* Add pronunciation indicator */
    .word-highlight[data-pronunciation="difficult"]::before {
        content: "🗣️";
        position: absolute;
        top: -8px;
        right: -8px;
        font-size: 10px;
        background: white;
        border-radius: 50%;
        padding: 2px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }
    
    /* Side panel specific styles */
    body {
        margin: 0;
        padding: 0;
        overflow-x: hidden;
    }
    
    .container {
        max-width: 100%;
        height: 100vh;
        overflow-y: auto;
    }
    
    /* Smooth scrolling for side panel */
    html {
        scroll-behavior: smooth;
    }
    
    /* Difficulty legend animation */
    .difficulty-legend {
        animation: fadeInDown 0.5s ease;
    }
    
    @keyframes fadeInDown {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    /* Improve readability in side panel */
    .card-content {
        line-height: 1.6;
        word-wrap: break-word;
    }
    
    /* Better spacing for highlighted text */
    .word-highlight {
        margin: 0 1px;
        transition: all 0.2s ease;
    }
`;
document.head.appendChild(style);