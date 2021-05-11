# while true; do node index.js|tee -a console.log; sleep 10; done
node index.js |tee -a console.log &