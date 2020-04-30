function onException(ex) {
	let msg = ex ? ex.message || ex : 'undefined';
	console.log('ERROR: ' + msg);
}

process.on('uncaughtException', onException);
