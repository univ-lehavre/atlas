<?php
/**
 * REDCap Database Configuration for Docker
 */

global $log_all_errors;
$log_all_errors = TRUE;

// MySQL Database Connection
$hostname   = 'mariadb';
$db         = 'redcap';
$username   = 'redcap';
$password   = 'redcap_password';

// SSL (not used in Docker dev environment)
$db_ssl_key     = '';
$db_ssl_cert    = '';
$db_ssl_ca      = '';
$db_ssl_capath  = NULL;
$db_ssl_cipher  = NULL;
$db_ssl_verify_server_cert = false;

// Salt for data de-identification (random value for dev)
$salt = 'atlas_dev_salt_do_not_use_in_production';
