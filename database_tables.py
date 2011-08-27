#!/usr/bin/python

from sqlobject import *
import datetime
from pencilbox_config import URL_STRING

connection = connectionForURI( URL_STRING )
sqlhub.processConnection = connection

class DrawingHistory( SQLObject ):
    class sqlmeta:
        table = "drawing_histories"
    date = DateTimeCol()
    history_json = StringCol()
    layer_json = StringCol()
    title = StringCol()
    owner = StringCol()

class Artist( SQLObject ):
    email = StringCol()
    name = StringCol()
    session = StringCol()
    
if __name__ == "__main__":
    Artist.createTable()
    DrawingHistory.createTable()
