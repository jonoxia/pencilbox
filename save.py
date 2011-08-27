#!/usr/bin/python
from database_tables import DrawingHistory
from webserver_utils import verify_id


import cgi
import cgitb
import datetime


def createNew(title, owner, history, layers):
    kwargs = {"date": datetime.datetime.now(),
              "title": title,
              "history_json": history,
              "layer_json": layers,
              "owner": owner}
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
artist = verify_id() 

matches = DrawingHistory.selectBy(title = title, owner=artist.name)
if matches.count() > 0:
    updateOld(matches[0], history, layers)
else:
    createNew(title, history, layers)

print "Content-type: text/html"
print
print "OK, saved"
