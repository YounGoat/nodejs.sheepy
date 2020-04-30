#!/usr/bin/env node

let MODULE_REQUIRE
	/* built-in */
	, fs = require('fs')
	, http = require('http')
	, path = require('path')
	, vm = require('vm')

	/* NPM */
	, noda = require('noda')
	, mime = require('mime')

	/* in-package */
	, httpCodes = noda.inRequire('config/codes')
	, progress = require('./progress')
	;

// ---------------------------
// 默认参数。

let OPTIONS = {
	port: '80',
	root: process.cwd()
};

// ---------------------------
// 读取参数。

let argv = process.argv.slice(2);

if (argv[0] == '-v') {
	console.log(noda.currentPackage().version);
	process.exit(0);
}

// 端口。
if (argv[0] && /^\d+$/.test(argv[0])) {
	OPTIONS.port = argv[0];
}

// ---------------------------

// 检查请求方法。
function method(request, response, next) {
	if (['GET', 'POST'].indexOf(request.method) == -1) {
		next(400);
	}
	else {
		request.sheepy.remoteAddress = request.socket.remoteAddress;
		next();
	}
}

// 检查文件是否可访问。
function access(request, response, next) {
	request.sheepy.path = path.join(OPTIONS.root, request.url.substr(1).replace(/(\?|#).+$/, ''));
	fs.stat(request.sheepy.path, function(err, stats) {
		if (err) {
			next(404);
		}
		else {
			request.sheepy.stats = stats;
			next();
		}
	});
}

// 查找默认文件。
function default_file(request, response, next) {
	if (!request.sheepy.stats.isDirectory()) return next();

	let defaults = [ 'index.html', 'index.htm' ];
	let index = 0;
	(function nextTry(index) {
		if (index == defaults.length) return next();

		let name = defaults[index++];
		let pathname = path.join(request.sheepy.path, name);
		fs.stat(pathname, function(err, stats) {
			if (!err && stats.isFile()) {
				if (!request.url.endsWith('/')) {
					response.setHeader('Location', request.url + '/');
					next(301);
				}
				else {
					request.sheepy.stats = stats;
					request.sheepy.path = pathname;
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
function dir(request, response, next) {
	if (!request.sheepy.stats.isDirectory()) return next();

	if (!request.url.endsWith('/')) {
		response.setHeader('Location', request.url + '/');
		return next(301);
	}

	fs.readdir(request.sheepy.path, function(err, files) {
		if (err) {
			next(403);
		}
		else {
			let items = [];
			for (let i = 0; i < files.length; i++) {
				items[i] = '<li><a href="' + request.url + files[i] + '">' + files[i] + '</a></li>';
			}
			response.write('<html><head><title>' + request.url + '</title></head><body>Directory <em>' + request.url + '</em><ul>' + items.join('') + '</ul></body></html>');
			response.end();
			next(200);
		}
	});
}

// 执行 JSS 文件。
function jss(request, response, next) {
	let extname = path.extname(request.url);
	if (extname == '.jss') {
		let echo = function(content) { 
			response.write(content); 
		};

		let end = function(status = 200) {
			response.end();
			next(status);
		};

		fs.readFile(request.sheepy.path, function(err, content) {
			let context = vm.createContext({
				__dirname : path.dirname(request.sheepy.path),
				Buffer,
				console,
				require,

				request,
				response,
				next,

				echo,
				end,
			});
			vm.runInContext(content, context);
		});
	}
	else {
		next();
	}
}

// 静态文件响应。
function static_file(request, response, next) {
	if (request.method != 'GET') {
		return next(400);
	}

	let contentType = mime.getType(request.sheepy.path);
	response.setHeader('Content-Type', contentType);

	let rs = fs.createReadStream(request.sheepy.path);
	rs.pipe(response);
	rs.on('close', next);
}

// 日志。
function logger(request, response, next) {
	let date, httpVersion, ip, method, pathname, statusCode;

	date = (new Date).toDateString();

	httpVersion = request.httpVersion;

	ip = request.sheepy.remoteAddress;
	// ip = ip.split(':').slice(-1)[0];

	method = request.method;

	pathname = request.url;

	statusCode = response.statusCode;

	console.log(`${ip} [${date}] "${method} ${pathname} HTTP/${httpVersion}" ${statusCode}`);

	next();
}

function co(request, response, processors) {
	let createPromise = function(fn) {
		return new Promise(function(resolve, reject) {
			fn(request, response, function(status) {
				// 如果响应状态有值，则代表请求已被处理，后续步骤无须执行。
				if (status) {
					response.statusCode = status;
					if (httpCodes.hasOwnProperty(status)) {
						response.statusMessage = httpCodes[status];
					}

					let errorPage = noda.inResolve('error_pages', status + '.html');
					fs.stat(errorPage, function(err, stats) {
						if (err) {
							response.end();
							logger(request, response, reject);
						}
						else {
							request.sheepy.path = errorPage;
							request.sheepy.stats = stats;
							static_file(request, response, function() {
								logger(request, response, reject);
							});
						}
					});
				}

				// 否则进入后续步骤。
				else {
					resolve();
				}
			});
		});
	};

	let p;
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
	p.catch(ex => {
		// DO NOTHING.
	});
}

let server = http.createServer((request, response) => {
	request.sheepy = {};
	co(request, response, [
		method,
		access,
		default_file,
		dir,
		jss,
		static_file,
		logger
	]);
});

server.listen(OPTIONS.port, function(err) {
	if (err) {
		console.log(err);
		return;
	}
	console.log(`Serving HTTP on 0.0.0.0 port ${OPTIONS.port} ...`);
});
