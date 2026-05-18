-- REDCap Database Initialization
-- This script runs on first container startup

-- Grant privileges to redcap user
GRANT ALL PRIVILEGES ON redcap.* TO 'redcap'@'%';
FLUSH PRIVILEGES;

-- Set MySQL configuration for REDCap compatibility
SET GLOBAL sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';
SET GLOBAL max_allowed_packet = 67108864;
SET GLOBAL innodb_lock_wait_timeout = 120;
