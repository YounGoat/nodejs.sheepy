#!/usr/bin/env node

var MODULE_REQUIRE
	/* built-in */
	, fs = require('fs')
	, http = require('http')
	, path = require('path')
	/* NPM */

	/* in-package */
	;

// ---------------------------
// 默认参数。

var OPTIONS = {
	port: '80',
	root: process.cwd()
};

// ---------------------------
// 读取参数。

var argv = process.argv.slice(2);

// 端口。
if (argv[0] && /^\d+$/.test(argv[0])) {
	OPTIONS.port = argv[0];
}

// ---------------------------

function logger(req, res) {
	var date, httpVersion, ip, method, pathname, statusCode;

	date = (new Date).toDateString();

	httpVersion = req.httpVersion;

	ip = req.socket.remoteAddress;
	ip = ip.split(':').slice(-1)[0];

	method = req.method;

	pathname = req.url;

	statusCode = res.statusCode;

	console.log(`${ip} [${date}] "${method} ${pathname} HTTP/${httpVersion}" ${statusCode}`);
}

var server = http.createServer((req, res) => {

	if (req.method != 'GET') {
		res.statusCode = 400;
		res.statusMessage = 'Bad request';
		logger(req, res);
		return;
	}

	var pathname = path.join(OPTIONS.root, req.url.substr(1));
	fs.access(pathname, function(err) {
		if (err) {
			res.statusCode = 404;
			res.statusMessage = 'File not found';
			res.write('<h1>404 Not Found</h1>');
			res.end();
		}
		else {
			fs.createReadStream(pathname).pipe(res);
		}

		logger(req, res);
	});


});

server.listen(OPTIONS.port, function(err) {
	console.log(`Serving HTTP on 0.0.0.0 port ${OPTIONS.port} ...`);
});

process.on('uncaughtException', function(ex) {
	console.log('ERROR: ' + ex.message);
});
