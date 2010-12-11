
Pencilbox is an HTML 5 drawing webapp by Jono Xia.  It's meant especially for drawing webcomics, but can be used for other kinds of drawing too.  It's designed for a multitouch interface with a stylus, and won't really work without one.

So far it has been tested only in Firefox 4 running in Windows 7.  Ideally I want to expand it to work in other browsers and operating systems, but first I want to get it to a point where it's useful for me, and that means working on my computer.

1. License

All of the Pencilbox source code files are under Mozilla Public License Version 1.1 and can alternately be used under the terms of GPL 2.0 or later or LGPL 2.1 or later.  See the license block in any of the code files for more information.

The icons used in this app (the files under the icons/ directory) were not created by me.  They are used under a Creative Commons Share-alike 3.0 license from www.aha-soft.com


2. Prerequisites (for hosting the webapp)

A webserver, obviously.

MySQL.  (May work with other SQL DBMS too, but I haven't tested it.)

You'll need Python 2.5 or higher on your server.  Python will need the following modules installed:
* SQLObject
* PIL (Python Image Library)
* simplejson

JQuery 1.4.2 or higher.

3. How to install and run Pencilbox on your server

Drop the jquery-1.4.2.js file into this directory.  Make sure the directory is in the right place on your webserver and that your webserver process can read it.

Make sure that load.py, save.py, and export.py are executable by your Python process.  The tmpimages directory needs to be writable by the same process.

Copy pencilbox_config.py.template to a file called pencilbox_config.py.  Edit the file and replace the database URL string with your own database connection URL string.

Load up touchscreen.html in your web browser to try out the app.

Go to tests.html to run unit tests.


Dec 2010
--Jono X
