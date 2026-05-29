#!/bin/bash
# changement de droits des fichiers sources
# (un "chown" pourra aussi fonctionner mais vous ne pourrez plus éditer vos fichier)
chmod -R 777 /var/www/html
# 2) Appeler l'entrypoint officiel pour conserver l'init PHP
docker-php-entrypoint "$@"
# 3) Lancer le process final en remplaçant le shell (PID 1)
exec "$@"