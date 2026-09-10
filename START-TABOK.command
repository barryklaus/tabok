#!/bin/zsh
cd -- "${0:A:h}"
TABOK_PORT=8773
python3 -m http.server "$TABOK_PORT" &
TABOK_SERVER_PID=$!
sleep 1
open "http://127.0.0.1:$TABOK_PORT/index.html"
echo "TABOK True 3D is running. Keep this window open while playing."
echo "Press Control-C here when you are finished."
wait "$TABOK_SERVER_PID"
