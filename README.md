# HTML Shared canvas using Long polling with PHP and file caching

This is a basic example of a project that uses long polling to share a canvas between multiple users at the same time.

It is based off [Socket.IO's example implementation](https://socket.io/demos/whiteboard/).

* It records the state of the canvas events in `/tmp/sharedcanvas.csv`.
* It will also purge some entries once it reaches `50000` entries. See `update_state.php`