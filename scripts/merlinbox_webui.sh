#!/bin/sh

# Software Center passes the request id as $1 and params[0] as $2.
. /koolshare/scripts/base.sh

INSTALL_DIR="$(dbus get merlinbox_install_dir)"
INSTALL_DIR="${INSTALL_DIR:-/jffs/merlin-box}"
RUNNING=0
PORT=8080
RESULT=ok

read_status() {
    RUNNING=0
    PORT=8080
    if [ -f /tmp/merlin-box-server.pid ]; then
        #读取出pid文件中的pid
        PID=$(cat /tmp/merlin-box-server.pid)
        # 精确匹配 PID，取第一个 IPv4 TCP 监听端口。
        PORT=$(netstat -lntp 2>/dev/null | awk -v pid="$PID" '
            $1 == "tcp" {
                split($7, process, "/")
                if (process[1] == pid) {
                    split($4, address, ":")
                    print address[2]
                    exit
                }
            }
        ')
        PORT=${PORT:-8080}
        RUNNING=1
    fi
}

read_status
case "$2" in
    status) ;;
    start|stop)
        if [ ! -f "$INSTALL_DIR/merlin-box.sh" ]; then
            RESULT=missing
        elif [ "$2" = start ] && [ "$RUNNING" = 1 ]; then
            :
        else
            # Keep command output out of the API response.
            (cd "$INSTALL_DIR" && sh ./merlin-box.sh server "$2") >/tmp/merlinbox_webui.log 2>&1 || RESULT=failed
            read_status
            [ "$2" = start ] && [ "$RUNNING" != 1 ] && RESULT=failed
            [ "$2" = stop ] && [ "$RUNNING" != 0 ] && RESULT=failed
        fi
        ;;
    *) RESULT=invalid ;;
esac

# result: running@@port@@operation result
http_response "$RUNNING@@$PORT@@$RESULT"
