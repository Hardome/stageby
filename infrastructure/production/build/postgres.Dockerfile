FROM postgres:18.6-trixie@sha256:979bccfde35445db618c65107d27d08c6c21339d8dc3ad4c830c6633947be0e4

RUN apt-get update \
 && apt-get install --yes --no-install-recommends ca-certificates pgbackrest=2.60.0-1.pgdg13+1 \
 && rm -rf /var/lib/apt/lists/* \
 && test -s /etc/ssl/certs/ca-certificates.crt \
 && pgbackrest version \
 && postgres --version \
 && install -d -o postgres -g postgres -m 0750 /var/log/pgbackrest /var/spool/pgbackrest /etc/pgbackrest

COPY --chmod=0755 infrastructure/production/build/postgres-entrypoint.sh /usr/local/bin/stageby-postgres-entrypoint
ENTRYPOINT ["/usr/local/bin/stageby-postgres-entrypoint"]
CMD ["postgres"]
