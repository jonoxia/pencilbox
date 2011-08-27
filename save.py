#!/usr/bin/python
from database_tables import DrawingHistory

import cgi
import cgitb
import datetime

# TODO verifyID here, make sure it's your own drawing you're modifying

def createNew(title, history, layers):
    kwargs = {"date": datetime.datetime.now(),
              "title": title,
              "history_json": history,
              "layer_json": layers,
              "owner": "Jono"}
    newEntry = DrawingHistory(**kwargs)

def updateOld(entry, history, layers):
    entry.date = datetime.datetime.now()
    entry.history_json = history
    entry.layer_json = layers


cgitb.enable()
q = cgi.FieldStorage()
history = q.getfirst("history", "")
layers = q.getfirst("layers", "")
title = q.getfirst("title", "")

matches = DrawingHistory.selectBy(title = title)
if matches.count() > 0:
    updateOld(matches[0], history, layers)
else:
    createNew(title, history, layers)

print "Content-type: text/html"
print
print "OK, saved"
