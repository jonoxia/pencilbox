#!/usr/bin/python

# This script takes a username and spits out a list of links to all
# works drawn by that user.
import cgi
import cgitb

from database_tables import DrawingHistory
from webserver_utils import *

def printList(artist):
    print "Content-type: text/html"
    print

    matches = DrawingHistory.select(DrawingHistory.q.creator == artist,
                                    orderBy = "-date")
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

def work_exists(artist, title):
    matches = DrawingHistory.selectBy(creator = artist, title = title)
    return (matches.count() > 0)

def make_new_title(artist):
    title = "Untitled"
    num = 0
    while work_exists(artist, title):
        num += 1
        title = "Untitled_%d" % num
    return title

if __name__ == "__main__":
    cgitb.enable()
    q = cgi.FieldStorage()

    artist = verify_id()
    action = q.getfirst("action", "")
    title = q.getfirst("title", "")

    if action == "del":
        matches = DrawingHistory.selectBy(creator = artist, title = title)
        if matches.count() > 0:
            DrawingHistory.delete(matches[0].id)
        printList(artist)
    elif action == "new":
        new_title = make_new_title(artist)
        url = "touchscreen.html?artist=%s&title=%s" % (artist.name, new_title)
        print_redirect(url)
    elif action == "logout":
        logout() # will clear cookie and redirect
    else:
        # No action = show the list
        printList(artist)


