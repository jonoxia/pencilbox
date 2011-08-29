#!/usr/bin/python
from database_tables import DrawingHistory
from webserver_utils import verify_id, get_dir_for_artist
from pencilbox_config import TMP_FILE_URL

import cgi, os
import cgitb
import urllib2
import time

def createUniqueFilename(filename):
    # TODO what if it's not a png -- use file extension of original
    # filename if present?
    # TODO include some info in here like the title of the
    # image it belongs to?
    return "%d.png" % time.time()

def uploadFromClient(fileitem):
    # Test if the file was uploaded
    if fileitem.filename:
        # Don't care about original filename; make a new one up
        # that way we don't have to worry about spaces, collisions, etc
        filename = createUniqueFilename(fileitem.filename)
        tmp_dir = get_dir_for_artist(artist, "tmp")
        file = open(os.path.join(tmp_dir, filename), "wb")
        file.write(fileitem.file.read())
        file.close()
        url = TMP_FILE_URL % (str(artist.id), filename)
        return url
    else:
        return False

def sideloadFromWeb(url):
    # TODO need to think about security - can someone fuck up my server
    # by using the url import to force it into downloading some bad
    # juju?
    response = urllib2.urlopen(url)
    data = response.read()
    # TODO how big a file will this work on?  might we need to stream
    # it for larger files?
    response.close()
  
    filename = createUniqueFilename(url.split("/")[-1])
    tmp_dir = get_dir_for_artist(artist, "tmp")

    file = open(os.path.join(tmp_dir, filename), "wb")
    file.write(data)
    file.close()
    url = TMP_FILE_URL % (str(artist.id), filename)
    return url
    # TODO error handling - return false if urlopen fails or whatever


if __name__ == "__main__":
    cgitb.enable()
    q = cgi.FieldStorage()

    artist = verify_id()
    url = False
    src_type = q.getfirst("src_type", "")
    
    if src_type == "file":
        url = uploadFromClient(q["file"])
    elif src_type == "url":
        url = sideloadFromWeb(q.getfirst("url", ""))

    print "Content-Type: text/html"
    print

    if url == False:
        print "Failed"
    else:
        print url
