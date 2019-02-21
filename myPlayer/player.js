var globalVideoCurrentTime;
var currentSlot;
var doc;

var tv = tv || {};
tv.freewheel = tv.freewheel || {};
tv.freewheel.DemoPlayer = function() {
	// Only one AdManager instance is needed for each player.
	this.adManager = new tv.freewheel.SDK.AdManager();
	// Please contact your FreeWheel solution engineer for the values for your network.
	this.adManager.setNetwork(383480);
	this.adManager.setServer("http://5d9f8.v.fwmrm.net/ad/g/1");
	/* Ad ad context object should be created for each ad request and all ad playback related.
	When a new video starts, the current ad context object should be destroyed and a new one should
	be created to handle the next lifecycle.
	*/
	this.currentAdContext = null;
	/* Reference to the <video> element */
	this.videoEl = document.getElementById('video');
	/* Temporarily store the video element's originalSource so when preroll / postroll ends, the src can
	be resumed.
	*/
    this.originalSource = this.videoEl.currentSrc;

    this.prerollSlots = [];
    this.midrollSlots = []; 
	this.postrollSlots = [];
	this.overlaySlots = [];

	this.adResponseLoaded = false;

	this.onRequestComplete = this._onRequestComplete.bind(this);
	this.onSlotEnded = this._onSlotEnded.bind(this);
	this.onContentVideoEnded = this._onContentVideoEnded.bind(this);
	this.onContentVideoTimeUpdated = this._onContentVideoTimeUpdated.bind(this);
	//tv.freewheel.SDK.setLogLevel(tv.freewheel.SDK.LOG_LEVEL_QUIET);
};

document.addEventListener("visibilitychange", function() {
	console.log( document.visibilityState );
});

tv.freewheel.DemoPlayer.prototype = {
	requestAds: function() {
		this.currentAdContext = this.adManager.newContext();
		// The profile value will be provided by your FreeWheel solution engineer
        //this.currentAdContext.setProfile("383480:TB_Profile_AdManager");
		this.currentAdContext.setProfile("TB_Profile_AdManager");
        //this.currentAdContext.addRenderer("http://127.0.0.1:1818/hlsRenderer.js", null, "application/x-mpegurl");

		// Set the target.
		this.currentAdContext.setVideoAsset("7654321",60);
		this.currentAdContext.setSiteSection("TariqSiteSectionLiveTest");

		//this.currentAdContext.addTemporalSlot("Pre_Roll Standard 0","Pre_Roll Standard",0,null,null,40,40,null);
		this.currentAdContext.addTemporalSlot("Mid_Roll Standard",tv.freewheel.SDK.ADUNIT_MIDROLL,10, null,null,40,40,null);
		//this.currentAdContext.addTemporalSlot("Mid_Roll Standard 60","Mid_Roll Standard",60);
		//this.currentAdContext.addTemporalSlot("Mid_Roll Standard 90","Mid_Roll Standard",90);
		//this.currentAdContext.addTemporalSlot("Mid_Roll Standard 120","Mid_Roll Standard",120);

		/* Listen to request_complete and slot_ended events.
		*/
		this.currentAdContext.addEventListener(tv.freewheel.SDK.EVENT_REQUEST_COMPLETE, this.onRequestComplete.bind(this));
		this.currentAdContext.addEventListener(tv.freewheel.SDK.EVENT_SLOT_ENDED, this.onSlotEnded.bind(this));
		this.currentAdContext.addEventListener(tv.freewheel.SDK.EVENT_AD, this._onAdEvent.bind(this));

		// The video display base is the area(canvas) where overlay and rich media ads are rendered.
		this.currentAdContext.registerVideoDisplayBase("videoBase");
		
		this.currentAdContext.addKeyValue("connectionType", "wifi");

		this.currentAdContext.addKeyValue("_fw_player_height", "600");
		this.currentAdContext.addKeyValue("_fw_player_width", "800");
        
        //Live mode
        this.currentAdContext.setRequestMode(tv.freewheel.SDK.REQUEST_MODE_LIVE);
        //this.currentAdContext.setRequestDuration(91);

        //Capabilities
		this.currentAdContext.setCapability("sltp",tv.freewheel.SDK.CAPABILITY_STATUS_OFF);
		
		//this.currentAdContext.setCapability("sync",tv.freewheel.SDK.CAPABILITY_STATUS_ON);
		//this.currentAdContext.setCapability("dtrd",tv.freewheel.SDK.CAPABILITY_STATUS_ON);

		this.currentAdContext.submitRequest();
	},

	_onAdEvent: function(evt) {
		var flag = document.visibilityState;
		if ((flag == "hidden") && evt.subType == tv.freewheel.SDK.EVENT_AD_PAUSE) {
			console.log(evt.slot)
			evt.slot.resume();
			var isWasResuming=true;
			//evt.slot.play();
		}
		else{
			console.log("******************************");
			console.log("******************************");
			console.log(flag);
			console.log("******************************");
			console.log("******************************");
		}
	},

	_onRequestComplete: function(evt) {
		if (evt.success) {
			this.adResponseLoaded = true;
			// Temporal slots include preroll, midroll, postroll and overlay slots.
			var temporalSlots = this.currentAdContext.getTemporalSlots();
			for (var i = 0; i < temporalSlots.length; i++) {
				var slot = temporalSlots[i];
				switch (slot.getTimePositionClass())
				{
                    case tv.freewheel.SDK.TIME_POSITION_CLASS_PREROLL:
						this.prerollSlots.push(slot);
                        break;
                    case tv.freewheel.SDK.TIME_POSITION_CLASS_MIDROLL:
                        this.midrollSlots.push(slot);
                        break;
					case tv.freewheel.SDK.TIME_POSITION_CLASS_OVERLAY:
						this.overlaySlots.push(slot);
						break;
					case tv.freewheel.SDK.TIME_POSITION_CLASS_POSTROLL:
						this.postrollSlots.push(slot);
						break;
				}
			}
			if (this.videoEl.currentSrc)
				this.originalSource = this.videoEl.currentSrc;
		}
	},

	_onSlotEnded: function(evt) {
		var slotTimePositionClass = evt.slot.getTimePositionClass();
		switch (slotTimePositionClass) {
			case tv.freewheel.SDK.TIME_POSITION_CLASS_PREROLL:
				this.playNextPreroll();
                break;
            case tv.freewheel.SDK.TIME_POSITION_CLASS_MIDROLL:
                this.playNextMidRoll();
                break;
			case tv.freewheel.SDK.TIME_POSITION_CLASS_POSTROLL:
				this.playNextPostroll();
				break;
		}
	},

	playNextPreroll: function() {
		if (this.prerollSlots.length) {
            var slot = this.prerollSlots.shift();
			currentSlot=slot;
			slot.play();
		}
		else {
			setTimeout(this.playContent.bind(this), 100);
		}
    },
    
    playNextMidRoll: function(){
        if(this.midrollSlots.length){
            var slot=this.midrollSlots.shift();
            currentSlot=slot;
			var slotTimePosition=slot.getTimePosition();
			globalVideoCurrentTime=video.currentTime;
            slot.play();
        }
        else{
            //setTimeout(this.playContent.bind(this), 100);
            //video.currentTime=globalVideoCurrentTime;
            //video.play();
            setTimeout(this.playContent.bind(this), 100);
        }
    },

	playNextPostroll: function() {
		if (this.postrollSlots.length > 0) {
            var slot = this.postrollSlots.shift();
			slot.play();
		}
		else {
			/* No more postroll slots, stop here. Whole life cycle of this video+ad experience ends here.
			So we do clean up here.
			*/
			if (this.videoEl.currentSrc != this.originalSource) {
				this.videoEl.src = this.originalSource;
			}
			if (this.currentAdContext) {
				this.currentAdContext.removeEventListener(tv.freewheel.SDK.EVENT_REQUEST_COMPLETE, this.onRequestComplete);
				this.currentAdContext.removeEventListener(tv.freewheel.SDK.EVENT_SLOT_ENDED, this.onSlotEnded);
			}
			this.currentAdContext = null;
			this.adManager = null;
		}
	},

	playContent: function() {
        /*
		if (this.videoEl.src != this.originalSource) {
			this.videoEl.src = this.originalSource;
        }
        */
		if (this.adResponseLoaded) {
			video.addEventListener('ended', this.onContentVideoEnded);
			video.addEventListener('timeupdate', this.onContentVideoTimeUpdated);
			if (this.currentAdContext){
				this.currentAdContext.setVideoState(tv.freewheel.SDK.VIDEO_STATE_PLAYING);
			}
		}
        //this.videoEl.play();
        if(Hls.isSupported()) {
            var hls = new Hls();
            hls.loadSource('https://video-dev.github.io/streams/x36xhzz/x36xhzz.m3u8');
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED,function() {
                if(globalVideoCurrentTime){
                    video.currentTime=globalVideoCurrentTime;
                    video.play();
                }
                else{
                    video.play();
                }
          });
        }
	},

	_onContentVideoTimeUpdated: function(evt) {
		if (this.midrollSlots.length == 0){
			video.removeEventListener('timeupdate', this.onContentVideoTimeUpdated);
			return;
		}

        for(var i=0; i < this.midrollSlots.length; i++){
            var slot=this.midrollSlots[i];
            var slotTimePosition=slot.getTimePosition();
			var videoCurrentTime=video.currentTime;
            if(Math.abs(slotTimePosition - videoCurrentTime < 0.5)){
				globalVideoCurrentTime=videoCurrentTime;
                this.playNextMidRoll();
                return;
            }
        }
	},

	_onContentVideoEnded: function(evt) {
		video.removeEventListener("ended", this.onContentVideoEnded);
		if (this.currentAdContext){
			this.currentAdContext.setVideoState(tv.freewheel.SDK.VIDEO_STATE_STOPPED);
		}
		this.playNextPostroll();
	},

	play: function() {
		if (this.prerollSlots.length) {
			this.playNextPreroll();
		}
		/*
        else if(this.midrollSlots.length){
            this.playNextMidRoll();
        }*/
		else {
			this.playContent();
		}
    },
    
    newRequestAds:function(){
        this.currentAdContext = this.adManager.newContextWithContext(this.currentAdContext);
		// The profile value will be provided by your FreeWheel solution engineer
        this.currentAdContext.setProfile("TB_Profile_AdManager");
        //this.currentAdContext.addRenderer("http://127.0.0.1:1818/hlsRenderer.js", null, "application/x-mpegurl");

		// Set the target.
		this.currentAdContext.setVideoAsset("7654321");
		this.currentAdContext.setSiteSection("TariqSiteSectionLiveTest");

		this.currentAdContext.addTemporalSlot("Mid_Roll Standard", tv.freewheel.SDK.ADUNIT_MIDROLL,60,null, null, 60, 60, null);

		/* Listen to request_complete and slot_ended events.
		*/
		this.currentAdContext.addEventListener(tv.freewheel.SDK.EVENT_REQUEST_COMPLETE, this.onRequestComplete.bind(this));
		this.currentAdContext.addEventListener(tv.freewheel.SDK.EVENT_SLOT_ENDED, this.onSlotEnded.bind(this));

		// The video display base is the area(canvas) where overlay and rich media ads are rendered.
        this.currentAdContext.registerVideoDisplayBase("videoBase");
        
        //Live mode
        this.currentAdContext.setRequestMode(tv.freewheel.SDK.REQUEST_MODE_LIVE);
        this.currentAdContext.setRequestDuration(60);

        //Capabilities
        this.currentAdContext.setCapability("sltp",tv.freewheel.SDK.CAPABILITY_STATUS_OFF);

		this.currentAdContext.submitRequest();
    },

    pauseVideo:function(){
        currentSlot.pause();
    },

    resumeVideo:function(){
        currentSlot.resume();
    },

    skipAd:function(){
        currentSlot.skipCurrentAd();
    }
};