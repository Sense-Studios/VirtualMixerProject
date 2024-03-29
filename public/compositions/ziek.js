// create a renderer
var renderer = new GlRenderer();

var source1 = new VideoSource(renderer, {})
var source2 = new VideoSource(renderer, {})
var source3 = new VideoSource(renderer, { src: "/streamable/fkfqth" } );

var mixer1 = new Mixer( renderer, { source1: source1, source2: source2 });

var userAgent = window.navigator.userAgent;
if ( userAgent.match(/iPad/i) || userAgent.match(/iPhone/i) )  {
  var audioanalysis1 = new BPM( renderer ) // tapped beat control
  var audio = new Audio();
  //audio.src = '/radio/subfm'
  audio.play()
}else{
  var audioanalysis1 = new AudioAnalysis( renderer, { audio: '/radio/subfm' } )
}

var filemanager = new FileManager( source1 )
filemanager.load_set("/sets/ziek_streamable.json")

var filemanager2 = new FileManager( source2 )
filemanager2.load_set("/sets/ziek_streamable.json")

// add noise
var mixer2 = new Mixer( renderer, { source1: source3, source2: mixer1 });

// add contrast
var contrast = new ColorEffect( renderer, { source: mixer2 });


// finally asign it all to the output
var output = new Output( renderer, contrast )

// initialize the renderer and start the renderer
renderer.init();         // init
renderer.render();       // start update & animation

// -----------------------------------------------------------------------------
contrast.effect(61)      // select contrast from coloreffect
contrast.extra(0.4)      // set contrast to 0.4
mixer2.mixMode(5)        // add noise, mixer 5 is a 50/50 mix (on top of mixer 1)
mixer2.blendMode(1)      // mix noise as normal
mixer2.pod(0.6)          // mix noise 60%

// not using binds, today
// mixer2.bindBpm( function() { return audioanalysis1.getBpm()/4 } );
// mixer2.audoFade = true

if (userAgent.match(/iPad/i) || userAgent.match(/iPhone/i)) {
   // iPad or iPhone
   try {
     audioanalysis1.add( mixer1.pod )
     audioanalysis1.mod = 1
   }catch(e){
     alert('Apple device detected!')
   }
}
else {
   // Anything else
   audioanalysis1.add( mixer1.pod )
   audioanalysis1.mod = 1
}


var wasSet = false
var beats = 0
var useBlendmodes = [ 1, 7, 8, 9, 10, 13, 17, 18 ]
var useMixmodes = [ 1, 2, 6, 3, 4, 5, 9 ] //  6, 7, 8
var dice = 0

setInterval(function() {
  if ( audioanalysis1.render() > 0.99 && !wasSet ) {
    wasSet = true
    beats += 1
    dice = Math.random()
    console.log("beat!", beats, dice)
    if (beats == 2) filemanager.changez()
    if (beats == 6) filemanager2.changez()
    if (beats%6 == 0 && dice < 0.2 ) source1.jump()
    if (beats%4 == 0 && dice < 0.2 ) source2.jump()
    if (beats%16 == 0 && dice < 0.64 ) filemanager.changez(); //setTimeout(function() { source1.jump() }, 1500 )
    if (beats%12 == 0 && dice < 0.64 ) filemanager2.changez(); //setTimeout(function() { source1.jump() }, 1500 )
    if (beats%9 == 0 && dice < 0.7 ) mixer1.blendMode( useBlendmodes[Math.floor( Math.random() * useBlendmodes.length )] );
    if (beats%18 == 0 && dice < 0.4 ) mixer1.mixMode( useMixmodes[Math.floor( Math.random() * useMixmodes.length )] );
    if (beats%32 == 0 && dice < 0.1 ) audioanalysis1.mod = 0.5
    if (beats%32 == 0 && dice > 0.5 ) audioanalysis1.mod = 1
  }

  if ( audioanalysis1.render() < 0.01 ) {
    wasSet = false
  }

}, 1 )
