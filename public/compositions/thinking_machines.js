// create a renderer
var renderer = new GlRenderer();

// create some solids
var source1 = new VideoSource(renderer, {})
var source2 = new VideoSource(renderer, {})
var source3 = new VideoSource(renderer, { src: "/streamable/fkfqth" } );
//var source3 = new VideoSource(renderer, { src: "http://nabu-dev.s3.amazonaws.com/uploads/video/53e2a3ad6465761455190000/720p_5000kbps_h264.mp4?r=737324588185" } );


// create a mixer, mix red and green
var mixer1 = new Mixer( renderer, { source1: source1, source2: source2 });

// var analisi
// var bpm = new BPM( renderer ) tapped beat control
var audioanalysis1 = new AudioAnalysis( renderer, { audio: '/radio/psyradio' } )
//var audioanalysis1 = new AudioAnalysis( renderer, { audio: 'http://37.220.36.51:8906/;?type=http&nocache=' + Math.round( Math.random() * 100000 )  } )
//var audioanalysis1 = new AudioAnalysis( renderer, { audio: 'https://nsbradio.co.uk/play.php' } )
//var audioanalysis1 = new AudioAnalysis( renderer, { audio: 'https://443-1.autopo.st/130/;' } )


var filemanager = new FileManager( source1 )
filemanager.load_set("/sets/thiking_machines_streamable.json")

var filemanager2 = new FileManager( source2 )
filemanager2.load_set("/sets/thiking_machines_streamable.json")


// add noise
var mixer2 = new Mixer( renderer, { source1: source3, source2: mixer1 });

// add effect
var contrast = new ColorEffect( renderer, { source: mixer2 } )

// finally asign that mixer to the output
// var output = new Output( renderer, contrast )
var output = new Output( renderer, contrast )

// initialize the renderer and start the renderer
renderer.init();         // init
renderer.render();       // start update & animation

/* ----------------------------------------------------------------------------
   And we are away
   ---------------------------------------------------------------------------- */

// set noise
mixer2.mixMode(5)
mixer2.blendMode(1)
mixer2.pod(0.6)

contrast.effect(61)
contrast.extra(0.4)
//mixer2.bindBpm( function() { return audioanalysis1.getBpm()/4 } );
//mixer2.audoFade = true

audioanalysis1.add( mixer1.pod )
audioanalysis1.mod = 1

sysinfoconfig = [ mixer1, mixer2, source1, source2, source3, audioanalysis1 ]

/*
  Init local ( i hate myseld)
  setInterval( function() {
  // eu.check_set(filemanager2.set)
  })
*/

var wasSet = false
var oldbeat = 0
var useBlendmodes = [ 1, 7, 8, 9, 10, 13, 17, 18 ]
var useMixmodes = [ 1, 2, 3, 4, 5, 6, 9 ] //  6, 7, 8
var dice = 0


setInterval(function() {
  updateInfo()

  if (audioanalysis1.beats != oldbeat) {
    oldbeat = audioanalysis1.beats
    var beats = audioanalysis1.beats
    if ( beats == 2) filemanager.changez()
    if ( beats == 6) filemanager2.changez()
    if ( beats%4 == 0) console.log("boem!")

    if (beats%6 == 0 && dice < 0.2 ) source1.jump()
    if (beats%4 == 0 && dice < 0.2 ) source2.jump()
    if (beats%16 == 0 && dice < 0.64 ) filemanager.changez(); // setTimeout(function() { source1.jump() }, 1500 )
    if (beats%12 == 0 && dice < 0.64 ) filemanager2.changez(); // setTimeout(function() { source1.jump() }, 1500 )
    if (beats%9 == 0 && dice < 0.8 ) mixer1.blendMode( useBlendmodes[Math.floor( Math.random() * useBlendmodes.length )] );
    if (beats%18 == 0 && dice < 0.6 ) mixer1.mixMode( useMixmodes[Math.floor( Math.random() * useMixmodes.length )] );
    if (beats%32 == 0 && dice < 0.1 ) audioanalysis1.mod = 0.5
    if (beats%32 == 0 && dice > 0.5 ) audioanalysis1.mod = 1
    if (beats%32 == 0 && dice < 0.1 ) mixer2.pod(0.2)
    if (beats%32 == 0 && dice > 0.5 ) mixer2.pod(0.4)
    if (beats%16 == 0 && dice > 0.8  )mixer2.pod(0.8)
  }
  /*
  //return
  if ( audioanalysis1.render() > 0.99 && !wasSet ) {
    wasSet = true
    beats += 1
    dice = Math.random()
    console.log("beat: ", audioanalysis1.bpm, audioanalysis1.tempoData.confidence, beats, dice)
    if (beats == 2) filemanager.changez()
    if (beats == 6) filemanager2.changez()
    if (beats%6 == 0 && dice < 0.2 ) source1.jump()
    if (beats%4 == 0 && dice < 0.2 ) source2.jump()
    if (beats%16 == 0 && dice < 0.64 ) filemanager.changez(); // setTimeout(function() { source1.jump() }, 1500 )
    if (beats%12 == 0 && dice < 0.64 ) filemanager2.changez(); // setTimeout(function() { source1.jump() }, 1500 )
    if (beats%9 == 0 && dice < 0.8 ) mixer1.blendMode( useBlendmodes[Math.floor( Math.random() * useBlendmodes.length )] );
    if (beats%18 == 0 && dice < 0.6 ) mixer1.mixMode( useMixmodes[Math.floor( Math.random() * useMixmodes.length )] );
    if (beats%32 == 0 && dice < 0.1 ) audioanalysis1.mod = 0.5
    if (beats%32 == 0 && dice > 0.5 ) audioanalysis1.mod = 1
    if (beats%32 == 0 && dice < 0.1 ) mixer2.pod(0.2)
    if (beats%32 == 0 && dice > 0.5 ) mixer2.pod(0.4)
    if (beats%16 == 0 && dice > 0.8  )mixer2.pod(0.8)
  }

  if ( audioanalysis1.render() < 0.01 ) {
    wasSet = false
  }
  */
  

}, 1 )

// audioanalysis1.disconnectOutput()

//move these into mixer?
function lookupMixMode(_num) {
  var lookup = ["","NORMAL","HARD","NAM","FAM","NON DARK","LEFT","RIGHT","CENTER","BOOM"]
  return lookup[_num]
}

function lookupBlendMode(_num) { 
  var lookup = ["", "ADD", "SUBSTRACT", "MULTIPLY", "DARKEN", "COLOUR BURN", "LINEAR_BURN","LIGHTEN","SCREEN",
  "COLOUR_DODGE","LINEAR_DODGE","OVERLAY","SOFT_LIGHT","HARD_LIGHT","VIVID_LIGHT","LINEAR_LIGHT",
  "PIN_LIGHT", "DIFFERENCE","EXCLUSION"]
  return lookup[_num]
}

// -- info -- move this to a helper class in source, when completed
function updateInfo() { 
  //mixer1.pod( audioanalysis1.render() )

  document.getElementById("display_bpm").innerText = audioanalysis1.tempoData.bpm
  document.getElementById("display_bpm_delayed").innerText = Math.round(audioanalysis1.delayed_bpm*100)/100
  document.getElementById("display_bpm_mod").innerText = audioanalysis1.mod
  document.getElementById("display_bpm_conf").innerText = audioanalysis1.tempoData.confidence
  
  document.getElementById("display_bpm_sec").innerText = Math.round(audioanalysis1.sec*100)/100
  document.getElementById("display_bpm_render").innerText = Math.round(audioanalysis1.render()*100)/100
  document.getElementById("display_bpm_render").style.backgroundColor = "rgba("+audioanalysis1.render()*255+",0,0,1)"
  document.getElementById("display_bpm_float").innerText = Math.round(audioanalysis1.bpm_float*100)/100
  document.getElementById("display_bpm_float").style.backgroundColor = "rgba("+audioanalysis1.bpm_float*255+",0,0,1)"

  document.getElementById("display_mixer1_pod").innerText = Math.round(mixer1.pod()*100)/100
  document.getElementById("display_mixer1_pod").style.backgroundColor = "rgba("+mixer1.pod()*255+",0,0,1)"
  document.getElementById("display_mixer1_mix_mode").innerText = mixer1.mixMode() + ", " + lookupMixMode( mixer1.mixMode() )
  document.getElementById("display_mixer1_blend_mode").innerText = mixer1.blendMode() + ", " + lookupBlendMode( mixer1.blendMode() )

  document.getElementById("display_mixer2_pod").innerText = Math.round(mixer2.pod()*100)/100
  document.getElementById("display_mixer2_pod").style.backgroundColor = "rgba("+mixer2.pod()*255+",0,0,1)"
  document.getElementById("display_mixer2_mix_mode").innerText = mixer2.mixMode() + ", " + lookupMixMode( mixer2.mixMode() )
  document.getElementById("display_mixer2_blend_mode").innerText = mixer2.blendMode() + ", " + lookupBlendMode( mixer2.blendMode() )

  document.getElementById("display_src_1_fn").innerText = source1.video.currentSrc.split("stable_diffusion/")[1]
  document.getElementById("display_src_1_ct").innerText = Math.round( source1.video.currentTime * 100 ) / 100
  document.getElementById("display_src_1_du").innerText = Math.round( source1.video.duration * 100 ) / 100
  document.getElementById("display_src_1_state").innerText = source1.video.readyState

  // readystate
  // HAVE_NOTHING	0	No information is available about the media resource.
  // HAVE_METADATA	1	Enough of the media resource has been retrieved that the metadata attributes are initialized. Seeking will no longer raise an exception.
  // HAVE_CURRENT_DATA	2	Data is available for the current playback position, but not enough to actually play more than one frame.
  // HAVE_FUTURE_DATA	3	Data for the current playback position as well as for at least a little bit of time into the future is available (in other words, at least two frames of video, for example).
  // HAVE_ENOUGH_DATA	4	Enough data is available—and the download rate is high enough—that the media can be played through to the end without interruption.

  document.getElementById("display_src_2_fn").innerText = source2.video.currentSrc.split("stable_diffusion/")[1]
  document.getElementById("display_src_2_ct").innerText = Math.round( source2.video.currentTime * 100 ) / 100
  document.getElementById("display_src_2_du").innerText = Math.round( source2.video.duration * 100 ) / 100
  document.getElementById("display_src_2_state").innerText = source2.video.readyState

  document.getElementById("display_src_3_fn").innerText = source3.video.currentSrc.split("stable_diffusion/")[1]
  document.getElementById("display_src_3_ct").innerText = Math.round( source3.video.currentTime * 100 ) / 100
  document.getElementById("display_src_3_du").innerText = Math.round( source3.video.duration * 100 ) / 100
  document.getElementById("display_src_3_state").innerText = source3.video.readyState

}

//  -- hide the logo
setTimeout( function() {
  document.querySelector(".logo").classList.add("hide")
  document.querySelector("button").classList.add("hide")
  document.querySelector(".payoff").classList.add("hide")
}, 15000 )

