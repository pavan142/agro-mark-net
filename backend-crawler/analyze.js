const fs = require("fs");
let stateCode = process.argv[3];
let cropName = process.argv[2];
stateCode = stateCode ? stateCode : "GJ"
cropName = cropName ? cropName: "Onion"
const data = JSON.parse(fs.readFileSync(`./data/${cropName}/${cropName}_${stateCode}.json`))

let markets = Object.keys(data)
let totalRequests = markets.length * 132;

let optimizedRequests = 0;
let mandatoryRequests = 0;
let marketYears = [];
for (let i = 0; i < markets.length; i++) {
    let years = {};
    let intervals = Object.keys(data[markets[i]]);
    for (let interval of intervals) {
        mandatoryRequests++;
        years[interval.substr(4)] = true;
    }
    // console.log(years)
    let mandatoryYears = Object.keys(years);
    marketYears.push(mandatoryYears.length);
    optimizedRequests += 12 * mandatoryYears.length + 11
    // console.log(mandatoryYears.length);
}
console.log(totalRequests, mandatoryRequests, optimizedRequests);
