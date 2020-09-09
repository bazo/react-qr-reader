import React, { useState } from "react";
import QrReader from "@bazo/react-qr-reader";

const Example = () => {
	const [state, setState] = useState({
		delay: 500,
		result: "No result",
	});

	const handleScan = (result) => {
		if (result) {
			this.setState({ result });
		}
	};
	const handleError = (err) => {
		console.error(err);
	};

	const previewStyle = {
		height: 240,
		width: 320,
	};

	return (
		<div>
			<QrReader delay={state.delay} style={previewStyle} onError={handleError} onScan={handleScan} />
			<p>{state.result}</p>
		</div>
	);
};
