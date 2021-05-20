import requests
import urllib
import json

terra_swap_endpoint = 'https://fcd.terra.dev'
prices_list = []


# Check % diff of luna to blunas
def terra_swap_price_watcher():
    # Luna to Bluna
    contract_address = 'terra1jxazgm67et0ce260kvrpfv50acuushpjsz2y0p'
    query_msg = '{"simulation":{"offer_asset":{"amount":"1000000","info":{"native_token":{"denom":"uluna"}}}}}'
    response = requests.get(terra_swap_endpoint + '/wasm/contracts/' + contract_address + '/store', params={'query_msg': query_msg})

    if response.status_code == 200:
        return_amount = int(response.json().get('result').get('return_amount'))
        commission_amount = int(response.json().get('result').get('commission_amount'))
        spread_amount = int(response.json().get('result').get('spread_amount'))
        prices_list.append({'return_amount':return_amount, 'commission_amount':commission_amount, 'price_for': 'Luna to Bluna', 'spread_amount': spread_amount})

    # Bluna to Luna
    query_msg = '{"simulation":{"offer_asset":{"amount":"1000000","info":{"token":{"contract_addr":"terra1kc87mu460fwkqte29rquh4hc20m54fxwtsx7gp"}}}}}'
    response = requests.get(terra_swap_endpoint + '/wasm/contracts/' + contract_address + '/store', params={'query_msg': query_msg})

    if response.status_code == 200:
        return_amount = int(response.json().get('result').get('return_amount'))
        commission_amount = int(response.json().get('result').get('commission_amount'))
        spread_amount = int(response.json().get('result').get('spread_amount'))
        prices_list.append({'return_amount':return_amount, 'commission_amount':commission_amount, 'price_for': 'Bluna to Luna', 'spread_amount': spread_amount})

    for item in prices_list:
        # Assuming luna:bluna are 1:1
        luna_amount = 1000000
        return_amount = item.get('return_amount')
        commission_amount = item.get('commission_amount')
        commission_amount = item.get('commission_amount')
        spread_amount = item.get('spread_amount')
        percent_diff = (return_amount - luna_amount) / luna_amount * 100
        lunas_to_blunas_diff = return_amount - luna_amount
        # TerraSwap fee
        percent_diff -= 0.3

        # Results
        price_diff = round(percent_diff, 4)
        price_ratio = (lunas_to_blunas_diff + luna_amount) / 1000000
        print(f"[+] {item['price_for']} => Diff: {price_diff}%, Ratio (1-1): {price_ratio}, Spreed: {spread_amount}")


if __name__ == "__main__":
    terra_swap_price_watcher()
