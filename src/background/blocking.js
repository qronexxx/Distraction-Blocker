// Define the key outside the functions
let currentURL = window.location.href;
console.log(currentURL);
let hostname = currentURL.split('/')[2];
console.log(hostname);
var isUnblockedKey = 'isUnblocked_' + hostname;
var elements; 

chrome.storage.sync.get(isUnblockedKey, function(data) {
    console.log(data[isUnblockedKey]);
});

function increaseOpensCounter(hostname) {
    var opensCounterKey = 'opensCounter_' + hostname;
    chrome.storage.sync.get(opensCounterKey, function(data) {
        var newOpensCounter = (data[opensCounterKey] || 0) + 1;
        chrome.storage.sync.set({ [opensCounterKey]: newOpensCounter });
        console.log("OpensCounter updated for " + hostname + ":", newOpensCounter);
    });
}

function getOpensCounter(hostname) {
    var opensCounterKey = 'opensCounter_' + hostname;
    chrome.storage.sync.get(opensCounterKey, function(data) {
        var opensCounter = data[opensCounterKey] || 0;
        console.log("OpensCounter for " + hostname + ":", opensCounter);
    });
}

chrome.storage.sync.get('dailyOpens', function(data) {
    console.log('dailyOpens is ' + data.dailyOpens);
});

function blockSite() {
    chrome.storage.sync.get('isExtensionEnabled', function(data) {
        if (!data.isExtensionEnabled) {
            console.log('Extension is disabled');
            return;
        }

        // Pause all videos on the page
        var videos = document.getElementsByTagName("video");
        for (var i = 0; i < videos.length; i++) {
            videos[i].pause();
        }

        console.log('Blocking site...'); 

        // Create the blocking elements
        elements = createBlockingElements();

        // Append elements to the blocking background
        elements.blockingBackground.appendChild(elements.proceedButton);
        elements.blockingBackground.appendChild(elements.closeTabButton);
        elements.blockingBackground.appendChild(elements.heading);
        elements.blockingBackground.appendChild(elements.textNode);
        document.body.appendChild(elements.blockingBackground);

        // Set the initial time
        applyCountdown(elements.proceedButton);

        // Add event listeners to buttons
        elements.proceedButton.addEventListener("click", function() {
            chrome.runtime.sendMessage({action: "unblockAllTabsWithSameHostname"});
            chrome.runtime.sendMessage({message: "startCountdown"});
            increaseOpensCounter(hostname);
            elements.blockingBackground.style.display = "none"; // Use elements.blockingBackground instead of blockingBackground
        });

        elements.closeTabButton.addEventListener("click", function() {
            chrome.runtime.sendMessage({message: "closeCurrentTab"});
        });
    });
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "unblockSite") {
        // Ausblenden des Blockierungselements
        elements.blockingBackground.style.display = "none";
    }
});

// Call checkURL when the script is loaded
checkURL();

//display the time left in the title
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.message === "updateTitle") {
        document.title = request.timeLeft + " seconds left";
    } else if (request.message === "blockSite") {
        blockSite();
    }
    if (request.message === "removeOverlay") {
        elements.blockingBackground.style.display = "none";
    }
});

function checkURL() {
    chrome.storage.sync.get('blockedUrls', function(data) {
        var blockedUrls = data.blockedUrls || [];
        var currentURL = window.location.href;

        // Check if the current URL matches any of the blocked URLs
        for (var i = 0; i < blockedUrls.length; i++) {
            var urlPattern = blockedUrls[i];
            var urlRegex = new RegExp(urlPattern.replace(/\*/g, '.*').replace(/\//g, '\\/'));

            if (urlRegex.test(currentURL)) {
                // Get the isUnblocked value from storage
                chrome.storage.sync.get(isUnblockedKey, function(data) {
                    if (!data[isUnblockedKey]) {
                        blockSite();
                    }
                });
                // If a match is found, break the loop early
                break;
            }
        }
    });
}

function createBlockingElements() {
    // Create a new div element for blocking interaction
    var blockingBackground = document.createElement("div"); 
    blockingBackground.style.position = "fixed";
    blockingBackground.style.top = "0";
    blockingBackground.style.left = "0";
    blockingBackground.style.width = "100%";
    blockingBackground.style.height = "100%";
    blockingBackground.style.backgroundColor = "rgba(0,0,0,0.9)";
    blockingBackground.style.zIndex = "9999999"; // Very high z-index
    blockingBackground.style.color = "white";
    blockingBackground.style.display = "flex";
    blockingBackground.style.justifyContent = "center";
    blockingBackground.style.alignItems = "center";
    blockingBackground.style.pointerEvents = "auto"; // Ensure it's interactable

    // Create the proceed button
    var proceedButton = document.createElement("button");
    proceedButton.className = "bn632-hover bn20 disabled"; 
    proceedButton.innerHTML = "Proceed";
    proceedButton.disabled = true;
    proceedButton.style.position = "fixed";
    proceedButton.style.left = "55%";
    proceedButton.style.top = "50%";
    proceedButton.style.transform = "translateY(-50%)";
    proceedButton.innerHTML = "Proceed";

    // Create the close tab button
    var closeTabButton = document.createElement("button");
    closeTabButton.className = "bn632-hover bn27";
    closeTabButton.innerHTML = "Close Tab";
    closeTabButton.style.position = "fixed";
    closeTabButton.style.right = "55%";
    closeTabButton.style.top = "50%";
    closeTabButton.style.transform = "translateY(-50%)";

    // Create the text node
    var textNode = document.createElement("p");
    textNode.style.position = "absolute";
    textNode.style.top = "40%";
    textNode.style.width = "100%";
    textNode.style.textAlign = "center";
    textNode.style.fontSize = "20px";
    textNode.style.color = "white";
    textNode.style.fontFamily = "Arial, sans-serif";

    // Get the opens counter and daily opens
    var opensCounterKey = 'opensCounter_' + hostname;
    chrome.storage.sync.get([opensCounterKey, 'dailyOpens'], function(data) {
        var opensCounter = data[opensCounterKey] || 0;
        var dailyOpens = data.dailyOpens || 0;

        // Set the text
        textNode.textContent = hostname + " opens: " + opensCounter + " / " + dailyOpens;
    });

    // Add the styles to the page
    var style = document.createElement('style');
    style.innerHTML = `
    .bn632-hover {
        width: 160px;
        font-size: 16px;
        font-weight: 600;
        color: #fff;
        cursor: pointer;
        margin: 20px;
        height: 55px;
        text-align:center;
        border: none;
        background-size: 300% 100%;
        border-radius: 50px;
        moz-transition: all .4s ease-in-out;
        -o-transition: all .4s ease-in-out;
        -webkit-transition: all .4s ease-in-out;
        transition: all .4s ease-in-out;
    }

    .bn632-hover:hover {
        background-position: 100% 0;
        moz-transition: all .4s ease-in-out;
        -o-transition: all .4s ease-in-out;
        -webkit-transition: all .4s ease-in-out;
        transition: all .4s ease-in-out;
    }

    .bn632-hover.bn20.disabled {
        background-image: linear-gradient(
            to right,
            #808080,
            #A9A9A9,
            #C0C0C0,
            #D3D3D3
        );
        box-shadow: 0 4px 15px 0 rgba(128, 128, 128, 0.75);
        background-color: gray;
        cursor: not-allowed;
    }

    .bn632-hover:focus {
        outline: none;
    }

    .bn632-hover.bn20 {
        background-image: linear-gradient(
            to right,
            #667eea,
            #764ba2,
            #6b8dd6,
            #8e37d7
        );
        box-shadow: 0 4px 15px 0 rgba(116, 79, 168, 0.75);
    }

    .bn632-hover.bn27 {
        background-image: linear-gradient(
            to right,
            #ed6ea0,
            #ec8c69,
            #f7186a,
            #fbb03b
        );
        box-shadow: 0 4px 15px 0 rgba(236, 116, 149, 0.75);
    }
    `;
    document.head.appendChild(style);

    // Create the heading
    var heading = document.createElement("h1");
    heading.style.position = "absolute";
    heading.style.top = "30%";
    heading.style.width = "100%";
    heading.style.textAlign = "center";
    heading.style.fontSize = "45px";
    heading.style.margin = "0";
    heading.style.padding = "0";
    heading.style.color = "white";
    heading.style.fontFamily = "Arial, sans-serif";
    heading.textContent = "Are you wasting your time?";

    return {
        blockingBackground: blockingBackground, 
        proceedButton: proceedButton, 
        closeTabButton: closeTabButton, 
        heading: heading,
        textNode: textNode
    };
}

function applyCountdown(element) {
    var opensCounterKey = 'opensCounter_' + hostname;
    chrome.storage.sync.get([opensCounterKey, 'dailyOpens'], function(data) {
        var opensCounter = data[opensCounterKey] || 0;
        var dailyOpens = data.dailyOpens || 0;

        if (opensCounter >= dailyOpens) {
            element.classList.add('disabled'); // Add the disabled class
            element.innerHTML = "Blocked"; 
            return; // Don't start the countdown
        }

        chrome.storage.sync.get('reflectivePause', function(data) {
            var buttonVisibleIn = data.reflectivePause;
            // Update the button text every second
            var countdown = setInterval(function() {
                element.innerHTML = "Proceed (" + buttonVisibleIn + ")";
                buttonVisibleIn -= 1;
                if (buttonVisibleIn <= 0) {
                    clearInterval(countdown);
                    element.disabled = false;
                    element.classList.remove('disabled'); // Remove the disabled class
                    element.innerHTML = "Proceed";
                }
            }, 1000);
        });
    });
}
