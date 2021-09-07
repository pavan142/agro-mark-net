const WHAT_AM_I = MESSAGE_CLIENTS.CONTENT;
function main() {
    setUpMessageListeners();
    let id = setInterval(() => {
        var districtExpandBtn = document.getElementById("cphBody_GridArrivalData_imgOrdersShow_0");
        if (!districtExpandBtn) {
            console.log("Loading....");
        }
        console.log("All buttons loaded...");
        clearInterval(id);
        console.log("sending page loaded event");
        sendPageLoadedEvent()
    }, 500)
}
main()