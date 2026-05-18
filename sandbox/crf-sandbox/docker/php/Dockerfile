FROM php:8.2-apache

# Install required PHP extensions for REDCap
RUN apt-get update && apt-get install -y \
    libfreetype6-dev \
    libjpeg62-turbo-dev \
    libpng-dev \
    libzip-dev \
    libicu-dev \
    libldap2-dev \
    libxml2-dev \
    libcurl4-openssl-dev \
    unzip \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Configure and install PHP extensions
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        gd \
        mysqli \
        pdo_mysql \
        zip \
        intl \
        ldap \
        soap \
        curl \
        opcache

# Enable Apache modules
RUN a2enmod rewrite headers

# Configure Apache
RUN echo "ServerName localhost" >> /etc/apache2/apache2.conf

# Set recommended PHP settings for REDCap
RUN { \
    echo 'upload_max_filesize = 128M'; \
    echo 'post_max_size = 128M'; \
    echo 'max_execution_time = 600'; \
    echo 'max_input_time = 600'; \
    echo 'memory_limit = 512M'; \
    echo 'date.timezone = Europe/Paris'; \
} > /usr/local/etc/php/conf.d/redcap-recommended.ini

# Set working directory
WORKDIR /var/www/html

# Expose port 80
EXPOSE 80
