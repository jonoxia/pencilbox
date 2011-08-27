#!/usr/bin/python

import Cookie
import os
import string
from pencilbox_config import TEMPLATE_DIR
from database_tables import Artist

def render_template_file( filename, substitutionDict ):
    file = open( os.path.join( TEMPLATE_DIR, filename ), "r")
    template = string.Template(file.read())
    file.close()
    return template.substitute( substitutionDict )

def verify_id():
    if os.environ.has_key('HTTP_COOKIE'):
        cookie = Cookie.SimpleCookie(os.environ['HTTP_COOKIE'])
        if cookie.has_key("email") and cookie.has_key("session"):
                matches = Artist.selectBy(email = cookie["email"].value,
                                          session = cookie["session"].value)
                if matches.count() > 0:
                    return matches[0]

    # TODO if this fails don't just return false, kick 'em back out to index.html
    return False
