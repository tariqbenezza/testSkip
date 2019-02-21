/*
 *
 * implements an ad renderer based on FreeWheel ad technology.
 * it depends on hls.js (https://github.com/dailymotion/hls.js)
 * To use this renderer, host the js and pass the url to RendererRunner.
 * and include hls.js in the same page context (e.g. via <script> or similar)
 *
 * usage:
 *      adContext.addRenderer( url to this file  );
 *
 */
hlsRenderer = function() {
	
		// call start to initalize these
		var hls; /* hls object */
		var video; /* ad video element */
		var rendererController; /* */
		var duration; /* fallback for video.duration */
		var currentQuartile; /* current Quartile ( 1, 2, 3 )*/
		var durationQuartile; /* just to not calc  duration:4 over and over */
		var ModuleName = arguments.callee.name; /* name of Renderer Module */
		var isActiv = false; /* indicates session status */
		var errorReport = {
			errorModule: ModuleName,
			errorCode: tv.freewheel.SDK.ERROR_UNKNOWN,
			errorInfo: "unknown error",
		}; /* */
	
		/* log debug messages to console */
		var logDebug = function() {
			Array.prototype.unshift.apply(arguments, [ModuleName]);
			console.debug.apply(console, arguments);
		};
	
		/* log warn messages to console */
		var logWarn = function(msg) {
			Array.prototype.unshift.apply(arguments, [ModuleName]);
			console.warn.apply(console, arguments);
		};
	
		/* log error messages to console */
		var logError = function(msg) {
			Array.prototype.unshift.apply(arguments, [ModuleName]);
			console.error.apply(console, arguments);
		};
	
		/* HLS Error Event Handler */
		var hls_onError = function(event, data) {
	
			// on fatal errors we terminate rendering
			if (data.fatal) {
				// log fatal errors
				logError(event, data);
	
				// fill error report 
				switch (data.type) {
					case Hls.ErrorTypes.MEDIA_ERROR:
						errorReport.errorInfo = "a media error happend";
						break;
					case Hls.ErrorTypes.NETWORK_ERROR:
						errorReport.errorCode = tv.freewheel.SDK.ERROR_IO;
						errorReport.errorInfo = "a network error happend";
						break;
					default:
						errorReport.errorCode = tv.freewheel.SDK.ERROR_UNKNOWN;
						errorReport.errorInfo = "a unrecoverable error happend";
						break;
				}
	
				//
				cleanup();
				// update controller state and send report 
				rendererController.handleStateTransition(tv.freewheel.SDK.RENDERER_STATE_FAILED, errorReport);
			} else {
				// otherwise log the error as a warning 
				logWarn(event, data);
			}
		};
	
		/* HLS ManifestParsed Event Handler */
		var hls_onManifestParsed = function() {
			video.addEventListener('loadeddata', video_onLoadedData);
			video.addEventListener('ended', video_onEnded);
			video.addEventListener('click', video_onClick);
			video.addEventListener('timeupdate', video_onProgress);
			video.addEventListener('canplay', video.play);
		};
	
		/* video loadedData Event Handler */
		var video_onLoadedData = function() {
			// if the renderer starts successfully, notify the controller to send impression
			rendererController.handleStateTransition(tv.freewheel.SDK.RENDERER_STATE_STARTED);
		};
	
		/* video ended Event Handler */
		var video_onEnded = function() {
			// report last Quartile
			rendererController.processEvent({
				name: tv.freewheel.SDK.EVENT_AD_COMPLETE
			});
			// notify the controller that renderer work has been completed
			stop();
		};
	
		/* video click Event Handler */
		var video_onClick = function() {
			rendererController.processEvent({
				name: tv.freewheel.SDK.EVENT_AD_CLICK
			});
		};
	
		/* video progress Event Handler */
		var video_onProgress = function() {
	
			// Monitor quartiles
			if (video.currentTime >= (currentQuartile * durationQuartile)) {
				switch (currentQuartile) {
					case 1:
						rendererController.processEvent({
							name: tv.freewheel.SDK.EVENT_AD_FIRST_QUARTILE
						});
						break;
					case 2:
						rendererController.processEvent({
							name: tv.freewheel.SDK.EVENT_AD_MIDPOINT
						});
						break;
					case 3:
						rendererController.processEvent({
							name: tv.freewheel.SDK.EVENT_AD_THIRD_QUARTILE
						});
						break;
				}
				currentQuartile++;
			}
		};
	
		/**
		 * Notify the renderer to start ad playback.
		 * @param {RendererController} the RendererController instance that initiates the renderer
		 */
		var start = function(_rendererController) {
			logDebug("->" + arguments.callee.name + "()");
	
			if (isActiv) {
				logWarn("previous session still activ");
				return;
			}
			isActiv = true;
	
			try {
				// copy rendererController to outer scope
				rendererController = _rendererController;
	
				// Enables Ad quartiles
				rendererController.setCapability(tv.freewheel.SDK.EVENT_AD_QUARTILE, tv.freewheel.SDK.CAPABILITY_STATUS_ON);
	
				// retrieve ad info from controller
				var ad = rendererController.getAdInstance();
				var slot = ad.getSlot();
				var tpc = slot.getTimePositionClass();
	
				// the DOM element that the ad should be placed within
				var slotBase = slot.getBase();
	
				var rendition = ad.getActiveCreativeRendition();
				// copy fallback duration to outer scope
				currentQuartile = 1;
				duration = rendition.getDuration();
				durationQuartile = (duration / 100.0) * 25.0;
	
				var asset = rendition.getPrimaryCreativeRenditionAsset();
	
				// Check url or content value before use them
				var url = asset.getUrl();
				var content = asset.getContent();
	
				//
				// renderer stuff starts here,
				//
	
				// get Video Elements inside slotBase
				var videos = slotBase.getElementsByTagName('video');
	
				// check if at least one video element is present
				if (videos.length > 0) {
					// select first video element
					video = videos[0];
	
					// check if Hls is support
					if (Hls) {
						if (Hls.isSupported()) {
	
							/**
							 * init hls object
							 */
							hls = new Hls();
							hls.loadSource(url);
							hls.attachMedia(video);
	
							/**
							 * register HLS Event handler
							 */
							hls.on(Hls.Events.ERROR, hls_onError);
							hls.on(Hls.Events.MANIFEST_PARSED, hls_onManifestParsed);
	
							/* everything should be fine */
							return;
						} else {
							errorReport.errorInfo = "Hls not supported";
						}
					} else {
						errorReport.errorInfo = "Hls not available";
					}
				} else {
					errorReport.errorInfo = "missing <video/> element";
				}
	
	
				// notify controller about failure
				rendererController.handleStateTransition(tv.freewheel.SDK.RENDERER_STATE_FAILED, errorReport);
				logError("rendererState -> FAILED", errorReport.errorInfo);
	
			} catch (e) { // catch ALL in cause of unexpected error
				logError("unexpected error ", e);
			}
			// do cleanup
			cleanup();
	
		};
	
		/**
		 *  cleanup 
		 *      video listeners and 
		 *      HLS element+listeners
		 *      resets vars
		 */
		var cleanup = function() {
	
			// vars
			isActiv = false;
			currentQuartile = Infinity;
			duration = Infinity;
			durationQuartile = Infinity;
	
			if (video) {
				video.removeEventListener('canplay', video.play);
				video.removeEventListener('loadeddata', video_onLoadedData);
				video.removeEventListener('ended', video_onEnded);
				video.removeEventListener('timeupdate', video_onProgress);
				video.removeEventListener('click', video_onClick);
			} else {
				logWarn("missing video todo cleanup");
			}
	
			if (hls) {
				hls.off(Hls.Events.ERROR, hls_onError);
				hls.off(Hls.Events.MANIFEST_PARSED, hls_onManifestParsed);
				hls.destroy();
			} else {
				logWarn("missing hls todo cleanup");
			}
	
		};
	
		/**
		 * Notify the renderer to stop ad playback.
		 * Resources created during the renderer lifetime should be disposed in this method.
		 */
		var stop = function() {
			logDebug("->" + arguments.callee.name + "()");
			if (!isActiv) {
				logWarn("no session activ");
				return;
			}
			cleanup();
			rendererController.handleStateTransition(tv.freewheel.SDK.RENDERER_STATE_COMPLETED);
		};
	
	
		/**
		 * Get the module info of renderer.
		 * @return {Object}  {moduleType, moduleVersion, requiredAPIVersion}
		 *                    Indicate this is a renderer or translator
		 */
		var info = function() {
			//logDebug("->" + arguments.callee.name + "()");
			return {
				'moduleType': tv.freewheel.SDK.MODULE_TYPE_RENDERER
			};
		};
	
	
		/**
		 * Get the ad playheadTime
		 * @return {integer} Playhead time in seconds, -1 if not available.
		 */
		var getPlayheadTime = function() {
			logDebug("->" + arguments.callee.name + "()");
			if (video && video.currentTime) {
				return Math.floor(video.currentTime);
			}
			return -1;
		};
	
	
		/**
		 * Get the ad duration
		 * @return {integer} duration in seconds. -1 if not available
		 */
		var getDuration = function() {
			logDebug("->" + arguments.callee.name + "()");
			if (video && video.duration) {
				duration = Math.floor(video.duration);
				durationQuartile = (duration / 100.0) * 25.0;
			}
			return duration;
		};
	
		/**
		 * Resize the ad
		 */
		var resize = function() {
			logDebug("->" + arguments.callee.name + "()");
			// TODO: check if implementing this is required
		};
	
	
		// Return Renderer interface
		// (https://hub.freewheel.tv/api_docs/html5/files/RDK-js.html#Renderer)
		return {
			start: start,
			stop: stop,
			info: info,
			getPlayheadTime: getPlayheadTime,
			getDuration: getDuration,
			resize: resize,
		};
	
	};