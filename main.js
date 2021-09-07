console.log("Building at ", new Date().toDateString(), new Date().toLocaleTimeString());
const path = require("path");
const fs = require("fs");

const EXTENSION_PATH= "./chrome-extension"
const SOURCE_PATH = `${EXTENSION_PATH}/src`;
const DESITNATION_PATH = `${EXTENSION_PATH}/dist`;

const commonCode = fs.readFileSync(`${SOURCE_PATH}/common.js`);

const contentCode = fs.readFileSync(`${SOURCE_PATH}/content.js`);
const finalContentCode = commonCode + "\n\n" + contentCode;
fs.writeFileSync(`${DESITNATION_PATH}/content.js`, finalContentCode);

const backgroundCode = fs.readFileSync(`${SOURCE_PATH}/background.js`);
const finalBackgroundCode = commonCode + "\n\n" + backgroundCode;
fs.writeFileSync(`${DESITNATION_PATH}/background.js`, finalBackgroundCode);

const popupCode = fs.readFileSync(`${SOURCE_PATH}/popup.js`);
const finalPopupCode = commonCode + "\n\n" + popupCode;
fs.writeFileSync(`${DESITNATION_PATH}/popup.js`, finalPopupCode);

setTimeout(() => {
  console.log("waiting for changes");
}, 1000000)
