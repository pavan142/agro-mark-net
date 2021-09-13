const fs = require("fs")
const url = require("url")
const cheerio = require("cheerio");
const axios = require("axios");

const { siteInfo, cropsToCode, codeToCrops, statesToCode, codeToStates, months } = require("./constants");
const PARAM_COMMODITY_CODE = 'Tx_Commodity';
const PARAM_STATE_CODE = 'Tx_state';
const PARAM_DISTRICT_CODE = 'Tx_District';
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
    [PARAM_DISTRICT_CODE]: "0",
    [PARAM_MARKET_CODE]: "0",
    [PARAM_FromCode]: "01-Dec-2020",
    [PARAM_ToCode]: "31-Dec-2020",
    [PARAM_FromName]: "01-Dec-2020",
    [PARAM_ToName]: "31-Dec-2020",
    [PARAM_TREND]: "1",
    [PARAM_COMMODITY_NAME]: "Banana",
    [PARAM_STATE_NAME]: "Andhra Pradesh",
    [PARAM_DISTRICT_NAME]: "--Select--",
    [PARAM_MARKET_NAME]: "--Select--"
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

async function getMarkets({ stateCode, districtCode, districtName }) {
    // console.log("making request");
    let cropCode = 23;
    params.set(PARAM_COMMODITY_CODE, cropCode)
    params.set(PARAM_COMMODITY_NAME, codeToCrops[cropCode])
    params.set(PARAM_STATE_CODE, stateCode)
    params.set(PARAM_STATE_NAME, codeToStates[stateCode]);
    params.set(PARAM_DISTRICT_CODE, districtCode)
    params.set(PARAM_DISTRICT_NAME, districtName)
    params.set(PARAM_FromCode, "01-Jan-2010")
    params.set(PARAM_FromName, "01-Jan-2010")
    params.set(PARAM_ToCode, "31-Jan-2010")
    params.set(PARAM_ToName, "31-Jan-2010")
    options.params = params;
    let body = await axios(options)
    body = body.data;
    let $ = cheerio.load(body);
    let marketNodes = $('[name="ctl00$ddlMarket"] option');
    let markets = [];
    for (let i = 1; i < marketNodes.length; i++) {
        let op = marketNodes[i];
        let code = $(op).attr('value');
        let html = $(op).html()
        markets.push({
            code: code,
            name: html
        })
    }

    return markets;
}

async function getDistricts({ stateCode }) {
    let cropCode = 23;
    params.set(PARAM_COMMODITY_CODE, cropCode)
    params.set(PARAM_COMMODITY_NAME, codeToCrops[cropCode])
    params.set(PARAM_STATE_CODE, stateCode)
    params.set(PARAM_STATE_NAME, codeToStates[stateCode]);
    params.set(PARAM_FromCode, "01-Jan-2010")
    params.set(PARAM_FromName, "01-Jan-2010")
    params.set(PARAM_ToCode, "31-Jan-2010")
    params.set(PARAM_ToName, "31-Jan-2010")
    options.params = params;
    let body = await axios(options)
    body = body.data;

    let $ = cheerio.load(body);
    let districtNodes = $('[name="ctl00$ddlDistrict"] option');
    let districts = [];

    for (let i = 1; i < districtNodes.length; i++) {
        let op = districtNodes[i];
        let code = $(op).attr('value');
        let html = $(op).html()
        districts.push({
            code: code,
            name: html
        })
    }

    return districts;
}

let stateDistrictMarketMap = {};
const stateDistrictMarketMapFileName = "state-district-market-map.json";

if (fs.existsSync(stateDistrictMarketMapFileName))
    stateDistrictMarketMap = JSON.parse(fs.readFileSync(stateDistrictMarketMapFileName))

const META_STATUS_KEY = "__STATUS"
const META_STATUSES = {
    COMPLETED: 'completed',
    PROGRESS: 'progress'
}

async function main() {
    for (let stateCode of Object.keys(codeToStates)) {
        let stateData = stateDistrictMarketMap[stateCode];
        if (stateData && stateData[META_STATUS_KEY] == META_STATUSES.COMPLETED) {
            console.log("Skipping already proccessed", stateCode, codeToStates[stateCode]);
            continue;
        }
        stateDistrictMarketMap[stateCode] = {
            districts: {},
            name: codeToStates[stateCode],
            code: stateCode,
            [META_STATUS_KEY]: META_STATUSES.PROGRESS
        };
        let districts = await getDistricts({ stateCode })
        for (let district of districts) {
            stateDistrictMarketMap[stateCode]["districts"][district.code] = {
                code: district.code,
                name: district.name,
                markets: {}
            }
            let districtCode = district.code;
            let districtName = district.name;
            let districtPromises = [];
            let districtPromise = getMarkets({ stateCode, districtCode, districtName })
            districtPromises.push(districtPromise)
            districtPromise.then((markets) => {
                for (let market of markets) {
                    stateDistrictMarketMap[stateCode]["districts"][district.code]["markets"][market.code] = {
                        code: market.code,
                        name: market.name
                    }
                }
            })
            await Promise.all(districtPromises);
        }
        console.log("Processed", stateCode, JSON.stringify(codeToStates[stateCode]))
        stateDistrictMarketMap[stateCode][META_STATUS_KEY] = META_STATUSES.COMPLETED
        fs.writeFileSync(stateDistrictMarketMapFileName, JSON.stringify(stateDistrictMarketMap, null, 2));
    }
    console.log("Done!")
}

main()
