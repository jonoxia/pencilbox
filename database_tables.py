#!/usr/bin/python

from sqlobject import *
import datetime
from pencilbox_config import URL_STRING

connection = connectionForURI( URL_STRING )
sqlhub.processConnection = connection

# TODO put the other tables here as well
class Artist( SQLObject ):
    email = StringCol()
    name = StringCol()
    session = StringCol()
    
if __name__ == "__main__":
    Artist.createTable()
