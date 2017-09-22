#!/usr/bin/python
import os, sys
PORT = 8080

import http.server

os.chdir(sys.path[0])
http.server.test(HandlerClass=http.server.SimpleHTTPRequestHandler,port=PORT,bind="")
print ("Serving at port", PORT)
start_server() #If you want cgi, set cgi to True e.g. start_server(cgi=True)
