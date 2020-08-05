<?php

set_time_limit(0);

include "class.php";

$TwitchAutomator = new TwitchAutomator();

$vod = mb_ereg_replace("([^\w\s\d\-_~,;\[\]\(\).])", '', $_GET['vod']);

$json = json_decode( file_get_contents( TwitchConfig::cfg('vod_folder') . DIRECTORY_SEPARATOR . $vod . '.json'), true );

$second_start = (int)$_GET['start'];
$second_end = (int)$_GET['end'];

$filename_in = TwitchConfig::cfg('vod_folder') . DIRECTORY_SEPARATOR . $vod . '.mp4';
$filename_out = TwitchConfig::cfg('vod_folder') . DIRECTORY_SEPARATOR . 'clips' . DIRECTORY_SEPARATOR . $vod . '-cut-' . $second_start . '-' . $second_end . '.mp4';

$cmd = TwitchConfig::cfg('ffmpeg_path');
$cmd .= ' -i ' . escapeshellarg( $filename_in ); // input file
$cmd .= ' -ss ' . escapeshellarg( $second_start ); // start timestamp
$cmd .= ' -t ' . escapeshellarg( $second_end - $second_start ); // length
$cmd .= ' -codec copy'; // remux
$cmd .= ' ' . escapeshellarg($filename_out); // output file

echo $cmd;

$output = shell_exec($cmd);

file_put_contents('logs' . DIRECTORY_SEPARATOR . 'ffmpeg_' . $vod . '-cut-' . $second_start . '-' . $second_end . '_' . time() . '.log', $output );

echo 'done';