// API Configuration (ES6: const, template literals)
const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';
// Default key provided by user so they do not need to paste manually
const DEFAULT_API_KEY = 'AIzaSyAFJYw4rP1TxXwwcjH6Rovjty1Njj8IMcM';

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
const pageTitle = document.getElementById('pageTitle');
const pageDesc = document.getElementById('pageDesc');

const projectsDashboard = document.getElementById('projectsDashboard');

const showDashboard = () => {
    if (projectsDashboard) {
        projectsDashboard.classList.remove('hidden');
        document.querySelectorAll('.project-section').forEach(section => {
            section.classList.add('hidden');
        });
        pageTitle.textContent = "Workspace";
        pageDesc.textContent = "Manage your entertainment modules.";
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Update sidebar active state
        updateSidebarActive('dashboard');
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
        
        // Update Titles
        const titles = {
            joke: ["AI Jokebox", "Topic-driven algorithmic humor generation."],
            quiz: ["Smart Quiz", "Dynamic knowledge assessment modules."],
            affirmation: ["Mindfulness", "Curated daily affirmations for focus."]
        };
        [pageTitle.textContent, pageDesc.textContent] = titles[project];
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (project === 'affirmation') {
            fetchAffirmation();
        }
        updateSidebarActive(project);
    }
};

const updateSidebarActive = (activeId) => {
    const navButtons = document.querySelectorAll('#mainSidebar nav button');
    navButtons.forEach(btn => {
        const isDashboard = activeId === 'dashboard' && btn.textContent.includes('Dashboard');
        const isJoke = activeId === 'joke' && btn.textContent.includes('Joke');
        const isQuiz = activeId === 'quiz' && btn.textContent.includes('Quiz');
        const isAffirmation = activeId === 'affirmation' && btn.textContent.includes('Affirmation');
        
        if (isDashboard || isJoke || isQuiz || isAffirmation) {
            btn.className = "w-full h-12 flex items-center gap-4 px-4 rounded-xl bg-white/10 text-white font-bold transition-all";
        } else {
            btn.className = "w-full h-12 flex items-center gap-4 px-4 rounded-xl text-indigo-200/60 hover:text-white font-semibold transition-all hover:bg-white/5";
        }
    });
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

const saveApiKeyBtn = document.getElementById('saveApiKey');
if (saveApiKeyBtn) {
    saveApiKeyBtn.addEventListener('click', saveApiKey);
}

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
        return `Give a short, simple, funny joke about "${topic}". Respond in two parts separated by "---": 
        1. The joke in simple English (4-6 lines/sentences). 
        2. The EXACT SAME joke translated into Hindi (हिन्दी). 
        Make it silly, unexpected, and playful. Keep the vocabulary simple.`;
    };

    const showLoading = () => {
        jokeDisplay.innerHTML = `
            <div class="flex flex-col items-center gap-3 text-white">
                <div class="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full"></div>
                <span class="font-medium">Thinking of something funny...</span>
                <span class="text-xs text-indigo-300">कुकिंग अप अ जोक (Cooking up a joke)...</span>
            </div>
        `;
    };

    showLoading();

    let attempts = 0;
    while (attempts < 3) {
        try {
            const response = await callGeminiAPI(getPrompt());
            if (!response) throw new Error('Empty response');

            const [engJoke, hindiJoke] = response.split('---').map(s => s.trim());
            
            if (!engJoke || !hindiJoke) {
                attempts++;
                continue;
            }

            const lowerJoke = engJoke.toLowerCase();
            const hasBannedWord = bannedJokeWords.some(word => lowerJoke.includes(word));
            if (hasBannedWord || recentJokes.includes(engJoke)) {
                attempts += 1;
                continue; // try again for a different joke
            }

            recentJokes.push(engJoke);
            if (recentJokes.length > 5) recentJokes.shift();

            jokeDisplay.innerHTML = `
                <div class="flex flex-col gap-8 w-full">
                    <div class="relative">
                         <span class="absolute -top-4 -left-2 text-4xl text-white/10 italic font-serif">"</span>
                         <p class="text-white text-lg md:text-xl text-center leading-relaxed font-semibold italic relative z-10">
                            ${engJoke.replace(/\n/g, '<br>')}
                         </p>
                    </div>
                    <div class="h-px w-24 bg-gradient-to-r from-transparent via-white/20 to-transparent mx-auto"></div>
                    <div class="relative">
                         <p class="text-indigo-200 text-xl md:text-2xl text-center leading-relaxed font-bold font-sans relative z-10">
                            ${hindiJoke.replace(/\n/g, '<br>')}
                         </p>
                    </div>
                </div>
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
        <div class="max-w-4xl mx-auto py-4 md:py-8 px-0 sm:px-4">
            <header class="text-center mb-8 md:mb-12">
                <span class="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-3 inline-block">Active Assessment</span>
                <h3 class="text-2xl md:text-4xl font-black text-white mb-4 tracking-tight capitalize">${quizTopic.value} Quiz</h3>
                <div class="w-16 md:w-24 h-1 bg-emerald-500/30 mx-auto rounded-full"></div>
            </header>

            <form id="quizForm" class="space-y-6 md:space-y-8">
                ${currentQuiz.map((q, index) => `
                    <div class="glass-card p-5 md:p-10 rounded-2xl md:rounded-[32px] border border-white/5 relative overflow-hidden group animate-in slide-in-from-bottom-6 duration-700" style="animation-delay: ${index * 150}ms">
                        <div class="absolute top-0 left-0 w-1 md:w-1.5 h-full bg-emerald-500/20 group-hover:bg-emerald-500/50 transition-colors"></div>
                        
                        <div class="flex flex-col gap-4">
                            <div class="flex items-center gap-3">
                                <span class="flex-shrink-0 w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-sm md:text-lg">
                                    ${index + 1}
                                </span>
                                <h4 class="text-lg md:text-2xl font-bold text-white leading-tight">${q.question}</h4>
                            </div>

                            <div class="grid grid-cols-1 gap-3 mt-2">
                                ${Object.entries(q.options).map(([key, opt]) => `
                                    <label class="relative group/opt cursor-pointer">
                                        <input type="radio" name="q${index}" value="${key}" class="peer sr-only">
                                        <div class="p-4 md:p-5 rounded-xl md:rounded-2xl bg-white/5 border border-white/10 text-indigo-100 font-medium transition-all duration-300 peer-checked:bg-emerald-500/20 peer-checked:border-emerald-500/50 peer-checked:ring-2 peer-checked:ring-emerald-500/20 group-hover/opt:bg-white/10 group-hover/opt:border-white/20 flex items-center gap-3 md:gap-4">
                                            <span class="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] md:text-xs font-black text-indigo-300 peer-checked:bg-emerald-500/20 peer-checked:text-emerald-400 peer-checked:border-emerald-500/30 uppercase transition-all">
                                                ${key}
                                            </span>
                                            <span class="flex-1 text-sm md:text-base">${opt}</span>
                                        </div>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </form>

            <div class="mt-12 md:mt-16 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6">
                <button id="submitQuizBtn" type="button" class="btn-primary w-full md:w-auto px-10 md:px-12 py-4 md:py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl md:rounded-2xl shadow-2xl shadow-emerald-900/40 transition-all flex items-center justify-center gap-3 group">
                    <span>Submit Assessment</span>
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </button>
                <button id="newQuizBtn" type="button" class="w-full md:w-auto px-8 md:px-10 py-4 md:py-5 bg-white/5 hover:bg-white/10 text-indigo-200 hover:text-white font-bold rounded-xl md:rounded-2xl border border-white/10 transition-all">
                    Reset Form
                </button>
            </div>

            <div id="resultsSection" class="mt-20 hidden animate-in zoom-in-95 duration-1000">
                <div id="scoreDisplay" class="glass-panel p-12 text-center relative overflow-hidden mb-12">
                    <div class="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none"></div>
                    <!-- Content populated by displayResults -->
                </div>
                <div id="quizResults" class="space-y-6"></div>
            </div>
        </div>
    `;

    document.getElementById('submitQuizBtn').addEventListener('click', submitQuiz);
    document.getElementById('newQuizBtn').addEventListener('click', () => {
        document.getElementById('quizForm').reset();
        document.getElementById('resultsSection').classList.add('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
const generateQuizBtn = document.getElementById('generateQuizBtn');
if (generateQuizBtn) {
    generateQuizBtn.addEventListener('click', fetchQuiz);
}
// Keep getQuizBtn as fallback if needed but focus on the new one
const getQuizBtn = document.getElementById('getQuizBtn');
if (getQuizBtn) {
    getQuizBtn.addEventListener('click', fetchQuiz);
}

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

    const prompt = `Give me EXACTLY ONE unique, uplifting, one-sentence positive affirmation. 
    Make it personal (use "you" or "I"), inspiring, and suitable for starting the day. 
    Respond with ONLY the text of that one affirmation. No choices, no list, no quotes, no attribution.`;

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

const refreshAffirmation = document.getElementById('refreshAffirmation');
if (refreshAffirmation) {
    refreshAffirmation.addEventListener('click', fetchAffirmation);
}
const newAffirmationBtn = document.getElementById('newAffirmationBtn');
if (newAffirmationBtn) {
    newAffirmationBtn.addEventListener('click', fetchAffirmation);
}

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
