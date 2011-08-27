#!/usr/bin/python

# This script takes a username and spits out a list of links to all
# works drawn by that user.
import cgi
import cgitb

from database_tables import DrawingHistory
from webserver_utils import render_template_file, verify_id

def printList(artist):
    print "Content-type: text/html"
    print

    matches = DrawingHistory.select(DrawingHistory.q.owner == artist.name,
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
                                                "artist": artist.name} )
    
        print render_template_file( "listworks.html", {"artist": artist.name,
                                                       "work_list": work_list})
    else:
        print "No matches for %s" % artist.name


if __name__ == "__main__":
    cgitb.enable()
    q = cgi.FieldStorage()

    artist = verify_id()
    action = q.getfirst("action", "")
    title = q.getfirst("title", "")

    if action == "del":
        matches = DrawingHistory.selectBy(owner = artist.name, title = title)
        if matches.count() > 0:
            DrawingHistory.delete(matches[0].id)

    printList(artist)


