chrome.action.onClicked.addListener((tab) => {
    chrome.tabs.create({
        url: chrome.runtime.getURL("index.html")
    });
});

// Set default values in storage
chrome.runtime.onInstalled.addListener(function() {
    chrome.storage.sync.set({ 
        'isUnblocked': false,
        'isExtensionEnabled': true,
        'limitTime': 15,
        'dailyOpens': 5,
        'reflectivePause': 5
    });
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.message === "closeCurrentTab") {
        // Get the current active tab
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            // Check if there's an active tab
            if (tabs[0]) {
                // Close the tab
                chrome.tabs.remove(tabs[0].id);
            }
        });
    }
});

function sendMessageToAllTabsWithHostname(hostname, message) {
    chrome.tabs.query({}, function(tabs) {
        tabs.forEach(function(tab) {
            if (tab.url.includes(hostname)) {
                chrome.tabs.sendMessage(tab.id, {message: message});
            }
        });
    });
}

// In background.js (Background Script)
chrome.runtime.onMessage.addListener(async function(request, sender, sendResponse) {
    if (request.action === "unblockAllTabsWithSameHostname") {
        // Extrahieren des Hostnamens aus dem Sender-Tab
        let url = await getUrl();
        let hostname = url.split('/')[2];

        // Abfragen aller Tabs
        chrome.tabs.query({}, function(tabs) {
            tabs.forEach(function(tab) {
                if (new URL(tab.url).hostname === hostname) {
                    // Senden einer Nachricht an Tabs mit dem gleichen Hostnamen
                    chrome.tabs.sendMessage(tab.id, {action: "unblockSite"});
                }
            });
        });
    }
});

async function getUrl() {
    let queryOptions = { active: true, currentWindow: true };
    let [tab] = await chrome.tabs.query(queryOptions);
    return tab.url;
}

let countdown = {}; // Add this line to declare and initialize the countdown variable

async function startCountdown(hostname, timeLeft) {
    console.log(hostname);
    countdown[hostname] = setInterval(function() {
        console.log("Time left for " + hostname + ": " + timeLeft);
        timeLeft -= 1;
        var timeLeftKey = 'timeLeft_' + hostname;
        chrome.storage.sync.set({ [timeLeftKey]: timeLeft });

        // Send a message to all tabs with the same hostname to update the time left
        chrome.tabs.query({}, function(tabs) {
            tabs.forEach(function(tab) {
                if (tab.url.includes(hostname)) {
                    chrome.tabs.sendMessage(tab.id, {message: "updateTitle", timeLeft: timeLeft});
                }
            });
        });

        if (timeLeft <= 0) {
            clearInterval(countdown[hostname]);
            console.log("Countdown ended for " + hostname + ". Blocking site...");
            var isUnblockedKey = 'isUnblocked_' + hostname;
            chrome.storage.sync.set({ [isUnblockedKey]: false });

            sendMessageToAllTabsWithHostname(hostname, "blockSite");
        }
    }, 1000);
}

chrome.runtime.onStartup.addListener(function() {
    isTimerRunning();
    checkTime();
});

// Listen for startCountdown from content scripts
chrome.runtime.onMessage.addListener(async function(request, sender, sendResponse) {
    if (request.message === "startCountdown") {
        // Extract hostname from sender's tab URL
        let url = await getUrl();
        let hostname = url.split('/')[2]; // Extract hostname from URL

        // Start the countdown with the limit time for the sender's tab
        chrome.storage.sync.get('limitTime', function(data) {
            startCountdown(hostname, data.limitTime);
            // Set isUnblocked to false for the sender's tab
            var isUnblockedKey = 'isUnblocked_' + hostname;
            chrome.storage.sync.set({ [isUnblockedKey]: true });
        });
    }
});


async function checkTime() {
    let url = await getUrl(); // Stellen Sie sicher, dass getUrl ein Promise zurückgibt
    let hostname = url.split('/')[2]; // Extrahiert den Hostnamen aus der URL

    // Get the isScheduleActive value from storage
    chrome.storage.sync.get('isScheduleActive', function(data) {
        console.log("isScheduleActive: " + data.isScheduleActive);
        // If isScheduleActive is false, stop the function
        if (!data.isScheduleActive) {
            console.log("Schedule is not active. Stopping checkTime function.");
            return;
        }

        var currentTime = new Date();

        // Get the start time and end time from storage
        chrome.storage.sync.get(['startTime', 'endTime'], function(data) {
            // Split the times into hours and minutes
            var startParts = data.startTime.split(':');
            var endParts = data.endTime.split(':');
    
            // Create Date objects with the current date and the stored times
            var startDate = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), startParts[0], startParts[1]);
            var endDate = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), endParts[0], endParts[1]);
            console.log("Start Date: " + startDate);
            console.log("End Date: " + endDate);
            // Check if the current time is between the start time and the end time
            if (currentTime >= startDate && currentTime <= endDate) {
                // First, check if the extension is already enabled
                chrome.storage.sync.get('isExtensionEnabled', function(data) {
                    if (!data.isExtensionEnabled) {
                        // If it is not, enable the extension
                        chrome.storage.sync.set({ 'isExtensionEnabled': true }, function() {
                            console.log("Enabling extension because of schedule");
                            sendMessageToAllTabsWithHostname(hostname, "blockSite");
                        });
                    }
                });
            } else {
                // If it's not, disable the extension
                chrome.storage.sync.set({ 'isExtensionEnabled': false });
                console.log("disabling  extension because of schedule");
            }
        });
    });
}

function scheduleCheckTime() {
    const now = new Date();
    const delay = 60000 - (now.getSeconds() * 1000 + now.getMilliseconds());
    setTimeout(function() {
        checkTime(); // Führen Sie die Funktion sofort aus, wenn die nächste volle Minute erreicht ist
        setInterval(checkTime, 60000); // Und dann jede weitere Minute
    }, delay);
}

// Starten Sie den Zeitplan
scheduleCheckTime();

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.message === "timeCheck") {
        console.log("Message received: timeCheck");
        checkTime();
    }
});