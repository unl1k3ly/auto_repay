# run in a while loop
# while true; do node index.js|tee -a console.log; sleep 10; done

# Or call directly
node index.js |tee -a console.log &

# Or add the following at cront to run every minute
# * * * * *  cd /home/ubuntu/auto_repay/ && node index.js >> console.log 2>&1

