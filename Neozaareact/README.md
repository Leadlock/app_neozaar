## REACT APP

```bash
cd /home/azureuser/react

```

```bash
Git pull origin main
npm run build
npm run export
```

```bash
sudo rm -rf /var/www/html/react
sudo mkdir -p /var/www/html/react
sudo rsync -av out/ /var/www/html/react/
sudo chown -R www-data:www-data /var/www/html/react
sudo chmod -R 755 /var/www/html/react
```
## ANGULAR APP

```bash
cd /home/azureuser/…
```
```bash
npm run build 
OR
npm run build -- --base-href /angular/
```
```bash
sudo rm -rf /var/www/html/angular/*
cp -r dist/neozaar-portal-frontend/browser/* /var/www/html/angular/
sudo chown -R www-data:www-data /var/www/html/angular
sudo chmod -R 755 /var/www/html/angular
```
```bash
sudo systemctl reload apache2
sudo nano /etc/apache2/sites-available/next.conf
```
```bash
<VirtualHost *:80>
    ServerName 20.83.163.38
    DocumentRoot /var/www/html/react

    <Directory /var/www/html/react>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
```
## SPA fallback for Next.js static export

```bash
 <IfModule mod_rewrite.c>
        RewriteEngine On
        RewriteCond %{REQUEST_URI} !^/*
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule ^ /index.html [L]
    </IfModule>
```
 ## Angular app under /angular

 ```bash
     Alias /angular /var/www/html/angular
    <Directory /var/www/html/angular>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    <Location /angular>
        RewriteEngine On
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule ^ /angular/index.html [L]
    </Location>

    ErrorLog ${APACHE_LOG_DIR}/app-error.log
    CustomLog ${APACHE_LOG_DIR}/app-access.log combined
</VirtualHost>
 ```
