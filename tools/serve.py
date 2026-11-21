# Static dev server for the live preview.
#  · binds 0.0.0.0, sends no-store headers on everything
#  · cache-proof module loading: index.html asks for  b/<BUILD>/js/main.js ; every relative
#    import then resolves inside that versioned folder, so a new build can never be mixed
#    with stale modules from a browser/proxy cache. /b/<anything>/ is mapped back to the root.
#  · <BUILD> is a hash of the source files' mtimes, recomputed on every page load, and is
#    shown in the corner of the start screen so you can tell exactly which build is running.
import http.server, socketserver, os, sys, hashlib, time
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
os.chdir(ROOT)

def build_id():
    h = hashlib.sha1(); newest = 0
    for d in ('js', 'css', 'index.html'):
        for base, _, files in (os.walk(d) if os.path.isdir(d) else [('', [], [d])]):
            for f in sorted(files):
                p = os.path.join(base, f); m = os.path.getmtime(p); newest = max(newest, m)
                h.update(p.encode()); h.update(str(m).encode())
    return h.hexdigest()[:7], time.strftime('%d %b %H:%M', time.localtime(newest))

class H(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript', '.mjs': 'text/javascript'}
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()
    def send_head(self):
        path = self.path.split('?', 1)[0].split('#', 1)[0]
        if path.startswith('/b/'):
            rest = path[3:].split('/', 1)
            self.path = '/' + (rest[1] if len(rest) > 1 else '')
            path = self.path
        if path in ('/', '/index.html'):
            bid, when = build_id()
            html = open('index.html', encoding='utf-8').read().replace('__BUILD__', bid).replace('__BUILT__', when).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(html)))
            self.end_headers()
            return __import__('io').BytesIO(html)
        return super().send_head()
    def log_message(self, *a): pass

socketserver.TCPServer.allow_reuse_address = True
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
with socketserver.ThreadingTCPServer(('0.0.0.0', port), H) as s:
    s.serve_forever()
