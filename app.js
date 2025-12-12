// API Configuration (ES6: const, template literals)
const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
// Default key provided by user so they do not need to paste manually
const DEFAULT_API_KEY = 'AIzaSyBbvUNkzQGFCor2Pki_G2Ls4qXFtxkThVs';

// ES6: Arrow function to get API key with default fallback
const getApiKey = () => localStorage.getItem('geminiApiKey') || DEFAULT_API_KEY;

// ES6: Arrow function to build full API URL with template literal
const getApiUrl = () => `${API_BASE_URL}?key=${getApiKey()}`;

// DOM Elements (ES6: const for immutable references)
const apiKeyInput = document.getElementById('apiKeyInput');
const apiStatus = document.getElementById('apiStatus');
const jokeTopic = document.getElementById('jokeTopic');
const jokeDisplay = document.getElementById('jokeDisplay');
const quizTopic = document.getElementById('quizTopic');
const quizContainer = document.getElementById('quizContainer');
const affirmationText = document.getElementById('affirmationText');

const projectsDashboard = document.getElementById('projectsDashboard');

const showDashboard = () => {
    if (projectsDashboard) {
        projectsDashboard.classList.remove('hidden');
        document.querySelectorAll('.project-section').forEach(section => {
            section.classList.add('hidden');
        });
    }
};

const openProject = (project) => {
    if (projectsDashboard) projectsDashboard.classList.add('hidden');
    document.querySelectorAll('.project-section').forEach(section => {
        section.classList.add('hidden');
    });
    const section = document.getElementById(`${project}Section`);
    if (section) {
        section.classList.remove('hidden');
        if (project === 'affirmation') {
            fetchAffirmation();
        }
    }
};

// Project teasers and back buttons
document.querySelectorAll('.project-teaser').forEach(teaser => {
    teaser.addEventListener('click', (e) => {
        e.preventDefault();
        const project = teaser.dataset.project;
        openProject(project);
    });
});

document.addEventListener('click', (e) => {
    if (e.target.closest('.back-btn')) {
        showDashboard();
    }
});

// State (ES6: let for mutable variables)
let currentQuiz = [];
let userAnswers = [];
let score = 0;
let jokeNonce = 0;
const recentJokes = [];
const bannedJokeWords = ['ladder', 'ladders', 'rung', 'rungs', 'stairs', 'staircase'];

// API Key Management (ES6: Arrow functions)
const saveApiKey = () => {
    const key = apiKeyInput.value.trim();
    if (key) {
        localStorage.setItem('geminiApiKey', key);
        apiStatus.textContent = '✅ Custom API key saved successfully!';
        apiStatus.className = 'text-sm text-green-400 mt-2';
        apiKeyInput.value = '';
        fetchAffirmation();
        showDashboard();
    } else {
        apiStatus.textContent = '❌ Please enter a valid API key';
        apiStatus.className = 'text-sm text-red-400 mt-2';
    }
};

document.getElementById('saveApiKey').addEventListener('click', saveApiKey);

// Attempt to extract a JSON array from Gemini text output
const extractJsonArray = (rawText) => {
    const direct = rawText.trim();
    try {
        return JSON.parse(direct);
    } catch (_) {
        // ignore and try other shapes
    }

    const fenceMatch = rawText.match(/```json\s*([\s\S]*?)```/i) || rawText.match(/```\s*([\s\S]*?)```/i);
    if (fenceMatch) {
        try {
            return JSON.parse(fenceMatch[1].trim());
        } catch (_) {
            // continue
        }
    }

    const firstBracket = rawText.indexOf('[');
    const lastBracket = rawText.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        const slice = rawText.slice(firstBracket, lastBracket + 1);
        try {
            return JSON.parse(slice);
        } catch (_) {
            // continue
        }
    }

    throw new Error('Could not parse JSON from model response.');
};

// Generic Gemini API Call (ES6: async/await, arrow function, template literals)
const callGeminiAPI = async (prompt) => {
    const apiKey = getApiKey();
    
    if (!apiKey) {
        throw new Error('Please enter your Gemini API key first!');
    }

    // ES6: Object shorthand and template literals
    const requestBody = {
        contents: [{
            parts: [{ text: prompt }]
        }]
    };

    const response = await fetch(getApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorData = await response.json();
        const rawMsg = errorData.error?.message || 'API request failed';
        const quotaMsg = 'API quota exceeded. Please add your own Gemini API key in the API Configuration section to continue.';
        const msg = response.status === 429 || /quota/i.test(rawMsg) ? quotaMsg : rawMsg;
        throw new Error(msg);
    }

    const data = await response.json();
    
    // ES6: Optional chaining for safe property access
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
        throw new Error('No response from API');
    }

    return text;
};

// Project 1: AI Joke Generator
const fetchJoke = async () => {
    const topic = (jokeTopic.value || '').trim();
    if (!topic) {
        jokeDisplay.innerHTML = `
            <p class="text-red-300 text-center">Please enter a topic to get a joke.</p>
        `;
        return;
    }

    const getPrompt = () => {
        jokeNonce += 1;
        return `Give a short, simple, 4-line poem that is a really funny joke about "${topic}". Use very easy English. Make the joke silly, unexpected, and playful (like a cartoon moment). Create a fresh setup and a surprising punchline that makes people laugh fast. Keep the words simple so everyone understands. `;
    };

    const showLoading = () => {
        jokeDisplay.innerHTML = `
            <div class="flex items-center gap-3 text-white">
                <div class="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Thinking of something funny...</span>
            </div>
        `;
    };

    showLoading();

    let attempts = 0;
    while (attempts < 3) {
        try {
            const joke = (await callGeminiAPI(getPrompt())).trim();
            if (!joke) throw new Error('Empty response');

            const lowerJoke = joke.toLowerCase();
            const hasBannedWord = bannedJokeWords.some(word => lowerJoke.includes(word));
            if (hasBannedWord || recentJokes.includes(joke)) {
                attempts += 1;
                continue; // try again for a different joke
            }

            recentJokes.push(joke);
            if (recentJokes.length > 5) recentJokes.shift();

            jokeDisplay.innerHTML = `
                <p class="text-white text-lg text-center">${joke}</p>
            `;
            return;
        } catch (error) {
            attempts += 1;
            if (attempts >= 3) {
                jokeDisplay.innerHTML = `
                    <p class="text-red-300 text-center">😅 ${error.message || 'Unable to fetch a new joke right now.'}</p>
                `;
            }
        }
    }
};

document.getElementById('getJokeBtn').addEventListener('click', fetchJoke);
jokeTopic.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        fetchJoke();
    }
});

// Project 2: 5-MCQ Quiz Generator
// ES6 Features: arrays/map/reduce, Object.entries, let/const, template literals, async/await, destructuring
const fetchQuiz = async () => {
    let topic = quizTopic.value.trim();
    
    if (!topic) {
        quizContainer.innerHTML = `<p class="text-red-300 text-center text-xl py-20">Please enter a topic first!</p>`;
        return;
    }

    const prompt = `You are a strict JSON generator. Respond with ONLY valid JSON, no Markdown, no explanations.
Return exactly 5 MCQ objects about "${topic}".
The exact shape:
[
    {
        "question": "Concise question text?",
        "options": {"A":"...","B":"...","C":"...","D":"..."},
        "correct": "A" // correct key must match one of A/B/C/D
    },
    {"question": "...", "options": {"A":"...","B":"...","C":"...","D":"..."}, "correct": "B"},
    {"question": "...", "options": {"A":"...","B":"...","C":"...","D":"..."}, "correct": "C"},
    {"question": "...", "options": {"A":"...","B":"...","C":"...","D":"..."}, "correct": "D"},
    {"question": "...", "options": {"A":"...","B":"...","C":"...","D":"..."}, "correct": "A"}
]
Rules: only one correct option per question; keep questions short; options must be plausible; do not wrap in backticks.`;

    quizContainer.innerHTML = `
        <div class="flex items-center justify-center gap-3 text-white h-[500px]">
            <div class="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full"></div>
            <span class="text-xl">Generating quiz on "${topic}"...</span>
        </div>
    `;

    try {
        const responseText = await callGeminiAPI(prompt);
        const quizData = extractJsonArray(responseText);

        // Validate
        if (!Array.isArray(quizData) || quizData.length !== 5) {
            throw new Error('Invalid response format - expected exactly 5 questions');
        }

        currentQuiz = quizData;
        userAnswers = new Array(5).fill(null);
        score = 0;
        displayQuiz();
    } catch (error) {
        console.error('Quiz generation error:', error);
        quizContainer.innerHTML = `
            <p class="text-red-300 text-center text-xl py-20">❌ ${error.message}</p>
        `;
    }
};

const displayQuiz = () => {
    quizContainer.innerHTML = `
        <div class="max-w-3xl mx-auto">
            <h3 class="text-2xl font-bold text-green-300 mb-6 text-center">5-MCQ Quiz: ${quizTopic.value}</h3>
            <form id="quizForm" class="space-y-6">
                ${currentQuiz.map((q, index) => `
                    <div class="bg-white/20 p-6 rounded-2xl border-2 border-green-500/50">
                        <h4 class="text-xl font-semibold text-white mb-4">Q${index + 1}: ${q.question}</h4>
                        <div class="space-y-3 text-lg">
                            ${Object.entries(q.options).map(([key, opt]) => `
                                <label class="block p-4 bg-white/10 hover:bg-white/20 rounded-xl cursor-pointer transition-all flex items-center border border-white/20 hover:border-green-400">
                                    <input type="radio" name="q${index}" value="${key}" class="mr-4 w-6 h-6 text-green-500 focus:ring-green-400 accent-green-500">
                                    <span class="font-medium">${key}) ${opt}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </form>
            <div class="flex flex-col sm:flex-row gap-4 mt-8 pt-4 border-t border-white/20">
                <button id="submitQuizBtn" type="button" class="flex-1 px-8 py-4 bg-gradient-to-r from-green-400 to-teal-500 text-gray-900 font-bold rounded-2xl hover:from-green-500 hover:to-teal-600 transition-all transform hover:scale-105 text-lg shadow-xl">
                    ✅ Submit & Score
                </button>
                <button id="newQuizBtn" type="button" class="px-8 py-4 bg-gradient-to-r from-blue-400 to-indigo-500 text-white font-bold rounded-2xl hover:from-blue-500 hover:to-indigo-600 transition-all transform hover:scale-105 text-lg shadow-xl">
                    🔄 Reset Form
                </button>
            </div>
            <div id="resultsSection" class="mt-12 hidden">
                <div id="scoreDisplay" class="text-center py-12 rounded-2xl bg-gradient-to-r from-green-500/20 to-teal-500/20 border-2 border-green-400/50 mb-8"></div>
                <div id="quizResults" class="space-y-4"></div>
            </div>
        </div>
    `;

    // Dynamic event listeners (ES6 arrow functions)
    document.getElementById('submitQuizBtn').addEventListener('click', submitQuiz);
    document.getElementById('newQuizBtn').addEventListener('click', () => {
        document.getElementById('quizForm').reset();
        const resultsSection = document.getElementById('resultsSection');
        if (!resultsSection.classList.contains('hidden')) {
            resultsSection.classList.add('hidden');
        }
    });
};

const submitQuiz = (e) => {
    e?.preventDefault?.();
    userAnswers = currentQuiz.map((_, index) => {
        const selectedEl = document.querySelector(`input[name="q${index}"]:checked`);
        return selectedEl ? selectedEl.value : null;
    });

    // ES6: .reduce() to calculate score
    score = currentQuiz.reduce((acc, q, i) => userAnswers[i] === q.correct ? acc + 1 : acc, 0);

    displayResults();
};

const displayResults = () => {
    const percentage = Math.round((score / currentQuiz.length) * 100);
    const scoreMsg = score === 5 ? '🎉 Perfect Score!' : score >= 4 ? '🎯 Excellent!' : score === 3 ? '👍 Good Effort!' : score >= 1 ? '📚 Nice Try!' : '🔄 Try Again!';
    const scoreColor = score === 5 ? 'from-emerald-400 to-green-500' : score >= 3 ? 'from-amber-400 to-yellow-500' : 'from-rose-400 to-red-500';

    document.getElementById('scoreDisplay').innerHTML = `
        <div class="bg-gradient-to-r ${scoreColor} bg-clip-text text-transparent text-5xl lg:text-6xl font-black mb-4 tracking-wide">
            ${score}/${currentQuiz.length}
        </div>
        <div class="text-3xl font-bold text-white mb-2">${percentage}%</div>
        <p class="text-xl text-purple-100">${scoreMsg}</p>
    `;

    // ES6: .map() for results, Object.entries() for options
    document.getElementById('quizResults').innerHTML = currentQuiz.map((q, i) => {
        const userAns = userAnswers[i];
        const showCorrect = userAns !== q.correct || !userAns;
        const userCorrect = userAns === q.correct;
        return `
            <div class="p-6 rounded-2xl border-2 ${
                userCorrect ? 'border-emerald-400/50 bg-emerald-500/10' :
                userAns ? 'border-red-400/50 bg-red-500/10' : 'border-green-500/30 bg-white/10'
            }">
                <h5 class="text-xl font-bold text-white mb-4">
                    Q${i+1}: ${q.question}
                    ${userCorrect ? '<span class="text-emerald-400 ml-2">✅ Correct</span>' : 
                     userAns ? '<span class="text-red-400 ml-2">❌ Wrong</span>' : ''}
                </h5>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    ${Object.entries(q.options).map(([key, opt]) => {
                        let optClass = 'p-3 rounded-xl border font-semibold transition-all cursor-default';
                        if (key === q.correct) {
                            optClass += ' bg-emerald-500/20 border-emerald-400 text-emerald-300 font-black';
                        } else if (key === userAns) {
                            optClass += ' bg-red-500/20 border-red-400 text-red-300 line-through';
                        } else {
                            optClass += ' border-white/20 hover:border-green-400';
                        }
                        return `<div class="${optClass}">${key}) ${opt}</div>`;
                    }).join('')}
                </div>
                ${showCorrect ? `
                    <div class="p-4 bg-emerald-500/20 border border-emerald-400/50 rounded-xl">
                        <strong class="text-emerald-300 text-lg">✅ Correct Answer: ${q.correct}) ${q.options[q.correct]}</strong>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');

    document.getElementById('resultsSection').classList.remove('hidden');
};

// Event listeners
document.getElementById('getQuizBtn').addEventListener('click', fetchQuiz);
quizTopic.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') fetchQuiz();
});

// Project 3: Daily Affirmation
const fetchAffirmation = async () => {
    const apiKey = getApiKey();
    
    if (!apiKey) {
        affirmationText.textContent = '🔑 Please enter your API key above to get started!';
        return;
    }

    const prompt = `Give me a unique, uplifting, one-sentence positive affirmation. 
    Make it personal (use "you" or "I"), inspiring, and suitable for starting the day. 
    Just the affirmation, no quotes, no attribution, nothing else.`;

    affirmationText.innerHTML = `
        <span class="flex items-center gap-2">
            <span class="animate-pulse">✨</span>
            Finding your affirmation...
        </span>
    `;

    try {
        const affirmation = await callGeminiAPI(prompt);
        affirmationText.textContent = `"${affirmation.trim()}"`;
    } catch (error) {
        affirmationText.textContent = `Unable to fetch affirmation: ${error.message}`;
    }
};

document.getElementById('newAffirmationBtn').addEventListener('click', fetchAffirmation);

// Auto-load on page load (ES6: DOMContentLoaded)
document.addEventListener('DOMContentLoaded', () => {
    const existingKey = localStorage.getItem('geminiApiKey');
    apiKeyInput.value = getApiKey();

    if (existingKey) {
        apiStatus.textContent = '✅ API key loaded from storage';
        apiStatus.className = 'text-sm text-green-400 mt-2';
    } else {
        apiStatus.textContent = '✅ Using preloaded API key';
        apiStatus.className = 'text-sm text-green-300 mt-2';
    }

    fetchAffirmation();
    showDashboard();
});
