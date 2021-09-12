const fs = require("fs");
const { Parser } = require("json2csv");

const { siteInfo, cropsToCode, codeToCrops, statesToCode, codeToStates, months } = require("./constants");
let cropName = process.argv[2];
cropName = cropName ? cropName : "Onion"
let fileBaseName = `data/${cropName}/${cropName}`
let jsonFile = `${fileBaseName}.json`
let csvFile = `${fileBaseName}.csv`

let globaData = {};

let startYear = 2010;
let endYear = 2020;

const STATE_MARKET_MAP_FILE = "./state-market-map.json";

var stateMarketMap = {};
if (fs.existsSync(STATE_MARKET_MAP_FILE)) {
    stateMarketMap = JSON.parse(fs.readFileSync(STATE_MARKET_MAP_FILE))
}

var marketToStateCode = {};
for (let stateCode of Object.keys(stateMarketMap)) {
    let markets = stateMarketMap[stateCode];
    for (let market of markets) {
        marketToStateCode[market.name] = stateCode;
    }
}


function PrefillZeros() {
    for (let year = startYear; year <= endYear; year++) {
        globaData[year] = {}
        for (let month of Object.keys(months)) {
            globaData[year][month] = {};
            for (let stateCode of Object.keys(codeToStates)) {
                globaData[year][month][stateCode] = {};
                let markets = stateMarketMap[stateCode]
                for (let market of markets) {
                    globaData[year][month][stateCode][market.name] = 0;
                }
            }
        }
    }
}

const codeToYear = {
    "10": "2010",
    "11": "2011",
    "12": "2012",
    "13": "2013",
    "14": "2014",
    "15": "2015",
    "16": "2016",
    "17": "2017",
    "18": "2018",
    "19": "2019",
    "20": "2020",
}

function Populate() {
    for (let stateCode of Object.keys(codeToStates)) {
        let filename = `data/${cropName}/${cropName}_${stateCode}.json`;
        console.log("Processing", stateCode, filename);
        if (fs.existsSync(filename)) {
            let data = JSON.parse(fs.readFileSync(filename))
            for (let marketName of Object.keys(data)) {
                let marketData = data[marketName];
                for (let monthName of Object.keys(marketData)) {
                    let arrival = marketData[monthName];
                    let year = codeToYear[monthName.substr(4)]
                    let month = monthName.substr(0, 3);
                    let stateCode = marketToStateCode[marketName]
                    globaData[year][month][stateCode][marketName] = arrival;
                }
            }
        }
    }
}

function toCSV() {
    const CSVData = [];
    for (let year = startYear; year <= endYear; year++) {
        for (let month of Object.keys(months)) {
            for (let stateCode of Object.keys(codeToStates)) {
                let markets = stateMarketMap[stateCode]
                for (let market of markets) {
                    // console.log(year, month, stateCode, market.name);
                    let arrival = globaData[year][month][stateCode][market.name];
                    // console.log(arrival)
                    CSVData.push({
                        year,
                        month,
                        stateCode,
                        market: market.name,
                        arrival
                    })
                }
            }
        }
    }
    const parser = new Parser();
    const csv = parser.parse(CSVData);
    fs.writeFileSync(csvFile, csv);
}

function main() {
    PrefillZeros()
    Populate();
    fs.writeFileSync(jsonFile, JSON.stringify(globaData, null, 2))
    toCSV()
}

main();
