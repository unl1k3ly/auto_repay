from flask import Flask
import os
import subprocess
from flask import Response, render_template
import json


app = Flask(__name__)


@app.route('/')
def tail():
    if os.path.exists('console.log'):
        buffer = []
        arguments = ['tail', '-n', '10', 'console.log']
        process = subprocess.Popen(arguments, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)

        for line in iter(process.stdout.readline, b''):
            l = line.decode('utf-8')
            line = l.strip()
            buffer.append(line)

        return render_template('index.html', title='Welcome', buffer_list=buffer)
        # return Response(json.dumps(buffer),  mimetype='application/json')


    else:
        return "Could not read console.log"



if __name__ == '__main__':
    app.run()