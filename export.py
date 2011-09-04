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
from PIL import Image
from webserver_utils import get_dir_for_artist, verify_id
from pencilbox_config import FILE_PUB_URL

def compositeFiles(artist, fileNameList, outFileName):
  tmp_dir = get_dir_for_artist(artist, "tmp")
  pub_dir = get_dir_for_artist(artist, "pub")
  baseImage = Image.open( os.path.join(tmp_dir, fileNameList[0]) )
  for fileName in fileNameList[1:]:
    layerImage = Image.open( os.path.join(tmp_dir, fileName) )
    baseImage.paste(layerImage, (0, 0), layerImage)
  baseImage.save( os.path.join(pub_dir, outFileName ))

def writeTempFiles(artist, dataBlob, outFileName):
  tmp_dir = get_dir_for_artist(artist, "tmp")
  layerBlobs = dataBlob.split(",")
  filenames = []
  for i in xrange(len(layerBlobs)):
    data = layerBlobs[i]
    filename = "layer%d-%s" % (i, outFileName)
    filenames.append(filename)
    file = open( os.path.join(tmp_dir, filename), "wb")
    # Get an "incorrect padding" error on trying to decode.
    # Correct b64 padding:
    while len(data) % 4 != 0:
      data = data + "="
    file.write(base64.b64decode(data))
    file.close()

  return filenames


cgitb.enable()
q = cgi.FieldStorage()
data = q.getfirst("data", "")
filename = q.getfirst("filename", "untitled")
filename = "%s-%d.png" % (filename, time.time())

artist = verify_id()
tempFileNames = writeTempFiles(artist, data, filename)

compositeFiles(artist, tempFileNames, filename)

url = FILE_PUB_URL % (str(artist.id), filename)
# TODO delete temp files

print "Content-type: text/html"
print
print url
#except Exception as e:
#  print "Content-type: text/html"
#  print
#  print "Error: ",
#  print e
