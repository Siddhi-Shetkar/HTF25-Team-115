// Add this to the beginning of your DOMContentLoaded event handler

// File Upload Functionality
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileList = document.getElementById('file-list');
const summarySection = document.getElementById('summary-section');
let uploadedFiles = [];

// Drag and drop handlers
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, unhighlight, false);
});

function highlight(e) {
    dropZone.classList.add('border-blue-500', 'bg-blue-50');
}

function unhighlight(e) {
    dropZone.classList.remove('border-blue-500', 'bg-blue-50');
}

// Handle dropped files
dropZone.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

// Handle files from input
fileInput.addEventListener('change', function() {
    handleFiles(this.files);
});

function handleFiles(files) {
    [...files].forEach(file => {
        // Check file type
        const validTypes = ['.txt', '.pdf', '.doc', '.docx'];
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        
        if (validTypes.includes(fileExtension)) {
            uploadedFiles.push(file);
            displayFile(file);
            summarySection.classList.remove('hidden');
        } else {
            alert(`File type ${fileExtension} is not supported. Please upload PDF, TXT, DOC, or DOCX files.`);
        }
    });
}

function displayFile(file) {
    const fileElement = document.createElement('div');
    fileElement.className = 'flex items-center justify-between p-3 bg-white rounded-lg shadow border border-gray-200';
    
    // Get file size in MB
    const size = (file.size / (1024 * 1024)).toFixed(2);
    
    fileElement.innerHTML = `
        <div class="flex items-center space-x-3">
            <svg class="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
            <div>
                <p class="text-sm font-medium text-gray-800">${file.name}</p>
                <p class="text-xs text-gray-500">${size} MB</p>
            </div>
        </div>
        <button 
            class="text-red-500 hover:text-red-700 focus:outline-none"
            onclick="removeFile('${file.name}')"
        >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
        </button>
    `;
    
    fileList.appendChild(fileElement);
}

// Function to remove file
window.removeFile = function(fileName) {
    uploadedFiles = uploadedFiles.filter(file => file.name !== fileName);
    updateFileList();
    
    if (uploadedFiles.length === 0) {
        summarySection.classList.add('hidden');
    }
}

function updateFileList() {
    fileList.innerHTML = '';
    uploadedFiles.forEach(file => displayFile(file));
}