// DOM elements
const form = document.getElementById('savePreferences');
const dailyOpensInput = document.getElementById('dailyOpens');
const limitTimeInput = document.getElementById('limitTime');
const scheduleSwitch = document.getElementById('scheduleSwitch');
const startTime = document.getElementById('startTime');
const endTime = document.getElementById('endTime');
const darkModeToggle = document.getElementById('darkModeToggle');
const reflectivePauseInput = document.getElementById('reflectivePause');
const blockedUrlsList = document.getElementById('blockedUrlsList');
const extensionSwitch = document.getElementById('extensionSwitch');
const scheduleForms = document.getElementById('scheduleForms');
const blockUrlButton = document.getElementById('blockUrlButton');
const urlInput = document.getElementById('urlToBlock');

// Load values from storage on window load
window.onload = function() {
    loadPreferences();
    loadExtensionSwitch();
    loadScheduleSettings();
    loadDarkMode();
    loadReflectivePause();
    updateBlockedUrlsList();
};

// Load preferences from storage
function loadPreferences() {
    chrome.storage.sync.get(['dailyOpens', 'limitTime'], function(items) {
        if (items.dailyOpens) dailyOpensInput.value = items.dailyOpens;
        if (items.limitTime) limitTimeInput.value = items.limitTime;
    });
}

// Load extension switch state
function loadExtensionSwitch() {
    chrome.storage.sync.get('isExtensionEnabled', function(data) {
        extensionSwitch.checked = data.isExtensionEnabled;
    });
}

// Load schedule settings
function loadScheduleSettings() {
    chrome.storage.sync.get(['scheduleSwitch', 'startTime', 'endTime'], function(data) {
        scheduleSwitch.checked = data.scheduleSwitch;
        startTime.value = data.startTime || '';
        endTime.value = data.endTime || '';
        scheduleForms.style.display = data.scheduleSwitch ? 'block' : 'none';
    });
}

// Load dark mode state
function loadDarkMode() {
    chrome.storage.sync.get('isDarkMode', function(data) {
        const isDarkMode = data.isDarkMode;
        document.body.classList.toggle('dark-mode', isDarkMode);
        darkModeToggle.innerHTML = isDarkMode 
            ? '<img src="../images/day-sunny-icon.png" width="16" height="16">' 
            : '<img src="../images/moon-line-icon.png" width="16" height="16">';
        
        const buttons = blockedUrlsList.querySelectorAll('.list-group-item');
        buttons.forEach(button => {
            button.classList.toggle('list-group-item-dark', isDarkMode);
        });

        // Toggle border-dark-mode class on blockedUrlsList
        blockedUrlsList.classList.toggle('border-dark-mode', isDarkMode);
    });
}

// Load reflective pause setting
function loadReflectivePause() {
    chrome.storage.sync.get('reflectivePause', function(data) {
        reflectivePauseInput.value = data.reflectivePause || 5;
    });
}

// Update blocked URLs list
async function updateBlockedUrlsList() {
    const data = await chrome.storage.sync.get('blockedUrls');
    const blockedUrls = data.blockedUrls || [];
    blockedUrlsList.innerHTML = blockedUrls.map(url => 
        `<div class="list-group-item list-group-item-action${document.body.classList.contains('dark-mode') ? ' list-group-item-dark' : ''}">
            ${url}
            <button type="button" class="delete-button" data-url="${url}" style="border: none; background: none; float: right;">
                <img src="../images/trash.png" width="16" height="16" alt="Delete">
            </button>
        </div>`
    ).join('');

    // Add event listener to delete buttons
    document.querySelectorAll('.delete-button').forEach(button => {
        button.addEventListener('click', deleteUrlElement);
    });
}

async function deleteUrlElement() {
    const urlToDelete = this.dataset.url;
    const data = await chrome.storage.sync.get('blockedUrls');
    const blockedUrls = data.blockedUrls || [];
    const index = blockedUrls.indexOf(urlToDelete);
    if (index > -1) {
        blockedUrls.splice(index, 1);
        await chrome.storage.sync.set({'blockedUrls': blockedUrls});
        updateBlockedUrlsList();
    }
}

// Event listeners
extensionSwitch.addEventListener('change', function() {
    chrome.storage.sync.set({ 'isExtensionEnabled': this.checked });
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.tabs.reload(tabs[0].id);
    });
});

scheduleSwitch.addEventListener('change', function() {
    var isScheduleActive = this.checked;
    chrome.storage.sync.set({'isScheduleActive': isScheduleActive}, function() {
        console.log('Schedule state has been updated to: ' + isScheduleActive);
    });
    // Directly update the visibility of scheduleForms when the switch is toggled
    scheduleForms.style.display = isScheduleActive ? 'block' : 'none';
});

startTime.addEventListener('change', function() {
    chrome.storage.sync.set({ 'startTime': this.value });
});

endTime.addEventListener('change', function() {
    chrome.storage.sync.set({ 'endTime': this.value });
});

form.addEventListener("click", function(event) {
    event.preventDefault();
    savePreferences();
    reloadActiveTab();
    sendTimeCheckMessage();
    setTimeout(loadExtensionSwitch, 100);
});

darkModeToggle.addEventListener('click', function() {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    chrome.storage.sync.set({ 'isDarkMode': isDarkMode });

    darkModeToggle.innerHTML = isDarkMode 
        ? '<img src="../images/day-sunny-icon.png" width="16" height="16">' 
        : '<img src="../images/moon-line-icon.png" width="16" height="16">';

    const buttons = blockedUrlsList.querySelectorAll('.list-group-item');
    buttons.forEach(button => {
        button.classList.toggle('list-group-item-dark', isDarkMode);
    });
});

blockUrlButton.addEventListener('click', function(event) {
    event.preventDefault();
    const url = urlInput.value;
    if (!isValidUrl(url)) {
        alert('Please enter a valid URL. It must be in the format www.example.com.');
        return;
    }
    addBlockedUrl(url);
    urlInput.value = '';
});

function savePreferences() {
    chrome.storage.sync.set({
        'dailyOpens': dailyOpensInput.value,
        'limitTime': limitTimeInput.value,
        'scheduleSwitch': scheduleSwitch.checked,
        'startTime': startTime.value,
        'endTime': endTime.value,
        'reflectivePause': reflectivePauseInput.value
    }, function() {
        console.log('Values are set in storage.');
    });
}

function reloadActiveTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.tabs.reload(tabs[0].id);
    });
}

function sendTimeCheckMessage() {
    chrome.runtime.sendMessage({ message: "timeCheck" }, function(response) {
        console.log("Message sent: timeCheck");
    });
}

function isValidUrl(url) {
    const urlRegex = /^www\.([a-z\d]([a-z\d-]*[a-z\d])*\.)+[a-z]{2,}$/i;
    return urlRegex.test(url);
}

function addBlockedUrl(url) {
    chrome.storage.sync.get('blockedUrls', function(data) {
        const blockedUrls = data.blockedUrls || [];
        blockedUrls.push(url);
        chrome.storage.sync.set({ 'blockedUrls': blockedUrls }, function() {
            alert('URL successfully blocked.');
            updateBlockedUrlsList();
        });
    });
}