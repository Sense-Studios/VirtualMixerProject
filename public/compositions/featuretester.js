var renderer = new GlRenderer();
var source1 = new VideoSource(renderer, {});
var source2 = new VideoSource(renderer, {});
var mixer1 = new Mixer( renderer, { source1: source1, source2: source2 });
var mixer2 = new Mixer( renderer, { source1: mixer1, source2: source2 });
var mixer3 = new Mixer( renderer, { source1: mixer1, source2: mixer2 });
var output = new Output( renderer, mixer1 );

var audioanalysis1 = new AudioAnalysis( renderer, { audio: "/audio/rage_hard.mp3" })
renderer.init();
renderer.render();
var sysinfoconfig = [ mixer1, mixer2, mixer3, source1, source2, audioanalysis1 ]    