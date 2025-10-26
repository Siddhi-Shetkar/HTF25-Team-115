document.addEventListener('DOMContentLoaded', () => {
    const apiKey = "AIzaSyDDaZzNbVIL6mcbgWdPqmAl-BDMjz7ye5A";

    // --- CHATBOT ---
    const chatWindow = document.getElementById('chat-window');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const typingIndicator = document.getElementById('typing-indicator');
    let chatHistory = [];
    const systemPrompt = "You are a friendly and helpful AI assistant. Answer the user's questions clearly and concisely.";

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
            if (apiKey === "YOUR_API_KEY_HERE") {
                throw new Error("API key is not set. Please add your API key to script.js.");
            }
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
    const navTasks = document.getElementById('nav-tasks');
    const chatbotView = document.getElementById('chatbot-view');
    const tasksView = document.getElementById('tasks-view');

        // Only execute view-switching code if all required elements exist
        if (navChat && navTasks && chatbotView && tasksView) {
        navChat.addEventListener('click', () => {
            chatbotView.classList.remove('hidden');
            chatbotView.classList.add('flex');
            tasksView.classList.add('hidden');
            tasksView.classList.remove('flex');
            navChat.classList.add('text-blue-600', 'border-blue-600', 'border-b-2');
            navTasks.classList.remove('text-blue-600', 'border-blue-600', 'border-b-2');
        });

        navTasks.addEventListener('click', () => {
            chatbotView.classList.add('hidden');
            chatbotView.classList.remove('flex');
            tasksView.classList.remove('hidden');
            tasksView.classList.add('flex');
            navTasks.classList.add('text-blue-600', 'border-blue-600', 'border-b-2');
            navChat.classList.remove('text-blue-600', 'border-blue-600', 'border-b-2');
        });
    }

    // --- TASK MANAGER ---
    const taskForm = document.getElementById('task-form');
    const taskNameInput = document.getElementById('task-name');
    const taskDateInput = document.getElementById('task-date');
    const taskList = document.getElementById('task-list');

    loadTasks();

    if (taskForm) {
        taskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const taskName = taskNameInput.value.trim();
            const taskDate = taskDateInput.value;

            if (taskName === '' || taskDate === '') {
                alert('Please fill in both the task name and the due date.');
                return;
            }

            const task = {
                id: Date.now(),
                name: taskName,
                date: taskDate
            };

            createTaskElement(task);
            saveTask(task);
            taskNameInput.value = '';
            taskDateInput.value = '';
        });
    }

    function createTaskElement(task) {
        const li = document.createElement('li');
        li.className = 'task-item';
        li.setAttribute('data-id', task.id);

        li.innerHTML = `
            <div class="task-info">
                <span class="task-name">${task.name}</span>
                <span class="task-due-date">Due: ${task.date}</span>
            </div>
            <button class="delete-btn">Delete</button>
        `;

        li.querySelector('.delete-btn').addEventListener('click', () => {
            li.remove();
            removeTask(task.id);
        });

        taskList.appendChild(li);
    }

    function loadTasks() {
        const tasks = getTasksFromStorage();
        tasks.forEach(task => createTaskElement(task));
    }

    function saveTask(task) {
        const tasks = getTasksFromStorage();
        tasks.push(task);
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    function removeTask(id) {
        let tasks = getTasksFromStorage();
        tasks = tasks.filter(task => task.id !== id);
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    function getTasksFromStorage() {
        return JSON.parse(localStorage.getItem('tasks')) || [];
    }
});