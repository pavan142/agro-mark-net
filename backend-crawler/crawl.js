
const cheerio = require("cheerio");
const axios = require("axios");
const url = require("url");
const fs = require("fs");
const colors = require("colors");

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

async function getCheckSum({ cropCode, stateCode, from, to }) {
    // console.log("making request");
    params.set(PARAM_COMMODITY_CODE, cropCode)
    params.set(PARAM_COMMODITY_NAME, codeToCrops[cropCode])
    params.set(PARAM_STATE_CODE, stateCode)
    params.set(PARAM_STATE_NAME, codeToStates[stateCode]);
    params.set(PARAM_MARKET_NAME, "--Select--");
    params.set(PARAM_MARKET_CODE, 0)
    params.set(PARAM_STATE_NAME, "--Select--");
    params.set(PARAM_STATE_CODE, 0)
    params.set(PARAM_FromCode, from)
    params.set(PARAM_FromName, from)
    params.set(PARAM_ToCode, to)
    params.set(PARAM_ToName, to)
    options.params = params;
    let body = await axios(options)
    body = body.data;
    // console.log(params.toString())
    // console.log("got data");
    fs.writeFileSync('output_checksum.html', body);
    let $ = cheerio.load(body);
    let nodes = $('[id="cphBody_GridArrivalData"] span');
    let output = {};
    for (let i = 0; i + 1 < nodes.length;) {
        let stateName = $(nodes[i]).text()
        let value = $(nodes[i + 1]).text()
        value = Number(value);
        if (stateName == "Total") {
            output[stateName] = value;
        } else {
            output[statesToCode[stateName]] = value;
        }
        i = i + 2;
    }
    // let value = $(node).text();
    console.log("got value", output);
    return output;
}

function verify(data, target) {
    let total = 0;
    for (let market of Object.keys(data)) {
        let monthData = data[market]
        for (let month of Object.keys(monthData)) {
            total += monthData[month]
        }
    }
    let percentChange = Math.abs(100 * ((total - target) / target))
    // console.log(total, target, percentChange)
    return (percentChange < 0.01)
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
        let cropCode = cropsToCode[cropName]
        let folderName = `data/${cropName}`
        if (!fs.existsSync(folderName))
            fs.mkdirSync(folderName);
        let metaDataFile = `data/${cropName}/meta.json`;
        let metaData = {};
        if (fs.existsSync(metaDataFile)) {
            metaData = JSON.parse(fs.readFileSync(metaDataFile));
        }
        let checksumDataFile = `data/${cropName}/checksum.json`;
        let checksumData = {};
        if (!fs.existsSync(checksumDataFile)) {
            console.log("Fetching checksum data")
            checksumData = await getCheckSum({ cropCode, from: intervals[0].from, to: intervals[intervals.length - 1].to })
            console.log("Fetched checksum data", checksumData)
            fs.writeFileSync(checksumDataFile, JSON.stringify(checksumData, null, 2))
        } else {
            checksumData = JSON.parse(fs.readFileSync(checksumDataFile));
        }
        for (let stateName of states) {
            let stateStartTime = Date.now();
            let stateCode = statesToCode[stateName];
            let markets = stateMarketMap[stateCode];
            let fileName = `data/${cropName}/${cropName}_${stateCode}.json`;
            if (metaData[stateCode]) {
                counter += markets.length * intervals.length;
                if (fs.existsSync(fileName)) {
                    console.log(colors.yellow(`Verifiying ${cropName} ${stateCode}`));
                    let status = verify(JSON.parse(fs.readFileSync(fileName)), checksumData[stateCode]);
                    if (status) {
                        console.log(colors.green(`Success`))
                    } else {
                        console.log(colors.red(`Failed`))
                    }
                    console.log(colors.yellow(`Skipping already downloaded Date for ${cropName} ${stateCode}\n`));
                }
                continue;
            }
            // continue;
            console.log("Downloading...", stateName)

            let cropData = {};
            // if (fs.existsSync(fileName)) {
            //     cropData = JSON.parse(fs.readFileSync(fileName))
            //     console.log("Continuing from previous Download");
            // }
            function backupData() {
                fs.writeFileSync(fileName, JSON.stringify(cropData, null, 2), () => { })
            }
            for (let market of markets) {
                let marketStartTime = Date.now();
                let marketCode = market.code;
                let marketName = market.name;
                let from = `01-Jan-${startYear}`;
                let to = `31-Dec-${endYear}`;
                let promises = [];
                let data = await getGranularData({ cropCode, stateCode, marketCode, marketName, from, to })
                if (data) {
                    // console.log(`${marketName} has some arrival data for ${cropName}`);
                } else {
                    // console.log(`${marketName} has no arrivals for ${cropName}`);
                    counter += intervals.length;
                    process.stdout.write(`Downloading... ${counter}/${totalRequests}:: ${ratio} \r`)
                    continue;
                }
                cropData[marketName] = {}
                for (let interval of intervals) {
                    counter++;
                    ratio = Math.round(counter / totalRequests * 10000) / 100
                    process.stdout.write(`Downloading... ${counter}/${totalRequests}:: ${ratio} \r`)
                    const { from, to } = interval;
                    if (cropData[marketName][interval.name] != undefined) {
                        continue;
                    }
                    let p = getGranularData({ cropCode, stateCode, marketCode, marketName, from, to }).then((data) => {
                        if (data) {
                            cropData[marketName][interval.name] = Number(data);
                        }
                    })

                    promises.push(p);
                    // break;
                }
                await Promise.all(promises);
                backupData();
                let elapsed = Date.now() - marketStartTime;
                console.log(`Processed ${cropName}::${stateName}::${marketName} in ${elapsed / 1000} seconds`)
                // break;
            }
            let elapsed = Date.now() - stateStartTime;
            console.log(`Processed ${cropName}::${stateName} in ${elapsed / 1000} seconds`)
            metaData[stateCode] = "completed"
            fs.writeFileSync(metaDataFile, JSON.stringify(metaData, null, 2));
            // break;
        }
        // break;
        process.stdout.write(`Download complete of ${cropName}`)
    }
}

main();
