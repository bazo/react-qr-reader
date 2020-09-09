/* eslint-disable import/no-webpack-loader-syntax */
import React, { useEffect, useRef, useState } from "react";
//@ts-ignore
import Worker from "worker-loader!./worker";
import { getDeviceId } from "./getDeviceId";
var FacingMode;
(function (FacingMode) {
    FacingMode["ENVIRONMENT"] = "environment";
    FacingMode["USER"] = "user";
})(FacingMode || (FacingMode = {}));
const defaultProps = {
    delay: 500,
    resolution: 600,
    facingMode: FacingMode.USER,
    showViewFinder: true,
    constraints: null,
    onError: null,
    onLoad: null,
    className: "",
    onScan: undefined,
    mirrorVideo: false,
};
const Reader = (props) => {
    props = Object.assign(Object.assign({}, defaultProps), props);
    let timeout;
    const streamRef = useRef();
    const previewRef = useRef();
    const canvasRef = useRef();
    const [state, setState] = useState({
        mirrorVideo: props.mirrorVideo,
        streamLabel: "",
    });
    let worker = new Worker();
    useEffect(() => {
        worker.onmessage = handleWorkerMessage;
        initiate();
        return () => {
            if (worker) {
                worker.terminate();
                worker = undefined;
            }
            if (timeout) {
                clearTimeout(timeout);
                timeout = undefined;
            }
            if (previewRef.current) {
                const stream = previewRef.current.srcObject;
                if (stream) {
                    const tracks = stream.getTracks();
                    tracks.forEach(function (track) {
                        track.stop();
                    });
                }
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
                if (previewRef.current) {
                    previewRef.current.srcObject = null;
                }
            }
        };
    }, []);
    const initiate = () => {
        const { onError, facingMode } = props;
        // Check browser facingMode constraint support
        // Firefox ignores facingMode or deviceId constraints
        const isFirefox = /firefox/i.test(navigator.userAgent);
        let supported = {};
        if (navigator.mediaDevices && typeof navigator.mediaDevices.getSupportedConstraints === "function") {
            supported = navigator.mediaDevices.getSupportedConstraints();
        }
        const constraints = {};
        if (supported.facingMode) {
            constraints.facingMode = { ideal: facingMode };
        }
        if (supported.frameRate) {
            constraints.frameRate = { ideal: 60, min: 10 };
        }
        const vConstraintsPromise = supported.facingMode || isFirefox
            ? Promise.resolve(props.constraints || constraints)
            : getDeviceId(facingMode).then((deviceId) => Object.assign({}, { deviceId }, props.constraints));
        vConstraintsPromise
            .then((video) => navigator.mediaDevices.getUserMedia({ video }))
            .then(handleVideo)
            .catch(onError);
    };
    const handleVideo = (stream) => {
        streamRef.current = stream;
        const { facingMode } = props;
        const preview = previewRef.current;
        // Preview element hasn't been rendered so wait for it.
        if (!preview) {
            return setTimeout(handleVideo, 200, stream);
        }
        preview.srcObject = stream;
        const streamTrack = stream.getTracks()[0];
        preview.addEventListener("loadstart", handleLoadStart);
        setState({ mirrorVideo: facingMode === FacingMode.USER, streamLabel: streamTrack.label });
    };
    const handleLoadStart = () => {
        const { delay, onLoad } = props;
        const { mirrorVideo, streamLabel } = state;
        const preview = previewRef.current;
        if (preview) {
            preview.play();
        }
        if (typeof onLoad === "function") {
            onLoad({ mirrorVideo, streamLabel });
        }
        if (typeof delay === "number") {
            timeout = setTimeout(check, delay);
        }
        // Some browsers call loadstart continuously
        if (preview) {
            preview.removeEventListener("loadstart", handleLoadStart);
        }
    };
    const check = () => {
        const { resolution, delay } = props;
        const preview = previewRef.current;
        const canvas = canvasRef.current;
        // Get image/video dimensions
        let width = Math.floor(preview.videoWidth);
        let height = Math.floor(preview.videoHeight);
        // Canvas draw offsets
        let hozOffset = 0;
        let vertOffset = 0;
        // Scale image to correct resolution
        // Crop image to fit 1:1 aspect ratio
        const smallestSize = width < height ? width : height;
        const ratio = resolution / smallestSize;
        height = ratio * height;
        width = ratio * width;
        vertOffset = ((height - resolution) / 2) * -1;
        hozOffset = ((width - resolution) / 2) * -1;
        canvas.width = resolution;
        canvas.height = resolution;
        const previewIsPlaying = preview && preview.readyState === preview.HAVE_ENOUGH_DATA;
        if (previewIsPlaying) {
            const ctx = canvas.getContext("2d");
            ctx.drawImage(preview, hozOffset, vertOffset, width, height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            // Send data to web-worker
            worker.postMessage(imageData);
        }
        else {
            // Preview not ready -> check later
            timeout = setTimeout(check, delay);
        }
    };
    const handleWorkerMessage = (e) => {
        const { onScan, delay } = props;
        const decoded = e.data;
        if (onScan) {
            onScan(decoded || null);
        }
        if (typeof delay === "number" && worker) {
            timeout = setTimeout(check, delay);
        }
    };
    const { className, showViewFinder } = props;
    return (React.createElement("div", { className: `qr-code-reader ${className}` },
        React.createElement("div", { className: "container" },
            showViewFinder ? React.createElement("div", { className: "view-finder" }) : null,
            React.createElement("video", { className: `video-preview ${state.mirrorVideo ? "mirrored" : ""}`, ref: previewRef }),
            React.createElement("canvas", { ref: canvasRef }))));
};
export default Reader;
