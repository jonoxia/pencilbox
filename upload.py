#!/usr/bin/python
from database_tables import DrawingHistory
from webserver_utils import verify_id, get_dir_for_artist
frompencilbox_config import TMP_FILE_URL

import cgi, os
import cgitb; cgitb.enable()

if __name__ == "__main__":
    form = cgi.FieldStorage()

    artist = verify_id()

    # A nested FieldStorage instance holds the file
    fileitem = form['file']

    # Test if the file was uploaded
    if fileitem.filename:
   
        # strip leading path from file name to avoid 
        # directory traversal attacks
        fn = os.path.basename(fileitem.filename)
        tmp_dir = get_dir_for_artist(artist, "tmp")
        # TODO rename if needed to avoid name collision
        # Also strip any non-url-kosher characters from filename
        # e.g. 
        file = open(os.path.join(tmp_dir, fn), 'wb')
        file.write(fileitem.file.read())
        file.close()
        message = TMP_FILE_URL % (str(artist.id), fn)
   
    else:
        message = "Failed"
   
    print "Content-Type: text/html"
    print
    print message
