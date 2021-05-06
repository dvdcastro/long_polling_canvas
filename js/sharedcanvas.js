'use strict';

(function() {

    const socket = new function() {

        let self = this;

        self.lastEventId = null;

        self.listeners = [];

        self.abortPoll = false;

        self.enableReplay = true;

        self.emit = (event, data) => {
            $.ajax({
                type: 'POST',
                url: 'update_state.php',
                data: {
                    event: event,
                    data: data,
                },
                success: (response) => {
                    const data = JSON.parse(response);
                    if (data.status === 'success') {
                        self.updateRows(data.rows);
                    }
                }, error: (response) => {
                    console.error(response);
                }
            });
        };

        self.on = (event, listener) => {
            if (!self.listeners[event]) {
                self.listeners[event] = [];
            }

            self.listeners[event].push(listener);
        };

        self.poll = (delay = 0, canAbort = true) => {
            let data = {};
            if (self.lastEventId) {
                data.lasteventid = self.lastEventId;
            }
            $.ajax({
                type: 'GET',
                url: 'long_poll.php',
                data: data,
                success: (response) => {
                    if (self.abortPoll && canAbort) {
                        self.abortPoll = false;
                        return;
                    }

                    const data = JSON.parse(response);
                    if (data.status === 'success') {
                        self.processEvents(data.events, delay, self.poll);
                        self.updateRows(data.rows);
                    } else {
                        self.poll();
                    }
                }, error: (response) => {
                    console.error(response);
                    self.poll();
                }
            })
        };

        self.processEvents = (events, delay, callback) => {
            if (events.length === 0) {
                if (!self.enableReplay) {
                    self.enableReplay = true;
                }
                callback();
                return;
            }

            const ev = events.shift();
            if (delay) {
                setTimeout(() => {
                    self.processEvent(ev);
                    self.processEvents(events, delay, callback);
                }, delay);
            } else {
                self.processEvent(ev);
                self.processEvents(events, delay, callback);
            }
        };

        self.processEvent = (event) => {
            self.lastEventId = event.eventid;
            if (self.listeners[event.event]) {
                for (let li of self.listeners[event.event]) {
                    li(event.data);
                }
            }
        };

        self.updateRows = (rows) => {
            const rowsNode = document.getElementsByClassName('rows')[0];
            rowsNode.textContent = 'Rows: ' + rows;
        };

        self.replay = () => {
            if (self.enableReplay) {
                self.enableReplay = false;
            } else {
                return false;
            }

            self.lastEventId = null;
            self.setAbortPoll();
            self.poll(1, false);
            return true;
        };

        self.setAbortPoll = () => {
            self.abortPoll = true;
        };

        return self;
    }

    var canvas = document.getElementsByClassName('whiteboard')[0];
    var colors = document.getElementsByClassName('color');
    var context = canvas.getContext('2d');

    var current = {
        color: 'black'
    };
    var drawing = false;

    canvas.addEventListener('mousedown', onMouseDown, false);
    canvas.addEventListener('mouseup', onMouseUp, false);
    canvas.addEventListener('mouseout', onMouseUp, false);
    canvas.addEventListener('mousemove', throttle(onMouseMove, 10), false);

    //Touch support for mobile devices
    canvas.addEventListener('touchstart', onMouseDown, false);
    canvas.addEventListener('touchend', onMouseUp, false);
    canvas.addEventListener('touchcancel', onMouseUp, false);
    canvas.addEventListener('touchmove', throttle(onMouseMove, 10), false);

    for (var i = 0; i < colors.length; i++){
        colors[i].addEventListener('click', onColorUpdate, false);
    }

    socket.on('drawing', onDrawingEvent);
    socket.on('clear', onClearEvent);

    window.addEventListener('resize', onResize, false);
    onResize();


    function drawLine(x0, y0, x1, y1, color, emit){
        context.beginPath();
        context.moveTo(x0, y0);
        context.lineTo(x1, y1);
        context.strokeStyle = color;
        context.lineWidth = 2;
        context.stroke();
        context.closePath();

        if (!emit) { return; }
        var w = canvas.width;
        var h = canvas.height;

        socket.emit('drawing', {
            x0: x0 / w,
            y0: y0 / h,
            x1: x1 / w,
            y1: y1 / h,
            color: color
        });
    }

    function onMouseDown(e){
        drawing = true;
        current.x = e.clientX||e.touches[0].clientX;
        current.y = e.clientY||e.touches[0].clientY;
    }

    function onMouseUp(e){
        if (!drawing) { return; }
        drawing = false;
        drawLine(current.x, current.y, e.clientX||e.touches[0].clientX, e.clientY||e.touches[0].clientY, current.color, true);
    }

    function onMouseMove(e){
        if (!drawing) { return; }
        drawLine(current.x, current.y, e.clientX||e.touches[0].clientX, e.clientY||e.touches[0].clientY, current.color, true);
        current.x = e.clientX||e.touches[0].clientX;
        current.y = e.clientY||e.touches[0].clientY;
    }

    function onColorUpdate(e){
        const color = e.target.className.split(' ')[1];
        if (color === 'clear') {
            socket.emit('clear', {});
        } if (color === 'replay') {
            if (socket.replay()) {
                onClearEvent();
            }
        } else {
            current.color = color;
        }
    }

    // limit the number of events per second
    function throttle(callback, delay) {
        var previousCall = new Date().getTime();
        return function() {
            var time = new Date().getTime();

            if ((time - previousCall) >= delay) {
                previousCall = time;
                callback.apply(null, arguments);
            }
        };
    }

    function onDrawingEvent(data){
        var w = canvas.width;
        var h = canvas.height;
        drawLine(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h, data.color);
    }

    function onClearEvent(){
        context.clearRect(0, 0, canvas.width, canvas.height);
    }

    // make the canvas fill its parent
    function onResize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    // Kickstart socket if long polling.
    if (socket.poll) {
        socket.poll(0);
    }

})();