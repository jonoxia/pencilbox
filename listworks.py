#!/usr/bin/python

# This script takes a username and spits out a list of links to all
# works drawn by that user.
from savedHistoryTable import DrawingHistory

import cgi
import cgitb

cgitb.enable()
q = cgi.FieldStorage()
artist = q.getfirst("artist", "")


matches = DrawingHistory.selectBy(owner = artist)
print "Content-type: text/html"
print

if matches.count() > 0:
    print "<html><head><title>Pencilbox - Works By %s</title>" % artist
    print "</head><body><table>"
    for match in matches:
        title = match.title
        url = "touchscreen.html?filename=%s" % title
        print "<tr><td><a href=\"%s\">%s</a></td></tr>" % (url, title)
    print "</table></body></html>"
