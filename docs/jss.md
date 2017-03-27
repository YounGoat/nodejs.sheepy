#	JSS, Javascript For Server-Side

By default, files with extname *.jss* are regarded as JSS by *sheepy*. Written in common nodeJs, a JSS is a common module except with some special global variables:

*	__request__  
	A HTTP request instance stuck with member object *sheepy*.

*	__response__  
	A HTTP response instance.

*	__next__  
	Handler of function to finish the current page with an argument as status code or none.
