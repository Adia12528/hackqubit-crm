<?php
/**
 * Switches EspoCRM's default file storage from local disk (data/upload)
 * to the S3-compatible MinIO bucket. Run INSIDE the espocrm container,
 * after the initial install has completed (data/config.php must exist).
 *
 * Usage (from host, via the wrapper shell script):
 *   docker compose exec espocrm php /tmp/configure-s3-storage.php
 *
 * Reads connection details from environment variables so no secrets are
 * hardcoded here.
 */

$configPath = '/var/www/html/data/config.php';
$configInternalPath = '/var/www/html/data/config-internal.php';

if (!file_exists($configPath)) {
    fwrite(STDERR, "config.php not found — has EspoCRM finished installing yet?\n");
    exit(1);
}

$bucket = getenv('MINIO_BUCKET') ?: 'espocrm-files';
$key = getenv('MINIO_ROOT_USER');
$secret = getenv('MINIO_ROOT_PASSWORD');

if (!$key || !$secret) {
    fwrite(STDERR, "MINIO_ROOT_USER / MINIO_ROOT_PASSWORD not set in the container environment.\n");
    exit(1);
}

// --- data/config.php: tell EspoCRM which storage driver to use ---
$config = include $configPath;
$config['defaultFileStorage'] = 'AwsS3';
$config['thumbImageCacheDisabled'] = true;
file_put_contents(
    $configPath,
    "<?php\nreturn " . var_export($config, true) . ";\n"
);

// --- data/config-internal.php: the actual S3/MinIO connection details ---
$configInternal = file_exists($configInternalPath) ? (include $configInternalPath) : [];
if (!is_array($configInternal)) {
    $configInternal = [];
}
$configInternal['awsS3Storage'] = [
    'bucketName' => $bucket,
    'credentials' => [
        'key' => $key,
        'secret' => $secret,
    ],
    'region' => 'us-east-1',
    // Pointing at our own MinIO container instead of real AWS — supported
    // via the `endpoint` option (EspoCRM v8.1+).
    'endpoint' => 'http://minio:9000',
    'usePathStyleEndpoint' => true,
];
file_put_contents(
    $configInternalPath,
    "<?php\nreturn " . var_export($configInternal, true) . ";\n"
);

echo "✅ EspoCRM is now configured to store files in MinIO bucket '{$bucket}'.\n";
echo "   Restart the espocrm, espocrm-daemon and espocrm-websocket containers for this to take effect.\n";
