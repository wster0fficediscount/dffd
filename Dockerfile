# Use official PHP + Apache image
FROM php:8.2-apache

# Enable Apache mod_rewrite (if needed later)
RUN a2enmod rewrite

# Copy your PHP file(s) to the default web root
COPY ./ /var/www/html/

# Set permissions (optional, but good practice)
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html

# Expose HTTP port
EXPOSE 80

# Apache runs automatically with the base image
