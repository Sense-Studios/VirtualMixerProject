
if ( sysinfoconfig ) {
} else {
  // default config is a guestimate    
  sysinfoconfig = []    
}

function loadMixerInfo() { 
  sysinfoconfig.forEach( function( node ) { 
    
    // we can probably rewrite this like
    // [ type, [ attributes ... ] ]
    // [ "Mixer", [".display_filename", ".display_time", ".display_duration", ".display_state", ".display_speed" ] ]

    if ( node.uuid.includes("Mixer") ) {
      
      const template = document.getElementById("mixer") 
      const clone = template.content.cloneNode(true);
      document.getElementById('test_container').appendChild(clone);
      console.log("make mixer")

      var attributes = [ ".display_uuid", ".display_pod", ".display_mix_mode", ".display_blend_mode" ]
      attributes.forEach( function( attr, index ) {
        console.log( index, node.uuid, attr )
        elms = document.querySelectorAll( attr )
        elms[elms.length-1].id = node.uuid + attr
      })

    } else if ( node.uuid.includes("Analysis") ) {      
      const template = document.getElementById("audioanalysis")   
      const clone = template.content.cloneNode(true);
      document.getElementById('test_container').appendChild(clone);
      console.log("make analysis")

      var attributes = [ ".display_uuid", ".display_bpm", ".display_bpm_delayed", ".display_bpm_mod", ".display_bpm_conf", ".display_bpm_sec", ".display_bpm_render", ".display_bpm_float", ".display_beats" ]
      attributes.forEach( function( attr, index ) {
        console.log( index, node.uuid, attr )
        elms = document.querySelectorAll( attr )
        elms[elms.length-1].id = node.uuid + attr
      })


    } else if ( node.uuid.includes("VideoSource") ) {      
      const template = document.getElementById("videosource")      
      const clone = template.content.cloneNode(true);
      document.getElementById('test_container').appendChild(clone);
      console.log("make videosource")

      var attributes = [".display_uuid", ".display_filename", ".display_time", ".display_duration", ".display_state", ".display_speed", ".display_dimensions" ]
      attributes.forEach( function( attr, index ) {
        console.log( index, node.uuid, attr )
        elms = document.querySelectorAll( attr )
        elms[elms.length-1].id = node.uuid + attr
      })            

    } else if ( node.uuid.includes("Monitor") ) {
      const template = document.getElementById("monitor")      
      const clone = template.content.cloneNode(true);      
      document.getElementById('test_container').appendChild(clone);
      
    }  
  })
}
loadMixerInfo()

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

//#VU
var WIDTH = 240
var HEIGHT = 64
var canvas = document.getElementById("VU_canvas")
var canvasCtx = canvas.getContext('2d')
function drawAnayize() {    
  if ( document.getElementById('sysinfo').classList.contains('hidden') ) {
    return
  }

  if ( !audioanalysis1 || !audioanalysis1.dataSet ) {
    return
  }

  canvasCtx.fillStyle = "rgb(0, 0, 0)";
  canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
  const barWidth = ( WIDTH / ( audioanalysis1.dataSet.length ) );
  let barHeight;
  let peakHeight;
  let x = 0;    

  for (let i = 0; i < audioanalysis1.dataSet.length; i += 1) {
    
    if (audioanalysis1.dataSet[i]) {
      barHeight = ( ( audioanalysis1.dataSet[i][1] / 255 ) * HEIGHT * 1.9 ) - HEIGHT
      peakHeight = 0

      audioanalysis1.tempoData.foundpeaks.forEach( function(peak) {
        if ( peak[0] == audioanalysis1.dataSet[i][0] ) {
          peakHeight = 64           
        } 
      })
    }else{
      barHeight = 0
    }
    
    //try {
    //  
   // }catch(e) {
    //  peakHeight = 0
    //}
   

    //if (i == 1) console.log( audioanalysis1.dataSet[4] )
    // canvasCtx.fillStyle = `rgb(${barHeight + 100}, 50, 50)`;
    canvasCtx.fillStyle = `rgb(255, 50, 50)`;
    canvasCtx.fillRect(x, HEIGHT - barHeight, barWidth + 1, barHeight);      

    canvasCtx.fillStyle = `rgb(150, 150, 80)`;
    canvasCtx.fillRect(x, HEIGHT - peakHeight, barWidth + 0.5, peakHeight);      

    x += barWidth      
  }    
}

// Mixer, Analysis, VideoSource, Filemanager
// -- info -- move this to a helper class in source, when completed
function updateInfo() { 
  //mixer1.pod( audioanalysis1.render() )
  if ( document.getElementById('sysinfo').classList.contains('hidden') ) {
    return
  }

  try {
    if ( !audioanalysis1.tempoData ) return
  } catch(e) {
    //console.log(" dan niet ")
  }

  sysinfoconfig.forEach( function( node ) {       

    document.getElementById( node.uuid + ".display_uuid").innerText = node.uuid.split("_")[0]

    if ( node.uuid.includes("Analysis") ) {  
      document.getElementById( node.uuid + ".display_bpm").innerText = node.tempoData.bpm
      document.getElementById( node.uuid + ".display_bpm_delayed").innerText = Math.round(node.delayed_bpm*100)/100
      document.getElementById( node.uuid + ".display_bpm_mod").innerText = node.mod
      document.getElementById( node.uuid + ".display_bpm_conf").innerText = node.tempoData.confidence
      document.getElementById( node.uuid + ".display_bpm_sec").innerText = Math.round(node.sec*100)/100
      document.getElementById( node.uuid + ".display_bpm_render").innerText = Math.round(node.render()*100)/100
      document.getElementById( node.uuid + ".display_bpm_render").style.backgroundColor = "rgba("+node.render()*255+",0,0,1)"
      document.getElementById( node.uuid + ".display_bpm_float").innerText = Math.round(node.bpm_float*100)/100
      document.getElementById( node.uuid + ".display_bpm_float").style.backgroundColor = "rgba("+node.bpm_float*255+",0,0,1)"
      document.getElementById( node.uuid + ".display_beats").innerText = node.beats
    }   

    if ( node.uuid.includes("Mixer") ) {  
      document.getElementById( node.uuid + ".display_pod").innerText = Math.round(node.pod()*100)/100
      document.getElementById( node.uuid + ".display_pod").style.backgroundColor = "rgba("+node.pod()*255+",0,0,1)"
      document.getElementById( node.uuid + ".display_mix_mode").innerText = mixer1.mixMode() + ", " + lookupMixMode( node.mixMode() )
      document.getElementById( node.uuid + ".display_blend_mode").innerText = mixer1.blendMode() + ", " + lookupBlendMode( node.blendMode() )
    }
    
    if ( node.uuid.includes("VideoSource") ) {  
      //var attributes = [".display_filename", ".display_time", ".display_duration", ".display_state", ".display_speed" ]
      document.getElementById( node.uuid + ".display_filename" ).innerText = node.video.currentSrc.split("/")[source1.video.currentSrc.split("/").length-1]
      document.getElementById( node.uuid + ".display_time" ).innerText = Math.round( node.video.currentTime * 100 ) / 100
      document.getElementById( node.uuid + ".display_duration" ).innerText = Math.round( node.video.duration * 100 ) / 100
      document.getElementById( node.uuid + ".display_state" ).innerText = node.video.readyState
      document.getElementById( node.uuid + ".display_speed" ).innerText = node.video.playbackRate
      document.getElementById( node.uuid + ".display_dimensions" ).innerText = node.video.videoWidth + "×" + node.video.videoHeight
    }

    if ( node.uuid.includes("Monitor") ) {  
    }          
  })
}

// main
document.querySelector('.close_button').onclick = function() {     
  document.getElementById("sysinfo").classList.toggle("hidden")
}

setInterval( updateInfo, 60 )  
setInterval( drawAnayize, 60 )
window.document.onkeyup = function(e) { 
  switch (e.which) {
    case 73: // i for info        
      document.getElementById("sysinfo").classList.toggle("hidden")
      break;
  
    default:
      break;
  }
}