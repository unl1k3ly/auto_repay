const { MnemonicKey, LCDClient, MsgExecuteContract, MsgSwap, Wallet, Coin, Coins, StdFee} = require('@terra-money/terra.js');
const fetchAPI = require('./fetchAPI')
const fs = require('fs')
const moment = require('moment');
require('dotenv').config();

const MNEMONIC = process.env.MNEMONIC != '' ? process.env.MNEMONIC : process.argv[2];
const COIN_TYPE = 330;
//contracts address
const market = 'terra1sepfj7s0aeg5967uxnfk4thzlerrsktkpelm5s'
const overseer = 'terra1tmnqgvg567ypvsvk6rwsga3srp7e3lg6u0elp8'
const bLUNA_token = 'terra1kc87mu460fwkqte29rquh4hc20m54fxwtsx7gp'
const custody = 'terra1ptjp2vfjrwh0j0faj9r6katm640kgjxnwwq9kn'
const aUST = 'terra1hzh9vpxhsk8253se0vv5jj6etdvxu3nv8z07zu'
const ANC_token = 'terra1897an2xux840p9lrh6py3ryankc6mspw49xse3'
const ANC_LP = 'terra1gecs98vcuktyfkrve9czrpgtg0m3aq586x6gzm'
const ANC_pool = 'terra1gm5p3ner9x9xpwugn9sp6gvhd0lwrtkyrecdn3'
const MIR_LP_staking = 'terra17f7zu97865jmknk7p2glqvxzhduk78772ezac5'
const MIR_LP = 'terra17gjf2zehfvnyjtdgua9p9ygquk6gukxe7ucgwh'


class Repay{
    
    wallet

    constructor(){
        const key = new MnemonicKey({
            mnemonic: MNEMONIC,
            coinType: COIN_TYPE
        });
        const lcd = new LCDClient({
            URL: 'https://lcd.terra.dev',
            chainID: 'columbus-4'
        });
        this.wallet = new Wallet(lcd, key);
    }

    async execute(msgs, type = 'else'){
        let fee = new StdFee(666666, '100000uusd')
        
        if(type == 'ANC'){
            fee = new StdFee(1000000, '250000uusd')
        }

        try{
            const tx = await this.wallet.createAndSignTx({msgs, fee});
            const result = await this.wallet.lcd.tx.broadcastSync(tx);    
            await this.pollingTx(result.txhash)
            console.log('Transaction Completed\n')
        }catch (err){
            console.log('Transaction Fail')
            sleep(300)
            console.log(err)
        }
    }
    
    async pollingTx(txHash) {
        let isFound = false;    
        while (!isFound) {
          try {
            await this.wallet.lcd.tx.txInfo(txHash);            
            isFound = true;
          } catch (err) {
            await sleep(3000);            
          }
        }
    }

    //repay
    async repay(amount){
        console.log('Repaying ' + (amount/1e6).toFixed(2)+'UST...')
        let coin = new Coin('uusd', amount)
        let coins = new Coins
        coins = coins.add(coin)
        let repay = new MsgExecuteContract(
            this.wallet.key.accAddress,
            market,
            {
                repay_stable:{}
            },
            coins
        )
        await this.execute([repay], 'ANC');
    }

    
    //withdraw ust from anchor deposit
    async withdraw_aUST(aust_amount){
        console.log('Withdrawing ' + (aust_amount/1e6).toFixed(2)+'aUST...')    
        let withdraw = new MsgExecuteContract(
            this.wallet.key.accAddress,
            aUST,
            {
                send:{
                    contract: market,
                    amount: aust_amount.toString(),
                    msg: "eyJyZWRlZW1fc3RhYmxlIjp7fX0="
                }
            },
            new Coins
        )
        await this.execute([withdraw], 'ANC');
    }

    
    //anchor lp withdraw
    //1. unstake lp token
    async unstake_ANC_LP(LP_token_amount){
        console.log('Unstaking ANC-UST LP Token...')
        let unstake = new MsgExecuteContract(
            this.wallet.key.accAddress,
            ANC_token,
            {
                unbond:{
                    amount: LP_token_amount.toString()
                }
            },
            new Coins
        )
        await this.execute([unstake]);
    }

    //2. withdraw lp
    async withdraw_ANC_LP(LP_token_amount){
        console.log('Withdrawing ANC-UST LP...')
        let withdraw = new MsgExecuteContract(
            this.wallet.key.accAddress,
            ANC_LP,
            {
                send:{
                    contract: ANC_pool,
                    amount: LP_token_amount.toString(),
                    msg: "eyJ3aXRoZHJhd19saXF1aWRpdHkiOnt9fQ=="
                }
            },
            new Coins
        )
        await this.execute([withdraw]);
    }


    //mirror lp withdraw
    //1. unstake lp token
    async unstake_mAsset_LP(LP_token_amount, token, symbol){
        console.log('Unstaking '+symbol+'-UST LP Token...')
        let unstake = new MsgExecuteContract(
            this.wallet.key.accAddress,
            MIR_LP_staking,
            {
                unbond:{
                    asset_token: token,
                    amount: LP_token_amount.toString()
                }
            },
            new Coins
        )
        await this.execute([unstake]);
    }

    //2. withdraw lp
    async withdraw_mAsset_LP(LP_token_amount, token_data, symbol){
        console.log('Withdrawing '+symbol+'-UST LP...')
        let withdraw = new MsgExecuteContract(
            this.wallet.key.accAddress,
            token_data.lpToken,
            {
                send:{
                    contract: token_data.pair,
                    amount: LP_token_amount.toString(),
                    msg: "eyJ3aXRoZHJhd19saXF1aWRpdHkiOnt9fQ=="
                }
            },
            new Coins
        )
        await this.execute([withdraw]);
    }

    //instant burn process
    //1. withdraw bLUNA
    async withdraw_bLUNA(amount){
        console.log('Withdrawing ' + (amount/1e6).toFixed(2) +'bLUNA...')
        let unlock = new MsgExecuteContract(
            this.wallet.key.accAddress,
            overseer,
            {
                unlock_collateral:{
                    collaterals:[[bLUNA_token,amount.toString()]]
                }
            },
            new Coins

        )
        let withdraw = new MsgExecuteContract(
            this.wallet.key.accAddress,
            custody,
            {
                withdraw_collateral:{
                    amount: amount.toString()
                }
            },
            new Coins
        )
        await this.execute([unlock, withdraw], 'ANC')
    }

    //2. instant brun (bluna to luna)
    async instant_brun(burnamount, max_premium_rate){      
        console.log('Inastant Burning...')
        let inmsg = Buffer.from('{"swap":{"belief_price":"'+ (1+max_premium_rate).toString() + '","max_spread":"0"}}').toString('base64')
        let swap = new MsgExecuteContract(
            this.wallet.key.accAddress,
            bLUNA_token,
            {
                send: {
                    amount: burnamount.toString(),
                    contract: 'terra1jxazgm67et0ce260kvrpfv50acuushpjsz2y0p',
                    msg: inmsg
                }
            },
            new Coins
        );    
        await this.execute([swap]);      
    }

    //3. swap luna to ust
    async luna2Ust(swapamount){
        console.log('LUNA -> UST Swapping...')
        let receive = await fetchAPI.ust_receive_amount(swapamount)
        let swap = new MsgExecuteContract(
            this.wallet.key.accAddress,
            'terra1vs9jr7pxuqwct3j29lez3pfetuu8xmq7tk3lzk',
            {
                assert_limit_order: {
                    offer_coin: {
                        denom: "uluna",
                        amount: swapamount.toString()
                    },
                    ask_denom: "uusd",
                    minimum_receive: receive
                }
            },
            new Coins
        )
        let swapMsg = new MsgSwap(
            this.wallet.key.accAddress,
            new Coin('uluna', swapamount),
            "uusd"
        )
        await this.execute([swap, swapMsg]);
    }    

    async provide_bLUNA(provide_amount){
        let deposit = new MsgExecuteContract(
            this.wallet.key.accAddress,
            bLUNA_token,
            {
                send:{
                    contract: custody,
                    amount: provide_amount.toString(),
                    msg: "eyJkZXBvc2l0X2NvbGxhdGVyYWwiOnt9fQ=="
                }
            },
            new Coins
        )
        let lock = new MsgExecuteContract(
            this.wallet.key.accAddress,
            overseer,
            {
                lock_collateral:{
                    collaterals:[
                        [bLUNA_token, provide_amount.toString()]
                    ]
                }
            },
            new Coins
        )
        await this.execute([deposit, lock], 'ANC')
    }

    async borrow_ust(ust_amount){
        console.log('Borrowing UST...')
        let borrow = new MsgExecuteContract(
            this.wallet.key.accAddress,
            market,
            {
                borrow_stable:{
                    borrow_amount: ust_amount.toString()
                }
            },
            new Coins
        )
        await this.execute([borrow], 'ANC')
    }
}

repayHandler = new Repay
myAddress = repayHandler.wallet.key.accAddress

async function aUST_process(insufficientUST){
    let aUST_balance = await fetchAPI.aUST_balance(myAddress)
    let exchange_rate = await fetchAPI.aUST_exchange_rate()
    let withdrawable_value = aUST_balance*exchange_rate
    let aUST_amount = 0
    if (insufficientUST > withdrawable_value){
        aUST_amount = aUST_balance
    }else{
        aUST_amount = parseInt(insufficientUST/exchange_rate)
    }

    if (aUST_amount != 0){
        await repayHandler.withdraw_aUST(aUST_amount)
    }    
}

async function ANC_LP_process(insufficientUST){
    let LP_staking = await fetchAPI.ANC_LP_staking_amount(myAddress)
    let LP_Balance = await fetchAPI.ANC_LP_balance(myAddress)
    let USTperLP = await fetchAPI.ANC_USTperLP()
    let LP_needed = parseInt(insufficientUST/USTperLP)
    let LP_unstake_amount = 0
    let LP_withdraw_amount = 0
    if (insufficientUST > (LP_staking + LP_Balance)*USTperLP){ //in this case withdraw all
        LP_unstake_amount = LP_staking
        LP_withdraw_amount = LP_Balance + LP_staking
    }else if(LP_Balance * USTperLP > insufficientUST){
        LP_withdraw_amount = LP_needed
    }else{
        LP_unstake_amount = LP_needed - LP_Balance
        LP_withdraw_amount = LP_needed
    }

    if (LP_unstake_amount != 0){
        await repayHandler.unstake_ANC_LP(LP_unstake_amount)
    }
    if (LP_withdraw_amount !=0){
        await repayHandler.withdraw_ANC_LP(LP_withdraw_amount)
    }
}

// for MIR and mAsset
async function mAsset_LP_process(insufficientUST, symbol){
    let LP_data = await fetchAPI.mAsset_LP_data(myAddress, symbol)
    let LP_staking = LP_data.LP_staking_amount
    let LP_balance = LP_data.LP_balance
    let USTperLP = LP_data.USTperLP
    let LP_needed = parseInt(insufficientUST/USTperLP)
    let LP_unstake_amount = 0
    let LP_withdraw_amount = 0

    if (insufficientUST > (LP_staking + LP_balance)*USTperLP){ //in this case withdraw all
        LP_unstake_amount = LP_staking
        LP_withdraw_amount = LP_balance + LP_staking
        
    }else if(LP_balance * USTperLP > insufficientUST){
        LP_withdraw_amount = LP_needed
        
    }else{
        LP_unstake_amount = LP_needed - LP_balance
        LP_withdraw_amount = LP_needed
    }

    if (LP_unstake_amount != 0){
        await repayHandler.unstake_mAsset_LP(LP_unstake_amount, LP_data.token_data.token, symbol)
    }
    if (LP_withdraw_amount !=0){
        await repayHandler.withdraw_mAsset_LP(LP_withdraw_amount, LP_data.token_data, symbol)
    }
}

// Warning! Instant_burn is not a good option. In some conditions liquidation could be a better option
// Instant burn process is not a process that make a nowPercent to the targetPrecent.
// The process will drag down a nowPercent just 5~5.2% 
async function instant_brun_process(nowPercent){
    let percent_diff = Math.min(0.05, 0.985-nowPercent) //percent diff after withdraw bLUNA
    let provided_bLUNA = await fetchAPI.provided_bLUNA_amount(myAddress)
    let withdraw_amount = parseInt(provided_bLUNA-provided_bLUNA/(1+percent_diff/nowPercent))
    let before_luna_balance = await fetchAPI.luna_balance(myAddress)
    
    await repayHandler.withdraw_bLUNA(withdraw_amount)
    
    await repayHandler.instant_brun(withdraw_amount, max_premium_rate)
    
    let after_luna_balance = await fetchAPI.luna_balance(myAddress)
    
    if (before_luna_balance == after_luna_balance){ //canceled swap b/c of luna/bluna premium
        await repayHandler.provided_bLUNA(withdraw_amount) //reprovide collateral
    }else{
        await repayHandler.luna2Ust(after_luna_balance - before_luna_balance)

    }
}

function percent2number(input){
    if (/%$/.exec(input)){
        return Number(input.slice(0,input.length-1))/100
    }else{
        return Number(input)
    }
}

var option = JSON.parse(fs.readFileSync('option.txt').toString())



//initialize values
var percentNow = 0;
var borrowLimit = 1;
var loanAmount = 0;
var target_percent = percent2number(option.target_percent);
var trigger_percent = percent2number(option.trigger_percent);
var belowTrigger = -1; //for someone who needs reborrow automatically
var max_premium_rate = percent2number(option.max_premium_rate);
var get_UST_option = option.get_UST_option;
var instant_burn = option.instant_burn

// check the options and make readable data
async function check_option(){
    let lp_list = await fetchAPI.LP_list()
    let temp_option
    let temp_array = []
    for(option of get_UST_option){
        if (option.search(/aUST/i) != -1 ){ //checking aUST
            temp_option = ['aUST']
        }else if (option.search(/LP/i) != -1){ //checking LP
            temp_option = ['LP']
            for(token of lp_list){
                if (option.search(RegExp(token, 'i')) != -1){
                    temp_option.push(token)
                    break;
                }
            }
            if (temp_option.length == 1){
                console.log(option + ' is not available option')
                console.log('Avaliable LP list: ' + lp_list)
                return false
            }
        }else{
            console.log(option + ' is not available option')
            return false
        }
        temp_array.push(temp_option)
    }

    get_UST_option = temp_array

    //check instant burn
    if (instant_burn != 'on' && instant_burn != 'off'){
        console.log('instant_burn must be "on" or "off" ' )
        return false
    }

    if (instant_burn == 'on' && max_premium_rate <= 0){
        console.log('max_premium_rate must be gratter than 0')
        return false
    }
    
    //check trigger percent
    if (trigger_percent > 0.95 || trigger_percent < 0.60){
        console.log('Allowed trigger_percent range is 0.6(60%)<= trigger_percent <= 0.95(95%)')
        return false
    }else if (trigger_percent > 0.9 && instant_burn == 'on'){
        console.log('If instant_burn is "on" trigger_percent can\'t exceed 0.9(90%)')
        return false
    }

    //check target percent
    if (target_percent >= trigger_percent){
        console.log('target_percent must be less than trigger_percent')
        return false
    }else if (target_percent < 0){
        console.log('target_percent must be equal or greater than 0')
        return false
    }

    return true
}

// you must have at least 1UST
async function check_remain_UST(){
    let UST_remain = await fetchAPI.ust_balance(myAddress)
    if (UST_remain < 1000000){
        console.log('You must have at least 1UST')
        return false
    }else{
        return true
    }
}

async function get_UST(option, insufficientUST){

    if (option[0] == 'aUST'){
        await aUST_process(insufficientUST)
    }else if(option[0]=='LP'){
        if(option[1]=='ANC'){
            await ANC_LP_process(insufficientUST)
        }else{
            await mAsset_LP_process(insufficientUST, option[1])
        }
    }
}

async function repay_amount(target_percent){
    return parseInt((percentNow - target_percent) / percentNow * loanAmount)
}

async function update_state(){
    //update value
    borrowLimit = await fetchAPI.borrow_limit(myAddress)
    loanAmount = await fetchAPI.loan_amount(myAddress)
    percentNow = loanAmount/borrowLimit

    console.log(moment().format('YYYY-MM-DD hh:mm:ss A'))
    console.log("Up to borrow limit: " + (percentNow*100).toFixed(2) + "%\n")

    return percentNow
}

async function getting_UST_process(UST_remain, total_needed_amount){
    for (option of get_UST_option){
        await get_UST(option, total_needed_amount - UST_remain)
        UST_remain = await fetchAPI.ust_balance(myAddress)
        if (UST_remain * 0.99 > total_needed_amount){ // if UST_balance is more than repay amount
            break;
        }
    }
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}



async function main(){
    let option_check = await check_option()
    let UST_check = await check_remain_UST()
    if(option_check && UST_check){
        while(true){
            let nowPercent = await update_state()
            if(nowPercent > trigger_percent){
                let UST_remain = await fetchAPI.ust_balance(myAddress)
                let total_needed_amount = await repay_amount(target_percent)
                if (UST_remain < total_needed_amount){
                    await getting_UST_process(UST_remain, total_needed_amount)
                }
                await sleep(1000)
                UST_remain = await fetchAPI.ust_balance(myAddress)
                if(Math.min(UST_remain - 2000000, total_needed_amount) > 0){
                    await repayHandler.repay(Math.min(UST_remain - 2000000, total_needed_amount)) //2UST for gas fee
                    nowPercent = await update_state()
                }
                
                if (nowPercent > trigger_percent && instant_burn == "on"){ //if nowPercent still obove trigger_percent do instant burn
                    await instant_brun_process(percentNow)
                    UST_remain = await fetchAPI.ust_balance(myAddress)
                    await repayHandler.repay(UST_remain - 2000000)
                    nowPercent = await update_state()
                }
            }else if(nowPercent < belowTrigger){
                let ust_amount = parseInt((target_percent - percentNow) / percentNow * loanAmount)
                await repayHandler.borrow_ust(ust_amount)
            }
            


            await sleep(60000)
        }
    }
}

main()