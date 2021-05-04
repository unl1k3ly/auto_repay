const fetch = require('node-fetch');


getAPI = async function (leftover, baseURL = 'https://lcd.terra.dev/'){
    if (leftover){
        let getted = false
        while(!getted){
            try{
                a = await fetch(baseURL + leftover, {
                    headers: {
                        'accept': 'application/json'
                    }
                }).then(response=>{
                    return response.json();
                }).catch();
                getted = true
                return a
            } catch(error){
                console.log("API load fail! sleep 1 sec\n")
                console.log(error)
                await sleep(1000)
            }
        }
    }else{
        return false   
    }
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getHeight(){
    let latest = await getAPI('blocks/latest')
    return latest.block.header.height
}

const overseer = 'terra1tmnqgvg567ypvsvk6rwsga3srp7e3lg6u0elp8'
const market = 'terra1sepfj7s0aeg5967uxnfk4thzlerrsktkpelm5s'
const aUST = 'terra1hzh9vpxhsk8253se0vv5jj6etdvxu3nv8z07zu'
const ANC_token = 'terra1897an2xux840p9lrh6py3ryankc6mspw49xse3'
const ANC_LP = 'terra1gecs98vcuktyfkrve9czrpgtg0m3aq586x6gzm'
const ANC_pool = 'terra1gm5p3ner9x9xpwugn9sp6gvhd0lwrtkyrecdn3'
const MIR_LP_staking = 'terra17f7zu97865jmknk7p2glqvxzhduk78772ezac5'

exports.borrow_limit = async function(walletAdd){
    let borrow_limit = await getAPI('wasm/contracts/' + overseer + '/store?query_msg={"borrow_limit":{"borrower": "'+ walletAdd +'"}}')
    return parseInt(borrow_limit.result.borrow_limit)
}

exports.loan_amount = async function(walletAdd){
    let height = await getHeight()
    let loan_amount = await getAPI('wasm/contracts/' + market + '/store?query_msg={"borrower_info":{"borrower": "'+ walletAdd +'","block_height" :' + height + '}}')
    return parseInt(loan_amount.result.loan_amount)
}

exports.aUST_balance = async function(walletAdd){
    let balance = await getAPI('wasm/contracts/' + aUST + '/store?query_msg={"balance":{"address":"' + walletAdd +'"}}')
    let blunaBlance = parseInt(balance.result.balance)
    return blunaBlance
}

exports.aUST_exchange_rate = async function(){
    let state = await getAPI('wasm/contracts/' + market + '/store?query_msg={"state":{}}')
    return parseFloat(state.result.prev_exchange_rate)
}

exports.ANC_LP_staking_amount = async function(walletAdd){
    let staking = await getAPI('wasm/contracts/' + ANC_token + '/store?query_msg={"staker_info":{"staker":"' + walletAdd + '"}}') 
    return parseInt(staking.result.bond_amount)
}

exports.ANC_LP_balance = async function(walletAdd){
    let balance = await getAPI('wasm/contracts/' + ANC_LP + '/store?query_msg={"balance":{"address":"' + walletAdd +'"}}')
    let LP_Blance = parseInt(balance.result.balance)
    return LP_Blance
}

exports.ANC_USTperLP = async function(){
    let pool = await getAPI('wasm/contracts/' + ANC_pool + '/store?query_msg={"pool":{}}')
    let ust_amount = parseInt(pool.result.assets.filter((e)=> e.info.hasOwnProperty('native_token'))[0].amount)
    let total_supply = parseInt(pool.result.total_share)
    return parseFloat(ust_amount/total_supply)
}

//for mAsset and MIR

exports.mAsset_LP_data = async function(walletAdd, symbol){
    let assets_data = await getAPI('graphql?query={assets{symbol, token, pair,lpToken}}', 'https://graph.mirror.finance/')
    let token_data = assets_data.data.assets.filter((e)=> e.symbol == symbol)[0]
    let staking_data = await getAPI('wasm/contracts/' + MIR_LP_staking + '/store?query_msg={"reward_info":{"staker":"' + walletAdd + '"}}') 
    let is_staking = staking_data.result.reward_infos.filter((e)=> e.asset_token == token_data.token)[0]
    let staking =0
    if (is_staking){
        staking = parseInt(is_staking.bond_amount)
    }
    let balance = await getAPI('wasm/contracts/' + token_data.lpToken + '/store?query_msg={"balance":{"address":"' + walletAdd +'"}}')
    let LP_Balance = parseInt(balance.result.balance)
    let pool = await getAPI('wasm/contracts/' + token_data.pair + '/store?query_msg={"pool":{}}')
    let ust_amount = parseInt(pool.result.assets.filter((e)=> e.info.hasOwnProperty('native_token'))[0].amount)
    let total_supply = parseInt(pool.result.total_share)
    let USTperLP = parseFloat(ust_amount/total_supply)
    let result = {LP_staking_amount: staking, LP_balance: LP_Balance, USTperLP: USTperLP , token_data:token_data}
    return result

}

//get LP list
exports.LP_list = async function(){
    let assets_data = await getAPI('graphql?query={assets{symbol}}', 'https://graph.mirror.finance/')
    let return_array = []
    for(let symbol of assets_data.data.assets){
        return_array.push(symbol.symbol)
    }
    return_array.push("ANC")
    return return_array
}

exports.ust_balance = async function(walletAdd){
    let bank = await getAPI('bank/balances/' + walletAdd)
    function findUst(bank){
        return bank.denom ==='uusd'
    }
    if (bank.result.find(findUst)){
        return parseInt(bank.result.find(findUst).amount)
    }else{
        return 0
    }
}

exports.luna_balance = async function(walletAdd){
    let bank = await getAPI('bank/balances/' + walletAdd)
    function findLuna(bank){
        return bank.denom ==='uluna'
    }
    if (bank.result.find(findLuna)){
        return parseInt(bank.result.find(findLuna).amount)
    }else{
        return 0
    }
}

exports.provided_bLUNA_amount = async function(walletAdd){
    let collateral = await getAPI('wasm/contracts/' + overseer + '/store?query_msg={"collaterals":{"borrower":"' + walletAdd + '"}}')
    return parseInt(collateral.result.collaterals[0][1])

}

exports.ust_receive_amount = async function(swapamount){
    let receive = await getAPI('market/swap?offer_coin=' + swapamount.toString() + 'uluna&ask_denom=uusd')
    return receive.result.amount
}

exports.tax_amount = async function(ust_amount){
    let tax_rate = await getAPI('treasury/tax_rate')
    let tax_cap = await getAPI('treasury/tax_cap/uusd')
    return Math.min(parseInt(tax_cap.result), parseInt(ust_amount * parseFloat(tax_rate.result)))
}


exports.tax_cap = async function(ust_amount){
    let tax_cap = await getAPI('treasury/tax_cap/uusd')
    return parseInt(tax_cap.result)
}