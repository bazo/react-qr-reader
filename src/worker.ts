import jsQR from "jsqr";

// eslint-disable-next-line no-restricted-globals
self.addEventListener("message", function (e) {
	const decoded = jsQR(e.data.data, e.data.width, e.data.height);
	if (decoded) {
		//@ts-ignore
		postMessage(decoded.data);
	} else {
		//@ts-ignore
		postMessage(null);
	}
});
