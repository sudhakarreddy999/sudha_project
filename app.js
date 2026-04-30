document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const form = document.getElementById('generatorForm');
    const themeInput = document.getElementById('themeInput');
    const styleInput = document.getElementById('styleInput');
    const generateBtn = document.getElementById('generateBtn');
    const btnText = document.getElementById('btnText');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const errorMessage = document.getElementById('errorMessage');
    
    const resultCard = document.getElementById('resultCard');
    const resultText = document.getElementById('resultText');
    const copyBtn = document.getElementById('copyBtn');
    const exportBtn = document.getElementById('exportBtn');
    
    const historyList = document.getElementById('historyList');
    const refreshHistoryBtn = document.getElementById('refreshHistoryBtn');
    
    const themeToggle = document.getElementById('themeToggle');
    const surpriseBtn = document.getElementById('surpriseBtn');
    
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    const API_BASE_URL = 'http://127.0.0.1:5000/api';

    // Dark Mode Toggle Logic
    // Check local storage or system preference
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }

    themeToggle.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        if (document.documentElement.classList.contains('dark')) {
            localStorage.theme = 'dark';
        } else {
            localStorage.theme = 'light';
        }
    });

    // Random Prompts for "Surprise Me"
    const randomThemes = [
        "A cyberpunk samurai drinking tea in a neon-lit alleyway",
        "A peaceful enchanted forest glowing with bioluminescent mushrooms",
        "An astronaut riding a skateboard on the rings of Saturn",
        "A majestic dragon made entirely of crystal glass",
        "A cozy rainy cafe run by anthropomorphic cats",
        "A floating steampunk city in the clouds",
        "A mysterious ancient temple submerged underwater",
        "A mecha robot reading a book in a sunlit library"
    ];

    surpriseBtn.addEventListener('click', () => {
        const randomTheme = randomThemes[Math.floor(Math.random() * randomThemes.length)];
        themeInput.value = randomTheme;
        
        // Pick a random style too (skip the first "Any" option)
        const styleOptions = Array.from(styleInput.options).slice(1);
        const randomStyle = styleOptions[Math.floor(Math.random() * styleOptions.length)].value;
        styleInput.value = randomStyle;
        
        // Add a little pop animation to input
        themeInput.classList.add('scale-[1.02]', 'ring-2', 'ring-indigo-400');
        setTimeout(() => {
            themeInput.classList.remove('scale-[1.02]', 'ring-2', 'ring-indigo-400');
        }, 200);
    });

    // Show Toast Notification
    function showToast(msg, isError = false) {
        toastMessage.textContent = msg;
        const icon = toast.querySelector('i');
        if (isError) {
            icon.className = 'ph ph-warning-circle text-red-400 text-xl';
        } else {
            icon.className = 'ph ph-check-circle text-green-400 text-xl';
        }
        
        toast.classList.remove('translate-y-20', 'opacity-0');
        
        setTimeout(() => {
            toast.classList.add('translate-y-20', 'opacity-0');
        }, 3000);
    }

    // Form Submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const theme = themeInput.value.trim();
        const style = styleInput.value;
        
        if (!theme) return;

        // UI Loading State
        errorMessage.classList.add('hidden');
        btnText.classList.add('hidden');
        loadingSpinner.classList.remove('hidden');
        generateBtn.disabled = true;
        resultCard.classList.add('hidden');
        resultCard.classList.remove('opacity-100', 'translate-y-0');

        try {
            const response = await fetch(`${API_BASE_URL}/generate-prompt`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ theme, style })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate prompt');
            }

            // Show result
            resultText.textContent = data.prompt;
            resultCard.classList.remove('hidden');
            
            // Trigger animation
            setTimeout(() => {
                resultCard.classList.remove('opacity-0', 'translate-y-4');
                resultCard.classList.add('opacity-100', 'translate-y-0');
            }, 50);

            // Fetch history to update the list
            fetchHistory();

        } catch (error) {
            console.error('Generation Error:', error);
            errorMessage.textContent = error.message || 'An error occurred. Please make sure the backend server is running.';
            errorMessage.classList.remove('hidden');
        } finally {
            // Restore UI
            btnText.classList.remove('hidden');
            loadingSpinner.classList.add('hidden');
            generateBtn.disabled = false;
        }
    });

    // Copy to Clipboard
    copyBtn.addEventListener('click', () => {
        const text = resultText.textContent;
        navigator.clipboard.writeText(text).then(() => {
            showToast('Prompt copied to clipboard!');
            
            // Visual feedback on button
            const icon = copyBtn.querySelector('i');
            icon.className = 'ph ph-check text-green-500 text-lg';
            setTimeout(() => {
                icon.className = 'ph ph-copy text-lg';
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            showToast('Failed to copy to clipboard', true);
        });
    });

    // Export as TXT
    exportBtn.addEventListener('click', () => {
        const text = resultText.textContent;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `art-prompt-${new Date().getTime()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('Prompt exported as text file!');
    });

    // Fetch History
    async function fetchHistory() {
        try {
            refreshHistoryBtn.querySelector('i').classList.add('animate-spin');
            
            const response = await fetch(`${API_BASE_URL}/history`);
            const data = await response.json();
            
            if (response.ok && data.history && data.history.length > 0) {
                renderHistory(data.history);
            } else if (data.history && data.history.length === 0) {
                // Keep the default empty state
            }
        } catch (error) {
            console.error('History Fetch Error:', error);
            // Optionally show error in history panel
        } finally {
            setTimeout(() => {
                refreshHistoryBtn.querySelector('i').classList.remove('animate-spin');
            }, 500);
        }
    }

    // Render History
    function renderHistory(items) {
        historyList.innerHTML = ''; // Clear current
        
        items.forEach((item, index) => {
            const date = new Date(item.timestamp).toLocaleDateString(undefined, { 
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            
            const div = document.createElement('div');
            div.className = 'history-item-enter bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-colors group cursor-pointer';
            div.style.animationDelay = `${index * 0.05}s`;
            
            // Truncate text for preview
            const previewText = item.prompt.length > 100 ? item.prompt.substring(0, 100) + '...' : item.prompt;
            
            div.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <span class="text-xs font-semibold px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-md">
                        ${item.style}
                    </span>
                    <span class="text-xs text-gray-400">${date}</span>
                </div>
                <p class="text-sm text-gray-700 dark:text-gray-300 mb-3 font-medium line-clamp-2" title="${item.theme}">
                    "${item.theme}"
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400 italic line-clamp-3 mb-3">
                    ${previewText}
                </p>
                <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="use-prompt-btn p-1.5 bg-white dark:bg-gray-700 rounded-md shadow-sm border border-gray-200 dark:border-gray-600 hover:text-indigo-500 transition-colors text-xs flex items-center gap-1" data-prompt="${encodeURIComponent(item.prompt)}">
                        <i class="ph ph-copy"></i> Copy
                    </button>
                </div>
            `;
            
            historyList.appendChild(div);
        });

        // Add event listeners to newly created buttons
        document.querySelectorAll('.use-prompt-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const text = decodeURIComponent(btn.getAttribute('data-prompt'));
                navigator.clipboard.writeText(text).then(() => {
                    showToast('Past prompt copied!');
                });
            });
        });
        
        // Make the whole card clickable to view
        document.querySelectorAll('.history-item-enter').forEach(card => {
            card.addEventListener('click', () => {
                const promptText = card.querySelector('.use-prompt-btn').getAttribute('data-prompt');
                resultText.textContent = decodeURIComponent(promptText);
                resultCard.classList.remove('hidden');
                resultCard.classList.add('opacity-100', 'translate-y-0');
                
                // Scroll to result
                window.scrollTo({
                    top: resultCard.offsetTop - 100,
                    behavior: 'smooth'
                });
            });
        });
    }

    refreshHistoryBtn.addEventListener('click', fetchHistory);

    // Initial fetch
    fetchHistory();
});
