#!/bin/sh
set -eu

# Root читает закрытый файл хоста; postgres получает отдельную копию внутри контейнера.
if [ "$(id -u)" = 0 ] && [ -f /run/stageby/pgbackrest.conf ]; then
  install -o postgres -g postgres -m 0600 /run/stageby/pgbackrest.conf /etc/pgbackrest/pgbackrest.conf
fi

exec /usr/local/bin/docker-entrypoint.sh "$@"
