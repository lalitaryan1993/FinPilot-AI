FROM php:8.4-fpm-alpine AS base

# System dependencies
RUN apk add --no-cache \
    nginx \
    supervisor \
    nodejs \
    npm \
    git \
    curl \
    zip \
    unzip \
    libpng-dev \
    libjpeg-turbo-dev \
    libwebp-dev \
    freetype-dev \
    oniguruma-dev \
    libxml2-dev \
    icu-dev \
    linux-headers \
    $PHPIZE_DEPS

# PHP extensions
RUN docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
 && docker-php-ext-install \
    pdo_mysql \
    mbstring \
    exif \
    pcntl \
    bcmath \
    gd \
    xml \
    intl \
    opcache \
    sockets

# Redis extension
RUN pecl install redis && docker-php-ext-enable redis

# Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# PHP config
RUN cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"
COPY docker/php.ini "$PHP_INI_DIR/conf.d/finpilot.ini"

WORKDIR /var/www/html

# ============================================================
FROM base AS development

ENV APP_ENV=local
COPY . .
RUN composer install --no-interaction --prefer-dist
RUN npm install && npm run build
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

# ============================================================
FROM base AS production

ENV APP_ENV=production

COPY . .
RUN composer install --no-interaction --prefer-dist --optimize-autoloader --no-dev
RUN npm ci && npm run build && rm -rf node_modules

RUN php artisan config:cache \
 && php artisan route:cache \
 && php artisan view:cache \
 && php artisan event:cache

RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

COPY docker/nginx.conf   /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisord.conf

EXPOSE 80 8080

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
