<?php
session_write_close();
$maxtime = 25;
$start = microtime(true);
$filename = '/tmp/sharedcanvas.csv';
$lasteventid = $_GET['lasteventid'] ?? null;
while((microtime(true) - $start) < $maxtime) {
    $rowstosend = [];
    $eventfound = false;

    $rows = false;
    $totalrows = 0;
    if (is_file($filename)) {
        $rows = file($filename);
        $totalrows = count($rows);
    }

    if ($rows !== false) {
        if (!is_null($lasteventid)) {
            $eventfound = false;
            foreach ($rows as $idx => $row) {
                $data = str_getcsv($row);
                $eventid = $data[0];
                if ($eventid == $lasteventid) {
                    // Send events from here on.
                    $rowstosend = array_slice($rows, $idx + 1);
                    $eventfound = true;
                    break;
                }
            }

            if (!$eventfound) {
                // Event not found in csv, may have passed a long while, resend everything.
                $rowstosend = $rows;
            }
        } else {
            $rowstosend = $rows;
        }

        if (!empty($rowstosend)) {
            echo '{"status":"success","rows":'.$totalrows.',"events":[';
            $started = false;
            foreach ($rowstosend as $row) {
                $event = str_getcsv($row);

                if ($event[0] === 'id') {
                    // Skip header.
                    continue;
                }

                if ($started) {
                    echo ',';
                } else {
                    $started = true;
                }
                echo json_encode([
                    'eventid' => $event[0],
                    'event' => $event[1],
                    'data' => [
                        'x0' => $event[2],
                        'x1' => $event[3],
                        'y0' => $event[4],
                        'y1' => $event[5],
                        'color' => $event[6],
                    ]
                ], true);
            }
            echo ']}';
            exit;
        }
    }
    // 1/4 of a second.
    usleep( 250000 );
}

echo '{ "status": "timeout" }';