const WHAT_AM_I=MESSAGE_CLIENTS.POPUP;
function main() {
    let cropSelector = document.getElementById("crop_selector");
    let startBtn = document.getElementById("start_automation");
    let stopBtn = document.getElementById("stop_automation");
    let innerHtml = "";
    for (let key of Object.keys(CropsToCode)) {
        let value = CropsToCode[key];
        innerHtml += `<option value=${value}>${key}</option>`
    }
    cropSelector.innerHTML = innerHtml;
    startBtn.onclick = (() => {
        let selectedCrop = cropSelector.value;
        console.log("the selected crop is", selectedCrop);
        stopBtn.style.display="block";
        onStartButtonClicked(selectedCrop);
    })
}
main();
