#   Change Log

Notable changes to this project will be documented in this file. This project adheres to [Semantic Versioning 2.0.0](http://semver.org/).

##	[0.1.1] - 2017-07

###	Bug Fixed

*	__URL appended with query string recognized.__

##	[0.1.0] - 2017-03

###	MILESTONE, JSS

JSS 0.1 is created and supported since this version. However, the specification of JSS is still under development and this version of sheepy is just an experiment. Stable version will be released in no more than 1 month.

###	Bug Fixed

*	__Sometimes failed to get remote address (IP) while logging.__  
	>
		The problem is that after the socket is disconnected, certain properties (such as remoteAddress) are no longer available!  
		@cite http://stackoverflow.com/questions/12444598/why-is-socket-remoteaddress-undefined-on-end-event

	This problem has been resolved by fetching the ``req.socket.remoteAddress`` firstly.

##	[0.0.2] - 2017-03

*Sheepy* is still simple enought, without depending on any other packages except the built-in Node.js modules. However, a new pipeline made up of different stage processors has been established, which including:

*	method
*	access
*	default_file
*	dir
*	static_file
*	logger

###	Functions Added

*	Directory List
*	Default File
*	Error Pages

---
This CHANGELOG.md follows [*Keep a CHANGELOG*](http://keepachangelog.com/).
