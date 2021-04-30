# auto_repay

auto repay before too close to liquidate

## how to use?

1. ### set option.txt
    
    example
  
        {
            "target_percent": "80%", 
            "trigger_percent": "90%",
            "get_UST_option": ["aUST", "MIR LP", "ANC LP", "mAAPL LP"],
            "instant_burn": "off"
            "max_premium_rate": ""
        }
   
   When borrow limit percent is bigger than tirgger percent, program will automatically repay until that the borrow limit percent reach to the target percent.
   
   The UST for repay will be obtained by methods in "get_UST_option"
   
   For example, if the options is ["aUST", "MIR LP", "ANC LP", ...] ,first withdraw anchor deposit, second withdraw MIR LP and so on until the UST is enough to reach to the target precent
  
   If there are no way to get UST from methods that in "get_UST_option" and the instant_burn set "on" program will do instant burn to get UST. 
   
   withdraw bLUNA ,swap it to LUNA and swap luna to UST. (The amount to be withdrawn is the amount that the borrow limit increases by 5%)
   
   But if LUNA/bLUNA premium_rate is higher than the max_premium_rate, It will not do instant burn.
   
   #### options format
   
   * target_percent, trigger_percent and max_perimum_rate must be written like "XX%" or "0.XX" or 0.XX
       1. target_percent must be less than trigger_percent
       2. trigger_precent range: if instant burn setted "on" : 60%~90%, else 60%~95%
   
   * instant_burn must be written as "on" or "off"
   
   * get_UST_option
       1. "aUST" : withdraw anchor deposit
       2. "TICKER LP" : withdraw LP, avaliable tickers: all of mAsset, MIR and ANC
       
2. ### fill .env
    
    write NMEMONIC of your wallet
    > You can leave it blank when you start program like
        
        $ npm start "seed seed seed ..."
       
3. ### install dependency
    
        $ npm install
        
4. ### start program

        $ npm start
        
    or
        
        $ npm start "seed seed seed ..."
   
