#!/usr/bin/python

import Cookie
import os
import sys
import string
from pencilbox_config import TEMPLATE_DIR, ARTIST_FILE_BASE_DIR
from database_tables import Artist

def render_template_file( filename, substitutionDict ):
    file = open( os.path.join( TEMPLATE_DIR, filename ), "r")
    template = string.Template(file.read())
    file.close()
    return template.substitute( substitutionDict )

def print_redirect(url, cookie = None):
    print "Status: 302" # temporary redirect
    if cookie:
        print cookie
    print "Location: " + url
    print

def logout():
    artist = verify_id()
    artist.session = ""
    antimatter_cookie = Cookie.SimpleCookie()
    antimatter_cookie["email"] = artist.email
    antimatter_cookie["email"]["expires"] = 0
    antimatter_cookie["session"] = artist.session
    antimatter_cookie["session"]["expires"] = 0
    print_redirect("index.html", antimatter_cookie)

def verify_id():
    if os.environ.has_key('HTTP_COOKIE'):
        cookie = Cookie.SimpleCookie(os.environ['HTTP_COOKIE'])
        if cookie.has_key("email") and cookie.has_key("session"):
            matches = Artist.selectBy(email = cookie["email"].value,
                                      session = cookie["session"].value)
            if matches.count() > 0:
                if matches[0].session != "":
                    return matches[0]

    # If verification fails, kick 'em back out to index.html
    print_redirect("index.html")
    sys.exit(1)

def get_dir_for_artist(artist, subdir):
    # subdir should be "tmp" for temp files and "pub" for published files
    # creates it if it doesn't already exist.
    dir = os.path.join(ARTIST_FILE_BASE_DIR, "%d" % artist.id)
    if not (os.path.isdir(dir)):
        os.mkdir(dir)
    dir = os.path.join(dir, subdir)
    if not (os.path.isdir(dir)):
        os.mkdir(dir)
    return dir

