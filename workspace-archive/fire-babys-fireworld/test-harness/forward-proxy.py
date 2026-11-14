#!/usr/bin/env python3
"""Local forward proxy that adds upstream proxy auth.
Listens on 127.0.0.1:18080, forwards to $https_proxy with Basic auth.
This works around Chromium's proxy-auth issues with the egress proxy.
"""
import base64
import os
import re
import socket
import threading

LISTEN_PORT = 18080

def get_upstream():
    proxy_url = os.environ.get("https_proxy") or os.environ.get("HTTPS_PROXY")
    m = re.match(r"(https?://)([^:]+):([^@]+)@(.+)", proxy_url)
    host_port = m.group(4)
    if ":" in host_port:
        host, port = host_port.rsplit(":", 1)
        port = int(port)
    else:
        host, port = host_port, 3128
    auth = base64.b64encode(f"{m.group(2)}:{m.group(3)}".encode()).decode()
    return host, port, auth

UPSTREAM_HOST, UPSTREAM_PORT, UPSTREAM_AUTH = get_upstream()

def handle_client(client):
    try:
        data = b""
        while b"\r\n\r\n" not in data:
            chunk = client.recv(4096)
            if not chunk:
                return
            data += chunk
            if len(data) > 65536:
                return
        header_end = data.find(b"\r\n\r\n") + 4
        headers = data[:header_end]
        rest = data[header_end:]

        lines = headers.decode("latin1").split("\r\n")
        request_line = lines[0]
        method, target, version = request_line.split(" ", 2)

        up = socket.create_connection((UPSTREAM_HOST, UPSTREAM_PORT), timeout=15)

        if method.upper() == "CONNECT":
            up.sendall(
                f"CONNECT {target} HTTP/1.1\r\n"
                f"Host: {target}\r\n"
                f"Proxy-Authorization: Basic {UPSTREAM_AUTH}\r\n"
                f"Proxy-Connection: keep-alive\r\n\r\n".encode()
            )
            resp = b""
            while b"\r\n\r\n" not in resp:
                chunk = up.recv(4096)
                if not chunk:
                    client.close()
                    up.close()
                    return
                resp += chunk
            if b" 200 " not in resp.split(b"\r\n", 1)[0]:
                client.sendall(b"HTTP/1.1 502 Bad Gateway\r\n\r\n")
                client.close()
                up.close()
                return
            client.sendall(b"HTTP/1.1 200 Connection Established\r\n\r\n")
            relay(client, up)
        else:
            new_lines = [request_line]
            for line in lines[1:]:
                if line.lower().startswith("proxy-authorization:"):
                    continue
                new_lines.append(line)
            new_lines.insert(1, f"Proxy-Authorization: Basic {UPSTREAM_AUTH}")
            up.sendall(("\r\n".join(new_lines) + "\r\n").encode("latin1") + rest)
            relay(up, client)
    except Exception:
        pass
    finally:
        try:
            client.close()
        except Exception:
            pass

def relay(a, b):
    def copy(src, dst):
        try:
            while True:
                chunk = src.recv(65536)
                if not chunk:
                    break
                dst.sendall(chunk)
        except Exception:
            pass
        try:
            dst.shutdown(socket.SHUT_WR)
        except Exception:
            pass
    t1 = threading.Thread(target=copy, args=(a, b), daemon=True)
    t2 = threading.Thread(target=copy, args=(b, a), daemon=True)
    t1.start()
    t2.start()
    t1.join()
    t2.join()

def main():
    srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind(("127.0.0.1", LISTEN_PORT))
    srv.listen(50)
    print(f"Forward proxy on 127.0.0.1:{LISTEN_PORT} -> {UPSTREAM_HOST}:{UPSTREAM_PORT}", flush=True)
    while True:
        client, _ = srv.accept()
        threading.Thread(target=handle_client, args=(client,), daemon=True).start()

if __name__ == "__main__":
    main()
