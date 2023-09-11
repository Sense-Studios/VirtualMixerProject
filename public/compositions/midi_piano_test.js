var renderer = new GlRenderer();

var source1 = new VideoSource( renderer, { src: "" });
var source2 = new VideoSource( renderer, { src: "" });
var source3 = new VideoSource( renderer, { src: "" });
var source4 = new VideoSource( renderer, { src: "" });
var source5 = new VideoSource( renderer, { src: "" });
var source6 = new VideoSource( renderer, { src: "" });
var source7 = new VideoSource( renderer, { src: "" });
var source8 = new VideoSource( renderer, { src: "" });

// var mixer1 = new Mixer( renderer, { source1: source1, source2: source2 });
var sources = [ source1, source2, source3, source4, source5, source6, source7, source8 ]
var chain = new Chain( renderer,  { sources: sources} )

var output = new Output( renderer, chain );

// ---------------------------------------------------------------------------
// render bank of 15 (white) and ten (black) keys
// assign video to each
// spread the sources over 6-8 sources and select intellegntly
// add fading controls for effect, pref. on key down velocity

var mc = new MidiController( renderer, {} );
mc.debug = true

var key_mod = 48
var keys = [ 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72 ]

if ( window.location.search == "?mode=apc" ) {
	key_mod = 0
	keys = [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64 ]
}


var videos = [
	"https://assets.mixkit.co/videos/302/302-720.mp4", // C
	"https://assets.mixkit.co/videos/303/303-720.mp4", // C#
	"https://assets.mixkit.co/videos/334/334-720.mp4", // D
	"https://assets.mixkit.co/videos/337/337-720.mp4", // D#
	"https://assets.mixkit.co/videos/341/341-720.mp4", // E
	"https://assets.mixkit.co/videos/343/343-720.mp4", // F
	"https://assets.mixkit.co/videos/344/344-720.mp4", // F#
	"https://assets.mixkit.co/videos/3key_mod/3key_mod-720.mp4", // G
	"https://assets.mixkit.co/videos/350/350-720.mp4", // G#
	"https://assets.mixkit.co/videos/351/351-720.mp4", // A
	"https://assets.mixkit.co/videos/353/353-720.mp4", // A#
	"https://assets.mixkit.co/videos/424/424-720.mp4", // B
	"https://assets.mixkit.co/videos/425/425-720.mp4", // C
	"https://assets.mixkit.co/videos/427/427-720.mp4", // C#
	"https://assets.mixkit.co/videos/431/431-720.mp4", // D
	"https://assets.mixkit.co/videos/432/432-720.mp4", // D#
	"https://assets.mixkit.co/videos/442/442-720.mp4", // E
	"https://assets.mixkit.co/videos/4key_mod/4key_mod-720.mp4", // F
	"https://assets.mixkit.co/videos/449/449-720.mp4", // F#
	"https://assets.mixkit.co/videos/453/453-720.mp4", // G
	"https://assets.mixkit.co/videos/457/457-720.mp4", // G#
	"https://assets.mixkit.co/videos/463/463-720.mp4", // A
	"https://assets.mixkit.co/videos/467/467-720.mp4", // A#
	"https://assets.mixkit.co/videos/471/471-720.mp4", // B
	"https://assets.mixkit.co/videos/472/472-720.mp4"  // C
]

var videos = [

  //                                                    00 00       C  D  E  F  G  A
  //
	"https://assets.mixkit.co/videos/302/302-720.mp4", // key_mod 00 C     x
	"https://assets.mixkit.co/videos/303/303-720.mp4", // 49 01 C#
	"https://assets.mixkit.co/videos/334/334-720.mp4", // 50 02 D        x
	"https://assets.mixkit.co/videos/337/337-720.mp4", // 51 03 D#
	"https://assets.mixkit.co/videos/341/341-720.mp4", // 52 04 E     x     x
	"https://assets.mixkit.co/videos/343/343-720.mp4", // 53 05 F              x
	"https://assets.mixkit.co/videos/344/344-720.mp4", // 54 06 F#       x
	"https://assets.mixkit.co/videos/3key_mod/3key_mod-720.mp4", // 55 07 G     x           x
	"https://assets.mixkit.co/videos/350/350-720.mp4", // 56 08 G#          x
	"https://assets.mixkit.co/videos/351/351-720.mp4", // 57 09 A        x     x     x
	"https://assets.mixkit.co/videos/353/353-720.mp4", // 58 10 A#
	"https://assets.mixkit.co/videos/424/424-720.mp4", // 59 11 B           x     x

	"https://assets.mixkit.co/videos/425/425-720.mp4", // 60 12 C     x        x
	"https://assets.mixkit.co/videos/427/427-720.mp4", // 61 13 C#                   x
	"https://assets.mixkit.co/videos/431/431-720.mp4", // 62 14 D        x        x
	"https://assets.mixkit.co/videos/432/432-720.mp4", // 63 15 D#
	"https://assets.mixkit.co/videos/442/442-720.mp4", // 64 16 E     x     x        x
	"https://assets.mixkit.co/videos/4key_mod/4key_mod-720.mp4", // 65 17 F        x     x
	"https://assets.mixkit.co/videos/449/449-720.mp4", // 66 18 F#
	"https://assets.mixkit.co/videos/453/453-720.mp4", // 67 19 G     x
	"https://assets.mixkit.co/videos/457/457-720.mp4", // 68 20 G#          x
	"https://assets.mixkit.co/videos/463/463-720.mp4", // 69 21 A        x     x
	"https://assets.mixkit.co/videos/467/467-720.mp4", // 70 22 A#
	"https://assets.mixkit.co/videos/471/471-720.mp4", // 71 23 B           x

	"https://assets.mixkit.co/videos/472/472-720.mp4"  // 72 24 C              x
]



var videos = [
    "/streamable/7wz927",
    "/streamable/1yj7k1",
    "/streamable/i34hve",
    "/streamable/6pamgy",
    "/streamable/3h1i5h",
    "/streamable/zc31yi",
    "/streamable/vu3q8r",
    "/streamable/3v29vp",
    "/streamable/hlsuio",
    "/streamable/rn06xg",
    "/streamable/curcuw",
    "/streamable/utu5bo",
    "/streamable/sj16wa",
    "/streamable/uqrk4p",
    "/streamable/puohco",
    "/streamable/y97gt6",
    "/streamable/257nhv",
    "/streamable/50tjc8",
    "/streamable/nf63d4",
    "/streamable/ip5a8k",
    "/streamable/weuwla",
    "/streamable/3gwkw8",
    "/streamable/ymvjv5",
    "/streamable/xsp6il",
    "/streamable/tuudeo",
    "/streamable/wnthv9",
    "/streamable/3k9jv6",
    "/streamable/od0i3c",
    "/streamable/2m0vix",
    "/streamable/ls7njn",
    "/streamable/9te3oh",
    "/streamable/bl0oe9",
    "/streamable/sh6mmb",
    "/streamable/g9d29c",
    "/streamable/o12r74",
    "/streamable/ujdnzo"
]

keys.forEach( function( _key ) {
  mc.addEventListener( _key, function(e) { pressedKey(e) } )
})

var fadeInValue = 0.025
var fadeIn = function() {
  if ( fadeInValue > 0.4 ) { fadeInValue = 0.4 }
  return fadeInValue
}

var fadeOutValue = 0.025
var fadeOut = function() {
  if ( fadeOutValue > 0.4 ) { fadeOutValue = 0.4 }
  return fadeOutValue
}
var mod = 127

mc.addEventListener( 1, function(e) { fadeInValue  = ( e[2] / mod ) + 0.0001; console.log(fadeInValue)} )
mc.addEventListener( 2, function(e) { fadeOutValue = ( e[2] / mod ) - 0.0001; console.log(fadeOutValue)} )

mc.addEventListener( 48, function(e) { fadeInValue  = ( e[2] / mod ) + 0.0001; console.log(fadeInValue) } )
mc.addEventListener( 49, function(e) { fadeOutValue = ( e[2] / mod ) - 0.0001; console.log(fadeOutValue)} )

// moet per source geregeld worden!
/*
mc.addEventListener( 1, function(e) { fadeInValue  = ( e[2] / mod ) + 0.0001 } )
mc.addEventListener( 2, function(e) { fadeOutValue = ( e[2] / mod ) - 0.0001 } )

mc.addEventListener( 1, function(e) { fadeInValue  = ( e[2] / mod ) + 0.0001 } )
mc.addEventListener( 2, function(e) { fadeOutValue = ( e[2] / mod ) - 0.0001 } )

mc.addEventListener( 1, function(e) { fadeInValue  = ( e[2] / mod ) + 0.0001 } )
mc.addEventListener( 2, function(e) { fadeOutValue = ( e[2] / mod ) - 0.0001 } )
*/


sources.forEach( ( _source) => { _source.isDown = false } )
sources.forEach( ( _source) => { _source.isAvailable = true } )


function pressedKey(e) {
  console.log("pressed key: ", e )
  if (e[0] == 144) {
    // DOWN!
    console.log("start", videos[e[1]-key_mod] )

    // find first availabe source lnk
    var first_available_source = null
    var first_available_source_chain_id = -1

    sources.forEach( ( _source, i ) => {
      if ( _source.currentSrc == videos[e[1]-key_mod] ) {
        console.log("already assigned")
        first_available_source = _source
        first_available_source_chain_id = i
        return;
      }

      if ( _source.isAvailable && first_available_source == null) {
        first_available_source = _source
        first_available_source_chain_id = i
      }
    })

    console.log(" first availabe source is: ", first_available_source, first_available_source_chain_id )

    if ( first_available_source != null ) {
      if ( first_available_source.currentSrc == videos[e[1]-key_mod] ) {
        first_available_source.jump()
      }else{
        // first_available_source.src( videos[e[1]-key_mod] )
				first_available_source.video.src = ""
				first_available_source.video.load()
				console.log("source reset ...")

				first_available_source.src( videos[e[1]-key_mod] )
        chain.setChainLink( first_available_source_chain_id, 0)
      }
      first_available_source.isDown = true
      first_available_source.isAvailable = false

    }else{
      console.warn("You ran our of sources")
    }

  } else if (e[0] == 128) {
    // UP!
    // source1.isDown = false
    // release last source?
    sources.forEach( ( _source, i ) => {
      if ( _source.currentSrc == videos[ e[1]-key_mod] ) {
				console.log("current source: ", _source.uuid, _source.currentSrc )
        _source.isDown = false
      }
    })
  }
}


function fader() {
  // each chainLink not < 0 fadeout
  if (renderer == undefined) return
  for(var i = 1; i < 9; i++ ) {
    var _alpha = chain.getChainLink(i-1, _alpha )

		// fix ?
		//if (_alpha > 1 ) {
		//	var newalpha = 0.1
		//}

    if ( _alpha > 0 && !window['source' + i].isDown ) {
      var newalpha = Number(_alpha - fadeOut())
      chain.setChainLink(i-1, newalpha ) // adjustable
      //console.log('source' + 1, newalpha, fadeOut())

    } else if ( _alpha <= 1 && window['source' + i].isDown ) {

      var newalpha = Number(_alpha + fadeIn())
      chain.setChainLink(i-1, newalpha ) // adjustable
      console.log("add alpha", i-1, newalpha, fadeIn())

			//add alpha 1 1 1
			//midi_piano_test.js:256 add alpha 1 2 1

    } else if ( chain.getChainLink(i-1) <= 0 && !window['source' + i].isAvailable ) {
      window['source' + i].isAvailable = true
      chain.setChainLink(i-1, 0 )
    }
  }
}

function update() {
  fader()
  requestAnimationFrame(update)
}
requestAnimationFrame(update)

renderer.init();
renderer.render();
