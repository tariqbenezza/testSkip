var video = document.getElementById('video');
if(Hls.isSupported()) {
  var hls = new Hls();
  hls.loadSource('https://video-dev.github.io/streams/x36xhzz/x36xhzz.m3u8');
  hls.attachMedia(video);
  hls.on(Hls.Events.MANIFEST_PARSED,function() {
    video.pause();
});
}
// hls.js is not supported on platforms that do not have Media Source Extensions (MSE) enabled.
// When the browser has built-in HLS support (check using `canPlayType`), we can provide an HLS manifest (i.e. .m3u8 URL) directly to the video element throught the `src` property.
// This is using the built-in support of the plain video element, without using hls.js.
// Note: it would be more normal to wait on the 'canplay' event below however on Safari (where you are most likely to find built-in HLS support) the video.src URL must be on the user-driven
// white-list before a 'canplay' event will be emitted; the last video event that can be reliably listened-for when the URL is not on the white-list is 'loadedmetadata'.
else if (video.canPlayType('application/vnd.apple.mpegurl')) {
  video.src = 'https://video-dev.github.io/streams/x36xhzz/x36xhzz.m3u8';
  video.addEventListener('loadedmetadata',function() {
    video.play();
  });
}

var player = new tv.freewheel.DemoPlayer();

function playVideo(){
    player.requestAds();
    setTimeout(function(){player.play()},1000);
}

function pauseVideo(){
    if(player){
        player.pauseVideo();
    }
}

function resumeVideo(){
    if(player){
        player.resumeVideo();
    }
}

function skipAd(){
    if(player){
        player.skipAd();
    }
}

function makeAdRequest(){
    player.newRequestAds();
}

function anotheSlotToPlay(){
    setTimeout(function(){player.play()},1000);
}