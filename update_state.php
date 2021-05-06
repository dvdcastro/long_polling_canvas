<?php
session_write_close();
$filename = '/tmp/sharedcanvas.csv';
$columns = ['id','event','x0','y0','x1','y1','color'];
$handle = null;
$rows = [];
if (!is_file($filename)) {
    $handle = fopen($filename, 'w');
    fputcsv($handle, $columns);
    fclose($handle);
} else {
    $rows = file($filename);
}
$id = uniqid();
$event = $_POST['event'];
$x0 = $_POST['data']['x0'];
$x1 = $_POST['data']['x1'];
$y0 = $_POST['data']['y0'];
$y1 = $_POST['data']['y1'];
$color = $_POST['data']['color'];

$row = [
    $id, $event, $x0, $x1, $y0, $y1, $color
];

$handle = fopen($filename, 'a');
fputcsv($handle, $row);
fclose($handle);

$maxrows = 50000;
$rows = file($filename);
$rowcount = count($rows) - 1;
if ($rowcount > $maxrows) {
    $rows = array_slice($rows, $rowcount - ((int)($maxrows * 0.75)));
    $handle = fopen($filename, 'w');
    fputcsv($handle, $columns);
    foreach ($rows as $row) {
        fputcsv($handle, $row);
    }
    fclose($handle);
}

echo '{ "status" : "success", "rows" : ' . $rowcount . ' }';