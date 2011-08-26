#!/usr/bin/python

# This script takes a username and spits out a list of links to all
# works drawn by that user.
from savedHistoryTable import DrawingHistory

TEMPLATE_DIR = "/var/www/pencilbox2"

import os
import cgi
import cgitb
import string

def render_template_file( filename, substitutionDict ):
    file = open( os.path.join( TEMPLATE_DIR, filename ), "r")
    template = string.Template(file.read())
    file.close()
    return template.substitute( substitutionDict )


def printList(artist):
    print "Content-type: text/html"
    print

    matches = DrawingHistory.select(DrawingHistory.q.owner == artist,
                                    orderBy = "-date")
    if matches.count() > 0:
        work_list = ""
        for match in matches:
            title = match.title
            url = "touchscreen.html?filename=%s" % title
            date = match.date
            size = len(match.history_json) + len(match.layer_json)
            size = "%d KB" % int(size/1024)
            work_list += render_template_file( "listwork_row.html",
                                               {"moddate": date,
                                                "size": size,
                                                "title": title,
                                                "artist": artist} )
    
        print render_template_file( "listworks.html", {"artist": artist,
                                                       "work_list": work_list})
    else:
        print "No matches for %s" % artist


if __name__ == "__main__":
    cgitb.enable()
    q = cgi.FieldStorage()

    action = q.getfirst("action", "")
    artist = q.getfirst("artist", "")
    title = q.getfirst("title", "")

    if action == "del":
        matches = DrawingHistory.selectBy(owner = artist, title = title)
        if matches.count() > 0:
            DrawingHistory.delete(matches[0].id)

    printList(artist)


