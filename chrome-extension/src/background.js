const WHAT_AM_I = MESSAGE_CLIENTS.BACKGROUND;
function SetupEnableOnlyOnAgroDataPage() {
    chrome.runtime.onInstalled.addListener(function () {
        // Replace all rules ...
        chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
            // With a new rule ...
            chrome.declarativeContent.onPageChanged.addRules([
                {
                    // That fires when a page's URL contains a 'g' ...
                    conditions: [
                        new chrome.declarativeContent.PageStateMatcher({
                            pageUrl: { urlContains: 'https://agmarknet.gov.in' },
                        })
                    ],
                    // And shows the extension's page action.
                    actions: [new chrome.declarativeContent.ShowPageAction()]
                }
            ]);
        });
    });
}
function main() {
    setUpMessageListeners();
    setupDownloadListeners();
    console.log("starting bg", new Date().toDateString(), new Date().toLocaleTimeString());
}

main();
