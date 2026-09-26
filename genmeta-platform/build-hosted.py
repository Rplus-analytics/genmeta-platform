# Turns dist-hosted/index.html into a page body for hosting (no html/head/body wrapper).
import re, sys
s = open('dist-hosted/index.html').read()
h0 = s.index('<head>') + len('<head>')
h1 = s.rindex('</head>')
b0 = s.rindex('<body>') + len('<body>')
b1 = s.rindex('</body>')
head, body = s[h0:h1], s[b0:b1]
first = head[:head.index('<script')]
first = re.sub(r'<meta[^>]*>|<title>.*?</title>|<link rel="icon"[^>]*>', '', first)
out = '<title>GenMeta Platform</title>\n' + first.strip() + '\n' + head[head.index('<script'):].strip() + '\n' + body.strip() + '\n'
open(sys.argv[1], 'w').write(out)
print(len(out))
