-- REDCap database initialization
-- This file is executed when the MariaDB container is first created

-- Grant all privileges to redcap user
GRANT ALL PRIVILEGES ON redcap.* TO 'redcap'@'%';
FLUSH PRIVILEGES;

-- The actual REDCap schema will be imported from the REDCap installation files
-- Place your redcap_install.sql in this directory and rename it to be executed after init.sql
