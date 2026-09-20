# ============================================================================
#  /chatbot  →  conversation web app  (docker compose, published on 127.0.0.1:13001)
#
#  This is a *snippet* to be included INSIDE the existing 443 server block of
#  /etc/nginx/conf.d/ixhc.concentrix.com.conf — nothing else has to change.
#
#  Install (as root):
#    1) cp chatbot-location.inc /etc/nginx/snippets/chatbot.inc
#    2) add ONE line inside the 443 `server { … }` block, e.g. just before the
#       "根路径反代（Dify）" `location / { … }` block:
#           include /etc/nginx/snippets/chatbot.inc;
#    3) nginx -t && systemctl reload nginx
#
#  Do NOT copy this into /etc/nginx/conf.d/ as a *.conf file:
#    * files ending in .conf there are included at http level, and a bare
#      `location {}` block there is a syntax error;
#    * a second server{} with the same server_name only yields a
#      "conflicting server name" warning — nginx keeps one of the two.
#
#  Deliberate details
#    * `^~` = skip regex locations for /chatbot, so no existing or future
#      `location ~* \.(js|css|…)$` can hijack the app's static assets.
#    * NO add_header in here on purpose: a location-level add_header REPLACES
#      the inherited set, which would drop the server-level HSTS / CSP /
#      X-Content-Type-Options headers (this config re-declares them in every
#      location for exactly that reason). Omit → everything is inherited.
#    * Host port is 13001, not the usual 3000 — 3000 is the default of many
#      tools and of this repo's own compose file, so it is the likeliest to be
#      taken by something else later. If you change it, change it in the
#      compose override file too.
#    * client_max_body_size is inherited from the server level (50m already).
#    * No WebSocket: the app streams answers over SSE (plain fetch), so no
#      Upgrade/Connection "upgrade" here — but buffering must stay OFF and the
#      read timeout must be long, otherwise answers arrive in one lump at the
#      end and slow models get cut off at nginx's default 60s.
# ============================================================================
location ^~ /chatbot {
    proxy_pass http://127.0.0.1:13001;

    proxy_http_version 1.1;
    proxy_set_header Connection        "";

    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;   # same style as the other locations in this file

    proxy_buffering    off;
    proxy_cache        off;
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
}