#!/usr/bin/python
from database_tables import DrawingHistory

# TODO verifyID here, make sure it's your own drawing you're modifying

import cgi
import cgitb
import datetime
import simplejson

cgitb.enable()
q = cgi.FieldStorage()
title = q.getfirst("title", "")

print "Content-type: text/html"
print

matches = DrawingHistory.selectBy(title = title)
if matches.count() > 0:
    history = matches[0].history_json
    layers = matches[0].layer_json
    print simplejson.dumps({ 'history': history,
                             'layers': layers })
else:
    print simplejson.dumps({ 'history': '',
                             'layers': ''})
