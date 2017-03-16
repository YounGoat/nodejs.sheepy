#!/usr/bin/env node

var MODULE_REQUIRE
	/* built-in */
	, fs = require('fs')
	, http = require('http')
	, path = require('path')
	/* NPM */

	/* in-package */
	, httpCodes = require('./conf/codes')
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

// 检查请求方法。
function method(req, res, next) {
	if (req.method != 'GET') {
		res.statusCode = 400;
		res.statusMessage = 'Bad request';
		next(400);
	}
	else {
		next();
	}
}

// 检查文件是否可访问。
function access(req, res, next) {
	req.sheepy.path = path.join(OPTIONS.root, req.url.substr(1));
	fs.stat(req.sheepy.path, function(err, stats) {
		if (err) {
			next(404);
		}
		else {
			req.sheepy.stats = stats;
			next();
		}
	});
}

// 查找默认文件。
function default_file(req, res, next) {
	if (!req.sheepy.stats.isDirectory()) return next();

	var defaults = [ 'index.html', 'index.htm' ];
	var index = 0;
	(function nextTry(index) {
		if (index == defaults.length) return next();

		var name = defaults[index++];
		var pathname = path.join(req.sheepy.path, name);
		fs.stat(pathname, function(err, stats) {
			if (!err && stats.isFile()) {
				if (!req.url.endsWith('/')) {
					res.setHeader('Location', req.url + '/');
					next(301);
				}
				else {
					req.sheepy.stats = stats;
					req.sheepy.path = pathname;
					next();
				}
			}
			else {
				nextTry(index + 1);
			}
		});
	})(0);
}

// 读取文件列表。
function dir(req, res, next) {
	if (!req.sheepy.stats.isDirectory()) return next();

	if (!req.url.endsWith('/')) {
		res.setHeader('Location', req.url + '/');
		return next(301);
	}

	fs.readdir(req.sheepy.path, function(err, files) {
		if (err) {
			next(403);
		}
		else {
			var items = [];
			for (var i = 0; i < files.length; i++) {
				items[i] = '<li><a href="' + req.url + files[i] + '">' + files[i] + '</a></li>';
			}
			res.write('<html><head><title>' + req.url + '</title></head><body>Directory <em>' + req.url + '</em><ul>' + items.join('') + '</ul></body></html>');
			res.end();
			next(200);
		}
	});
}

function static_file(req, res, next) {
	var rs = fs.createReadStream(req.sheepy.path);
	rs.pipe(res);
	rs.on('close', next);
}

function logger(req, res, next) {
	var date, httpVersion, ip, method, pathname, statusCode;

	date = (new Date).toDateString();

	httpVersion = req.httpVersion;

	ip = req.socket.remoteAddress;
	ip = ip.split(':').slice(-1)[0];

	method = req.method;

	pathname = req.url;

	statusCode = res.statusCode;

	console.log(`${ip} [${date}] "${method} ${pathname} HTTP/${httpVersion}" ${statusCode}`);

	next();
}

function co(req, res, processors) {
	var createPromise = function(fn) {
		return new Promise(function(resolve, reject) {
			fn(req, res, function(status) {
				if (status) {
					res.statusCode = status;
					if (httpCodes.hasOwnProperty(status)) {
						res.statusMessage = httpCodes[status];
					}

					var errorPage = path.join(__dirname, 'error_pages', status + '.html');
					fs.stat(errorPage, function(err, stats) {
						if (err) {
							res.end();
							logger(req, res, reject);
						}
						else {
							req.sheepy.path = errorPage;
							req.sheepy.stats = stats;
							static_file(req, res, function() {
								logger(req, res, reject);
							});
						}
					});
				}
				else {
					resolve();
				}
			});
		});
	};

	var p;
	processors.forEach(function(processor, index) {
		if (index == 0) {
			p = createPromise(processor);
		}
		else {
			p = p.then(function() {
				return createPromise(processor);
			});
		}
	});
}

var server = http.createServer((req, res) => {
	req.sheepy = {};
	co(req, res, [
		method,
		access,
		default_file,
		dir,
		static_file,
		logger
	]);
});

server.listen(OPTIONS.port, function(err) {
	console.log(`Serving HTTP on 0.0.0.0 port ${OPTIONS.port} ...`);
});

process.on('uncaughtException', function(ex) {
	console.log('ERROR: ' + ex.message);
});
