#!/usr/bin/python
from database_tables import DrawingHistory
from webserver_utils import verify_id


import cgi
import cgitb
import datetime
import simplejson

cgitb.enable()
q = cgi.FieldStorage()
title = q.getfirst("title", "")
artist = verify_id()

print "Content-type: text/html"
print

matches = DrawingHistory.selectBy(title = title, owner = artist.name)
if matches.count() > 0:
    history = matches[0].history_json
    layers = matches[0].layer_json
    print simplejson.dumps({ 'history': history,
                             'layers': layers })
else:
    print simplejson.dumps({ 'history': '',
                             'layers': ''})
