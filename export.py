#!/usr/bin/python

# POST a data URL to this script
# It will convert to a .png, save on server, and send you back a link.

# Expect something like this:
# "data:image/png;base64,
# iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAABGdBTUEAALGP
# C/xhBQAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9YGARc5KB0XV+IA
# AAAddEVYdENvbW1lbnQAQ3JlYXRlZCB3aXRoIFRoZSBHSU1Q72QlbgAAAF1J
# REFUGNO9zL0NglAAxPEfdLTs4BZM4DIO4C7OwQg2JoQ9LE1exdlYvBBeZ7jq
# ch9//q1uH4TLzw4d6+ErXMMcXuHWxId3KOETnnXXV6MJpcq2MLaI97CER3N0
# vr4MkhoXe0rZigAAAABJRU5ErkJggg=="

# So we strip off everything up toand including the first comma,
# and assert that it matches "data:image/png;base64".

# Then we base64 decode the data...
# and then write it to a file.
# Anything else needed?

# Should we use jpegs cuz they're smaller?

import os
import base64
import cgi
import cgitb
import time

cgitb.enable()

q = cgi.FieldStorage()


data = q.getfirst("data", "")
filename = q.getfirst("filename", "untitled")

filename = "%s-%d.png" % (filename, time.time())

file = open( os.path.join("/var/www/multicanvas/tmpimages", filename), "wb")
  # Get an "incorrect padding" error on trying to decode.
# Correct b64 padding:
while len(data) % 4 != 0:
  data = data + "="
file.write(base64.b64decode(data))
file.close()

print "Content-type: text/html"
print
print "Saved as <a href=\"%s\">%s</a>" % ("/multicanvas/tmpimages/" + filename, filename)
#except Exception as e:
#  print "Content-type: text/html"
#  print
#  print "Error: ",
#  print e
