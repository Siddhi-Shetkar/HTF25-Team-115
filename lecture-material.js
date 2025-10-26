document.addEventListener('DOMContentLoaded', () => {
    const apiKey = "AIzaSyDDaZzNbVIL6mcbgWdPqmAl-BDMjz7ye5A";

    // --- PDF.js Worker Setup ---
    // Support multiple pdf.js global names (bundled or CDN builds)
    const pdfjsLib = window['pdfjs-dist/build/pdf'] || window.pdfjsLib || window.pdfjs;
    if (pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
    }

    // --- CHATBOT ---
    const chatWindow = document.getElementById('chat-window');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const typingIndicator = document.getElementById('typing-indicator');

    // Store chat history
    let chatHistory = [];
    const systemPrompt = "You are an expert AI teaching assistant. Help students understand their lecture materials, answer questions about the subject matter, and provide clear explanations.";

    function displayMessage(text, sender) {
        if (!chatWindow) return;
        const messageWrapper = document.createElement('div');
        const messageElement = document.createElement('div');
        
        messageElement.classList.add('p-3', 'rounded-lg', 'max-w-xs', 'md:max-w-md', 'shadow');
        messageElement.innerText = text;

        if (sender === 'user') {
            messageWrapper.classList.add('flex', 'justify-end');
            messageElement.classList.add('bg-blue-600', 'text-white');
        } else {
            messageWrapper.classList.add('flex', 'justify-start');
            messageElement.classList.add('bg-gray-200', 'text-gray-800');
        }

        messageWrapper.appendChild(messageElement);
        chatWindow.appendChild(messageWrapper);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    async function handleSendMessage() {
        const userMessage = messageInput.value.trim();
        if (userMessage === "") return;

        displayMessage(userMessage, 'user');
        chatHistory.push({ role: "user", parts: [{ text: userMessage }] });
        messageInput.value = "";
        typingIndicator.classList.remove('hidden');

        try {
            const botMessage = await getBotResponse(userMessage);
            chatHistory.push({ role: "model", parts: [{ text: botMessage }] });
            displayMessage(botMessage, 'bot');
        } catch (error) {
            console.error("Error fetching bot response:", error);
            displayMessage(`Sorry, an error occurred: ${error.message}`, 'bot');
        } finally {
            typingIndicator.classList.add('hidden');
        }
    }

    async function getBotResponse(userMessage) {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
        
        const payload = {
            contents: [
                ...chatHistory.slice(-10),
            ],
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            },
        };

        let response;
        let retries = 0;
        const maxRetries = 5;
        let delay = 1000;

        while (retries < maxRetries) {
            try {
                response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    const result = await response.json();
                    const botText = result.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (botText) return botText;
                    throw new Error("Invalid response structure from API.");
                } else if (response.status === 429 || response.status >= 500) {
                    throw new Error(`APIError: ${response.status}`);
                } else {
                    const errorResult = await response.json();
                    console.error("API Error:", errorResult);
                    return `Error: ${errorResult.error?.message || 'Failed to get response'}`;
                }
            } catch (error) {
                if (error.message.startsWith('APIError')) {
                    retries++;
                    if (retries >= maxRetries) {
                        throw new Error("Max retries reached. Please try again later.");
                    }
                    await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, retries - 1)));
                } else {
                    throw error;
                }
            }
        }
        
        throw new Error("Failed to get a response from the AI after all retries.");
    }

    if (sendButton) {
        sendButton.addEventListener('click', handleSendMessage);
    }
    if (messageInput) {
        messageInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                handleSendMessage();
            }
        });
    }

    // --- VIEW SWITCHING ---
    const navChat = document.getElementById('nav-chat');
    const navLecture = document.getElementById('nav-lecture');
    const chatbotView = document.getElementById('chatbot-view');
    const lectureView = document.getElementById('lecture-view');

    function setActiveNav(activeNav, activeView) {
        [navChat, navLecture].forEach(nav => {
            nav.classList.remove('text-blue-600', 'border-blue-600', 'border-b-2');
            nav.classList.add('text-gray-500');
        });
        [chatbotView, lectureView].forEach(view => {
            view.classList.add('hidden');
            view.classList.remove('flex');
        });

        activeNav.classList.add('text-blue-600', 'border-blue-600', 'border-b-2');
        activeNav.classList.remove('text-gray-500');
        activeView.classList.remove('hidden');
        activeView.classList.add('flex');
    }

    if (navChat) {
        navChat.addEventListener('click', () => {
            setActiveNav(navChat, chatbotView);
        });
    }

    if (navLecture) {
        navLecture.addEventListener('click', () => {
            setActiveNav(navLecture, lectureView);
        });
    }

    // --- LECTURE MATERIAL HANDLING ---
    const fileInput = document.getElementById('file-input');
    const summarizeBtn = document.getElementById('summarize-btn');
    const summaryOutput = document.getElementById('summary-output');
    const summarizerLoading = document.getElementById('summarizer-loading');
    const fileListEl = document.getElementById('file-list');
    const dropZone = document.getElementById('drop-zone');

    // Track the currently selected file (can be a File object)
    let selectedFile = null;

    if (summarizeBtn) {
        summarizeBtn.addEventListener('click', handleSummarizeClick);
    }

    // Handle file input changes
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files || []);
            updateFileList(files);
        });
    }

    // Drag & drop support
    if (dropZone) {
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('border-blue-500', 'bg-white');
        });

        dropZone.addEventListener('dragleave', (e) => {
            dropZone.classList.remove('border-blue-500', 'bg-white');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('border-blue-500', 'bg-white');
            const dtFiles = Array.from(e.dataTransfer.files || []);
            if (dtFiles.length) {
                // Populate the native file input so the rest of the code can reference it if needed
                try {
                    const dataTransfer = new DataTransfer();
                    dtFiles.forEach(f => dataTransfer.items.add(f));
                    if (fileInput) fileInput.files = dataTransfer.files;
                } catch (err) {
                    // Some browsers may not allow setting fileInput.files; fall back to using dtFiles directly
                    console.warn('Could not set fileInput.files programmatically', err);
                }

                updateFileList(dtFiles);
            }
        });
    }

    async function handleSummarizeClick() {
        // Use the selected file from the UI if available, otherwise fall back to the first file input file
        const file = selectedFile || (fileInput && fileInput.files && fileInput.files[0]);
        
        if (!file) {
            alert('Please select a file first.');
            return;
        }

        // Ensure summary section is visible
        const summarySection = document.getElementById('summary-section');
        if (summarySection) summarySection.classList.remove('hidden');

        summarizerLoading.classList.remove('hidden');
        summaryOutput.innerText = 'Working on it...';
        if (summarizeBtn) summarizeBtn.disabled = true;

        try {
            let text = '';
            if (file.type === 'text/plain') {
                text = await readTxtFile(file);
            } else if (file.type === 'application/pdf') {
                text = await readPdfFile(file);
            } else {
                throw new Error('Unsupported file type. Please upload a .txt or .pdf file.');
            }

            if (!text || text.trim().length === 0) {
                throw new Error('Could not extract any text from the file.');
            }

            // Show a short preview of the extracted text so users see progress
            try {
                const preview = text.length > 2000 ? text.slice(0, 2000) + '\n\n... (preview truncated)' : text;
                summaryOutput.innerText = 'Extracted text preview:\n\n' + preview;
            } catch (previewErr) {
                console.warn('Could not render preview', previewErr);
            }

            const summary = await getSummary(text);
            // Use innerText so any markup from the API is shown as text but line breaks are preserved
            summaryOutput.innerText = summary;

        } catch (error) {
            console.error('Summarization Error:', error);
            summaryOutput.innerText = `An error occurred: ${error.message}`;
        } finally {
            summarizerLoading.classList.add('hidden');
            if (summarizeBtn) summarizeBtn.disabled = false;
        }
    }

    // Update the visual file list and set the active file
    function updateFileList(files) {
        if (!fileListEl) return;
        fileListEl.innerHTML = '';

        if (!files || files.length === 0) {
            selectedFile = null;
            // Hide summary section if no file
            const summarySection = document.getElementById('summary-section');
            if (summarySection) summarySection.classList.add('hidden');
            return;
        }

        // Show summary section when there is at least one file
        const summarySection = document.getElementById('summary-section');
        if (summarySection) summarySection.classList.remove('hidden');

        files.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3';

            const info = document.createElement('div');
            info.className = 'flex-1';
            const name = document.createElement('div');
            name.className = 'font-medium text-gray-800';
            name.textContent = file.name;
            const meta = document.createElement('div');
            meta.className = 'text-sm text-gray-500';
            meta.textContent = `${file.type || 'Unknown type'} • ${formatBytes(file.size)}`;
            info.appendChild(name);
            info.appendChild(meta);

            const actions = document.createElement('div');
            actions.className = 'flex items-center space-x-2';

            const selectBtn = document.createElement('button');
            selectBtn.className = 'px-3 py-1 bg-blue-600 text-white rounded-lg text-sm';
            selectBtn.textContent = 'Select';
            selectBtn.addEventListener('click', () => {
                // mark as selected
                selectedFile = file;
                // update visual state
                Array.from(fileListEl.children).forEach(child => child.classList.remove('ring-2', 'ring-blue-200'));
                item.classList.add('ring-2', 'ring-blue-200');
            });

            const removeBtn = document.createElement('button');
            removeBtn.className = 'px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-sm';
            removeBtn.textContent = 'Remove';
            removeBtn.addEventListener('click', () => {
                // remove this file from the list
                const remaining = files.filter(f => f !== file);
                // update the native input if possible
                try {
                    const dataTransfer = new DataTransfer();
                    remaining.forEach(f => dataTransfer.items.add(f));
                    if (fileInput) fileInput.files = dataTransfer.files;
                } catch (err) {
                    // ignore
                }
                updateFileList(remaining);
            });

            actions.appendChild(selectBtn);
            actions.appendChild(removeBtn);

            item.appendChild(info);
            item.appendChild(actions);

            // auto-select the first file
            if (index === 0) {
                item.classList.add('ring-2', 'ring-blue-200');
                selectedFile = file;
            }

            fileListEl.appendChild(item);
        });
    }

    function formatBytes(bytes, decimals = 2) {
        if (!bytes) return '0 B';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    function readTxtFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read text file.'));
            reader.readAsText(file);
        });
    }

    function readPdfFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    if (!pdfjsLib) throw new Error('pdf.js library not loaded.');
                    // Use the { data } form which is more compatible across versions
                    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                    const pdf = await loadingTask.promise;
                    let allText = '';
                    
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map(item => item.str).join(' ');
                        allText += pageText + '\n\n';
                    }
                    resolve(allText);
                } catch (pdfError) {
                    reject(new Error(`Failed to parse PDF: ${pdfError.message}`));
                }
            };
            reader.onerror = (e) => reject(new Error('Failed to read PDF file.'));
            reader.readAsArrayBuffer(file);
        });
    }

    async function getSummary(textToSummarize) {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
        const summarySystemPrompt = "You are a helpful teaching assistant. Please provide a clear, structured summary of this lecture material. Break it down into main topics, key points, and important concepts. Use bullet points and sections to make it easy to understand.";

        const payload = {
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: "Please analyze and summarize this lecture material:\n\n" + textToSummarize }
                    ]
                }
            ],
            systemInstruction: {
                parts: [{ text: summarySystemPrompt }]
            },
        };

        let response;
        let retries = 0;
        const maxRetries = 5;
        let delay = 1000;

        while (retries < maxRetries) {
            try {
                response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    const result = await response.json();
                    const botText = result.candidates?.[0]?.content?.parts?.[0]?.text;
                    
                    if (botText) {
                        return botText;
                    } else {
                        if (result.candidates?.[0]?.finishReason === 'SAFETY') {
                             throw new Error("The content could not be summarized due to safety restrictions.");
                        }
                        throw new Error("Invalid response structure from API.");
                    }
                } else if (response.status === 429 || response.status >= 500) {
                    throw new Error(`APIError: ${response.status}`);
                } else {
                    const errorResult = await response.json();
                    console.error("API Error:", errorResult);
                    throw new Error(errorResult.error?.message || 'Failed to get response');
                }
            } catch (error) {
                if (error.message.startsWith('APIError')) {
                    retries++;
                    if (retries >= maxRetries) {
                        throw new Error("Max retries reached. The API might be overloaded. Please try again later.");
                    }
                    await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, retries - 1)));
                } else {
                    throw error;
                }
            }
        }
        
        throw new Error("Failed to get a summary after all retries.");
    }
});