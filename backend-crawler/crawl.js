
const cheerio = require("cheerio");
const axios = require("axios");
const url = require("url");
const fs = require("fs");

const { siteInfo, cropsToCode, codeToCrops, statesToCode, codeToStates, months } = require("./constants");

const PARAM_COMMODITY_CODE = 'Tx_Commodity';
const PARAM_STATE_CODE = 'Tx_state';
const PARAM_DISTRICT = 'Tx_District';
const PARAM_MARKET_CODE = "Tx_Market";
const PARAM_FromCode = "DateFrom";
const PARAM_ToCode = "DateTo";
const PARAM_FromName = "Fr_Date";
const PARAM_ToName = "To_Date";
const PARAM_TREND = "Tx_Trend";
const PARAM_COMMODITY_NAME = "Tx_CommodityHead";
const PARAM_STATE_NAME = "Tx_StateHead";
const PARAM_MARKET_NAME = "Tx_MarketHead";
const PARAM_DISTRICT_NAME = "Tx_DistrictHead";

const params = new url.URLSearchParams({
    [PARAM_COMMODITY_CODE]: "19",
    [PARAM_STATE_CODE]: "AP",
    [PARAM_DISTRICT]: "0",
    [PARAM_MARKET_CODE]: "0",
    [PARAM_FromCode]: "01-Dec-2020",
    [PARAM_ToCode]: "31-Dec-2020",
    [PARAM_FromName]: "01-Dec-2020",
    [PARAM_ToName]: "31-Dec-2020",
    [PARAM_TREND]: "1",
    [PARAM_COMMODITY_NAME]: "Banana",
    [PARAM_STATE_NAME]: "Andhra Pradesh",
    [PARAM_DISTRICT_NAME]: "--Select--"
});

const options = {
    method: 'get',
    url: siteInfo.base_url,
    headers: siteInfo.headers,
    params,
}

const STATE_MARKET_MAP_FILE = "./state-market-map.json";
var stateMarketMap = {};

if (fs.existsSync(STATE_MARKET_MAP_FILE)) {
    stateMarketMap = JSON.parse(fs.readFileSync(STATE_MARKET_MAP_FILE))
}

function getMarkets($) {
    let options = $('[name="ctl00$ddlMarket"]').first().children()
    let markets = []
    console.log(options.length);
    for (let i = 1; i < options.length; i++) {
        let op = options[i];
        let code = $(op).attr('value');
        let html = $(op).html()
        markets.push({
            "name": html,
            "code": code
        })
    }
    return markets
}

async function updateMarketsFor(stateCode) {
    params.set(PARAM_STATE_CODE, stateCode)
    params.set(PARAM_STATE_NAME, codeToStates[stateCode])
    let body = await axios(options)
    let $ = cheerio.load(body.data);
    let markets = getMarkets($)
    stateMarketMap[stateCode] = markets;
}

async function getGranularData({ cropCode, stateCode, marketCode, marketName, from, to }) {
    // console.log("making request");
    params.set(PARAM_COMMODITY_CODE, cropCode)
    params.set(PARAM_COMMODITY_NAME, codeToCrops[cropCode])
    params.set(PARAM_STATE_CODE, stateCode)
    params.set(PARAM_STATE_NAME, codeToStates[stateCode]);
    params.set(PARAM_MARKET_NAME, marketName);
    params.set(PARAM_MARKET_CODE, marketCode)
    params.set(PARAM_FromCode, from)
    params.set(PARAM_FromName, from)
    params.set(PARAM_ToCode, to)
    params.set(PARAM_ToName, to)
    options.params = params;
    let body = await axios(options)
    body = body.data;
    // console.log(params.toString())
    // console.log("got data");
    // fs.writeFileSync('output_per_month.html', body);
    let $ = cheerio.load(body);
    let node = $('[id="cphBody_GridArrivalData_lblarrival_std_unit_0"]');
    let value = $(node).text();
    // console.log("got value", value);
    return value;
}

async function main() {
    let crops = [
        "Onion",
    ]
    let states = [
        "Andhra Pradesh",
        "Arunachal Pradesh"
    ]

    states = Object.keys(statesToCode);

    let startYear = 2010;
    let endYear = 2020;
    for (let stateName of states) {
        let stateCode = statesToCode[stateName];
        let markets = stateMarketMap[stateCode]
        if (!markets) {
            console.log("Fetching Markets for", stateName);
            await updateMarketsFor(stateCode);
        }
    }
    fs.writeFileSync(STATE_MARKET_MAP_FILE, JSON.stringify(stateMarketMap, null, 2));

    let intervals = [];
    for (let year = startYear; year <= endYear; year++) {
        for (let name of Object.keys(months)) {
            let lastDate = months[name](year)
            intervals.push({
                "name": `${name}-${year % 100}`,
                "from": `01-${name}-${year}`,
                "to": `${lastDate}-${name}-${year}`
            })
        }
    }

    // console.log(intervals);

    let totalRequests = 0;
    for (let cropName of crops) {
        for (let stateName of states) {
            let stateCode = statesToCode[stateName];
            let markets = stateMarketMap[stateCode]
            for (let market of markets) {
                for (let interval of intervals) {
                    totalRequests++;
                }
            }
        }
    }
    console.log("Total trips to the server", totalRequests);
    let counter = 0;
    let ratio = 0;
    let prevRatio = 0;
    let prevCounter = 0;

    for (let cropName of crops) {
        let fileName = `data/${cropName}.json`;
        let cropData = {};
        if (fs.existsSync(fileName)) {
            cropData = JSON.parse(fs.readFileSync(fileName))
            console.log("Continuing from previous Download");
        }
        let cropCode = cropsToCode[cropName]
        function backupData() {
            fs.writeFile(fileName, JSON.stringify(cropData, null, 2), () => { })
        }
        for (let stateName of states) {
            let stateCode = statesToCode[stateName];
            if (cropData[stateCode] === undefined)
                cropData[stateCode] = {};
            let markets = stateMarketMap[stateCode]
            for (let market of markets) {
                let marketCode = market.code;
                let marketName = market.name;
                let check = cropData[stateCode][marketName]
                if (check && Object.keys(check).length == 0) {
                    counter += intervals.length;
                    process.stdout.write(`Downloading... ${counter}/${totalRequests}:: ${ratio} \r`)
                    backupData();
                    continue;
                }
                if (cropData[stateCode][marketName] === undefined)
                    cropData[stateCode][marketName] = {}
                // Doing a dry run
                let from = `01-Jan-${startYear}`;
                let to = `31-Dec-${endYear}`;
                let data = await getGranularData({ cropCode, stateCode, marketCode, marketName, from, to })
                if (data) {
                    // console.log(`${marketName} has some arrival data for ${cropName}`);
                } else {
                    // console.log(`${marketName} has no arrivals for ${cropName}`);
                    counter += intervals.length;
                    process.stdout.write(`Downloading... ${counter}/${totalRequests}:: ${ratio} \r`)
                    backupData();
                    continue;
                }
                for (let interval of intervals) {
                    counter++;
                    ratio = Math.round(counter / totalRequests * 10000) / 100
                    if ((counter - prevCounter) > 20) {
                        process.stdout.write("backing up data\r");
                        backupData();
                        prevRatio = ratio;
                        prevCounter = counter;
                    }
                    process.stdout.write(`Downloading... ${counter}/${totalRequests}:: ${ratio} \r`)
                    const { from, to } = interval;
                    if (cropData[stateCode][marketName][interval.name] != undefined) {
                        continue;
                    }
                    let data = await getGranularData({ cropCode, stateCode, marketCode, marketName, from, to })
                    if (data) {
                        // console.log("got data");
                        cropData[stateCode][marketName][interval.name] = Number(data);
                    } else {
                        cropData[stateCode][marketName][interval.name] = 0;
                    }
                    // break;
                }
                // break;
            }
            // break;
        }
        // break;
        backupData();
        process.stdout.write(`Download complete of ${cropName}`)
    }
}

main();
