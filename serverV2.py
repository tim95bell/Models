#!/usr/bin/python
import os, sys
PORT = 8080

import SimpleHTTPServer
import SocketServer
os.chdir(sys.path[0])
	
Handler = SimpleHTTPServer.SimpleHTTPRequestHandler
Handler.extensions_map.update({
		'.webapp': 'application/x-web-app-manifest+json',
	});
	
httpd = SocketServer.TCPServer(("", PORT), Handler)
	
print "Serving at port", PORT
httpd.serve_forever()

