const fs = require("fs");
const { Parser } = require("json2csv");

const { siteInfo, cropsToCode, codeToCrops, statesToCode, codeToStates, months } = require("./constants");
let cropName = process.argv[2];
cropName = cropName ? cropName : "Onion"
let fileBaseName = `data/${cropName}/${cropName}`
let jsonFile = `${fileBaseName}.json`
let csvFile = `${fileBaseName}.csv`

const JSONData = {};
const CSVData = [];

let startYear = 2010;
let endYear = 2020;

const MASTER_MARKET_MAP_FILE = "./state-district-market-map.json";
var masterMarketMap = {};
if (fs.existsSync(MASTER_MARKET_MAP_FILE)) {
    masterMarketMap = JSON.parse(fs.readFileSync(MASTER_MARKET_MAP_FILE))
}

function Populate() {
    for (let year = startYear; year <= endYear; year++) {
        console.log("Processing year", year);
        JSONData[year] = {}
        let yearData = JSONData[year]

        for (let month of Object.keys(months)) {
            yearData[month] = {};
            let monthData = yearData[month];

            for (let stateCode of Object.keys(masterMarketMap)) {
                let filename = `data/${cropName}/${cropName}_${stateCode}.json`;
                let marketData = {};
                if (fs.existsSync(filename))
                    marketData = JSON.parse(fs.readFileSync(filename))

                let stateName = codeToStates[stateCode]
                monthData[stateName] = {};
                let stateData = monthData[stateName];
                let districts = masterMarketMap[stateCode].districts;

                for (let districtCode of Object.keys(districts)) {
                    let districtInfo = districts[districtCode];
                    const { markets, name } = districtInfo;
                    stateData[name] = {};
                    let districtData = stateData[name];
                    for (let marketCode of Object.keys(markets)) {
                        let marketInfo = markets[marketCode];
                        const { name } = marketInfo;
                        let monthString = `${month}-${year % 100}`;
                        let value = marketData?.[name]?.[monthString]
                        value = value ? value : 0;
                        districtData[name] = value;
                        CSVData.push({
                            year,
                            month,
                            state: stateName,
                            district: districtInfo.name,
                            market: marketInfo.name,
                            arrival: value
                        })
                    }
                }
            }
        }
    }
}

function toJson() {
    fs.writeFileSync(jsonFile, JSON.stringify(JSONData, null, 2))
}

function toCSV() {
    const parser = new Parser();
    const csv = parser.parse(CSVData);
    fs.writeFileSync(csvFile, csv);
}

function main() {
    Populate();
    toJson();
    toCSV()
}

main();
