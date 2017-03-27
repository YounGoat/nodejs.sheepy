#	Develop Plugins For Sheepy

In the future (not now), *sheepy* will accept plugins to satisfy different requirements. A sheepy plugin will looks like this:  

```javascript
module.exports = function(req, res, next) {
	// [req] is the HTTP request instance, tuck with an member object named "sheepy".
	req.sheepy.stats;
	req.sheepy.path;

	// [res] is the HTTP response instance.
	res;

	// [next] is handler of the callback function,  
	// which will be called with argument "statusCode" or none.
};
```
