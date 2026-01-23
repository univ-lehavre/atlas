<?php
/**
 * REDCap Database Configuration for Docker
 *
 * Copy this file to ../redcap-source/database.php
 */

// MySQL database connection
$hostname = 'db';
$db       = 'redcap';
$username = 'redcap';
$password = 'redcap_password';

// Salt for password hashing (generate a random string for production)
$salt = 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz';

// REDCap temporary file storage (must be web-accessible)
// For Docker, use a path inside the container
$edoc_path = '/var/www/html/edocs/';
