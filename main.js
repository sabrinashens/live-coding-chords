var audioCtx;
var osc;
var gainNode;
var startTime;
var endTime;

let notetoPitch = {
    "C": 60,
    "C#": 61,
    "D": 62,
    "D#": 63,
    "E": 64,
    "F": 65,
    "F#": 66,
    "G": 67,
    "G#": 68,
    "A": 69,
    "A#": 70,
    "B": 71,
};

let majorScale = [0, 4, 7, 11, 14];
let minorScale = [0, 3, 7, 10, 14];
let diminishedScale = [0, 3, 6, 11, 14];
let augmentedScale = [0, 4, 7, 10, 14];


function parseCode(code) {
    chords = code.split(" "); 
    chords = chords.map(chord => { //e.g., 4@Cm9'1[2]
        //Beats
        if (chord.at(1) == "@") {
            chord = chord.split("@"); //[4, Cm9'1[2]]
            beats = chord[0] * 1; //4
            chord = chord[1]; //Cm9'1[2]
        }
        else { //Cm9'1[2]
            beats = 1
        }
        
        if (chord.at(-1) == "]") { //Cm9'1[2]
            let noteCode = chord.split("["); //[Cm9'1, 2]]
            loop = noteCode[1].slice(0, -1); //2
            if (noteCode[0].at(-2) == "'") {
                noteCode = noteCode[0].split("'"); //[Cm9, 1]
                inversion = noteCode[1]; //1
            }
            else {
            	inversion = 0;
            }
            factor = noteCode[0].at(-1); //9
            root = noteCode[0].slice(0, -1); //Cm
        }
        else {  //e.g., Cm9'1 only plays once
        	loop = 1; //1
            if (chord.at(-2) == "'") {
                chord = chord.split("'") //[Cm9, 1]
                inversion = chord[1];
                chord = chord[0];
            }
            else {
            	inversion = 0;
            }
            factor = chord.at(-1); //9
            root = chord.slice(0, -1); //Cm
        }

        factor = (factor*1 + 1) / 2 //conversion formula from factor to number, 5
        var chordMelody = new Array(factor).fill(0); //create an array of factor

        //if a minor chord
        if (root.at(-1) == "m" && root.at(-2) != "i") {  
            let pitch = notetoPitch[root.slice(0,-1)];
            for (var i = 0; i < factor; i++) {
               chordMelody[i] = minorScale[i] + pitch; 
            } 
        }  
        //if a dim chord e.g., Cdim
        else if (root.at(-2) == "i") {
            let pitch = notetoPitch[root.slice(0,-3)];
            for (var i = 0; i < factor; i++) {
               chordMelody[i] = diminishedScale[i] + pitch; 
            } 
        }
        //if a aug chord, e.g., Caug
        else if (root.at(-1) == "g") {
            let pitch = notetoPitch[root.slice(0,-3)];
            for (var i = 0; i < factor; i++) {
               chordMelody[i] = augmentedScale[i] + pitch; 
            } 
        }
        //if a major chord
        else {  
            let pitch = notetoPitch[root];
            for (var i = 0; i < factor; i++) {
                chordMelody[i] = majorScale[i] + pitch;
            }
        }
        
        Inversion(inversion, chordMelody);
        chordMelody = chordMelody.slice(inversion);
        
        return {
            "notes": chordMelody,
            "loop": loop*1,
            "beats": beats
        };
    });
    
    return chords;
}

function Inversion(inversion, chordMelody) {
    for (var i = 0; i < inversion; i++) { 
    	chordMelody.push(chordMelody[i]+12); // move up an octave
    }
    return chordMelody
}

function genSequence(note, beats, tempo) {
    sequence.push({
        note: note,
        startTime: startTime,
        endTime: startTime + beats/tempo
    });
    startTime += beats/tempo;  
    return sequence;
}

let wave = 'sine';
var waveform = document.getElementById("Waveform").waveform;
for (var i = 0; i < waveform.length; i++) {
    waveform[i].onclick = function() {
        wave = this.value;
    } 
}

let envelope = "AD";
var Envelope = document.getElementById("Envelope").envelope;
for (var i = 0; i < waveform.length; i++) {
    Envelope[i].onclick = function() {
        envelope = this.value;
    } 
}

const playButton = document.getElementById('play');
playButton.addEventListener("click", function () {
    code = document.getElementById('code').value;
    tempo = document.getElementById('tempo').value / 10;

    var chords = parseCode(code);

    sequence = [];
    startTime = 0;

    for (var i = 0; i < chords.length; i++) {
        let chordNotes= chords[i].notes;
        chordNotes = new Array(chords[i].loop).fill(chordNotes).flat();

        for (var j = 0; j < chordNotes.length; j++) {
            genSequence(chordNotes[j], chords[i].beats, tempo)
        }
    }
    playNotes(sequence);
})

function midiToFreq(m) {
    return Math.pow(2, (m - 69) / 12) * 440;
}

function playNotes(noteList) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext);
    osc = audioCtx.createOscillator();
    osc.type = wave;
    gainNode = audioCtx.createGain();
    osc.connect(gainNode).connect(audioCtx.destination);
    osc.start();
    gainNode.gain.value = 0;
    noteList.forEach(note => {
        mode = Math.round(Math.random(1));
        if (envelope == "AD") {
            if (mode == 0) {
                playAD(note);
            }
            else {
                playADbyLinear(note) 
            }
        }
    }); 
}

function playAD(note) {
    offset = 1;
    gainNode.gain.setTargetAtTime(0.7, note.startTime + offset, 0.01)
    osc.frequency.setTargetAtTime(midiToFreq(note.note), note.startTime + offset, 0.001)
    gainNode.gain.setTargetAtTime(0, note.endTime + offset - 0.05, 0.01)
}

function playADbyLinear(note) {
    offset = 1;
    gainNode.gain.linearRampToValueAtTime(0.7, note.startTime + offset + 0.01)
    osc.frequency.setTargetAtTime(midiToFreq(note.note), note.startTime + offset, 0.001)
    gainNode.gain.setTargetAtTime(0, note.endTime + offset - 0.05, 0.01)
}

function copyExample() {
    var copyText = document.getElementById("example");
    navigator.clipboard.writeText(copyText.value);
    document.getElementById('copy').style.color = "white";
    document.getElementById('copy').style.backgroundColor = "black";
    document.getElementById('copy').innerHTML = "Copied";
}

buttonState = false;
function displayText() {
    if (buttonState == false) {
        document.getElementById("tut").style.visibility = "visible";
        document.getElementById('tutorial').style.color = "white";
        document.getElementById('tutorial').style.backgroundColor = "black";
        buttonState = true;
    }
    else if (buttonState == true) {
        document.getElementById("tut").style.visibility = "hidden";
        document.getElementById('tutorial').style.color = "black";
        document.getElementById('tutorial').style.backgroundColor = "white";
        buttonState = false;
    }
}