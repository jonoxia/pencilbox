#!/usr/bin/python

# This script takes a username and spits out a list of links to all
# works drawn by that user.
from database_tables import Artist, DrawingHistory
import os
import cgi
import cgitb
import string
from Cookie import SimpleCookie

TEMPLATE_DIR = "/var/www/pencilbox2"  # TODO get this from config file

def render_template_file( filename, substitutionDict ):
    file = open( os.path.join( TEMPLATE_DIR, filename ), "r")
    template = string.Template(file.read())
    file.close()
    return template.substitute( substitutionDict )

def verifyId():   # TODO all files will need this, put in common location
    if os.environ.has_key('HTTP_COOKIE'):
        cookie = SimpleCookie(os.environ['HTTP_COOKIE'])
        if cookie.has_key("email") and cookie.has_key("session"):
                matches = Artist.selectBy(email = cookie["email"].value,
                                          session = cookie["session"].value)
                if matches.count() > 0:
                    return matches[0]
    return False


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

    artist = verifyId()
    action = q.getfirst("action", "")
    title = q.getfirst("title", "")

    if action == "del":
        matches = DrawingHistory.selectBy(owner = artist, title = title)
        if matches.count() > 0:
            DrawingHistory.delete(matches[0].id)

    printList(artist)


