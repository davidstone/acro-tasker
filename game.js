const countdownDuration = 5;

let allPoses = [];
let selectedPoses = [];
let lastPoseTime = Date.now();
let intervalId = null;

const poseListContainer = document.getElementById('pose-list');
const presetSelect = document.getElementById('preset');
const transitionTime = document.getElementById('transition-time');
const holdTime = document.getElementById('hold-time');
const bothSidesCheckbox = document.getElementById('both-sides');
const startStopBtn = document.getElementById('start-stop');
const currentPoseDisplay = document.getElementById('current-pose');
const togglePosesBtn = document.getElementById('toggle-poses');

async function loadPoses() {
	const response = await fetch('poses.json');
	allPoses = await response.json();
	initGame();
}

function initGame() {
	generatePoseCheckboxes();
	presetSelect.addEventListener('change', applyPreset);
	applyPreset();
}

loadPoses().catch(err => console.error('Failed to load poses:', err));

function isStarted() {
	return Boolean(intervalId);
}

const Side = Object.freeze({
	NONE: 'none',
	BASE: 'base',
	BOTH: 'both'
});

function mapSide(sideInput) {
	switch (sideInput) {
		case undefined: return Side.NONE;
		case 'base': return Side.BASE;
		case 'both': return Side.BOTH;
		default: throw new Error(`Invalid side: ${sideInput}`);
	}
}

poseListContainer.style.display = 'none';
function generatePoseCheckboxes() {
	poseListContainer.innerHTML = '';
	allPoses.forEach(poseGroup => {
		const groupDiv = document.createElement('div');
		groupDiv.className = 'pose-group';
		poseGroup.forEach((pose, i) => {
			const label = document.createElement('label');
			label.innerHTML = `
				<input
					type="checkbox"
					class="pose"
					data-pose="${pose.name}"
					${pose.phonetic ? `data-phonetic="${pose.phonetic}"` : ''}
					data-side="${mapSide(pose.side)}"
				>${pose.name}<br>
			`;
			if (i === 0) {
				groupDiv.appendChild(label);
			} else {
				let modifierDiv = groupDiv.querySelector('.modifier-list');
				if (!modifierDiv) {
					modifierDiv = document.createElement('div');
					modifierDiv.className = 'modifier-list';
					groupDiv.appendChild(modifierDiv);
				}
				modifierDiv.appendChild(label);
			}
		});
		poseListContainer.appendChild(groupDiv);
	});
	document.querySelectorAll('.pose').forEach(checkbox => {
		checkbox.addEventListener('change', () => {
			updateSelectedPoses();
			presetSelect.value = 'custom';
		});
	});
}

function updateSelectedPoses() {
	selectedPoses = Array.from(document.querySelectorAll('.pose'))
		.filter(cb => cb.checked)
		.map(cb => ({
			pose: cb.dataset.pose,
			phonetic: cb.dataset.phonetic,
			side: cb.dataset.side
		}));
}

function applyPreset() {
	const difficulty = presetSelect.value;
	if (difficulty === 'custom') {
		return;
	}
	const difficultyPreset = difficultyPresets[difficulty];
	selectPosesByDifficulty(difficultyPreset.minDifficulty, difficultyPreset.maxDifficulty);
	transitionTime.value = difficultyPreset.transition;
	holdTime.value = difficultyPreset.hold;
	updateSelectedPoses();
}

function selectPosesByDifficulty(min, max) {
	const checkboxes = document.querySelectorAll('.pose');
	const difficultyMap = Object.fromEntries(
		allPoses.flat().map(pose => [pose.name, pose.difficulty])
	);
	checkboxes.forEach(cb => {
		const difficulty = difficultyMap[cb.dataset.pose];
		cb.checked = min <= difficulty && difficulty <= max;
	});
}
const difficultyPresets = {
	beginner: { minDifficulty: 0, maxDifficulty: 10, transition: 60, hold: 10 },
	easy: { minDifficulty: 0, maxDifficulty: 30, transition: 40, hold: 5 },
	medium: { minDifficulty: 0, maxDifficulty: 60, transition: 30, hold: 5 },
	hard: { minDifficulty: 30, maxDifficulty: 80, transition: 20, hold: 10 },
	crazy: { minDifficulty: 40, maxDifficulty: Infinity, transition: 15, hold: 15 }
};

togglePosesBtn.addEventListener('click', () => {
	const isHidden = poseListContainer.style.display === 'none';
	poseListContainer.style.display = isHidden ? 'block' : 'none';
	togglePosesBtn.textContent = isHidden ? 'Hide poses' : 'Show poses';
});

function stop() {
	clearTimeout(intervalId);
	intervalId = null;
	window.speechSynthesis.cancel();
	startStopBtn.textContent = 'Start';
}

function tryStart() {
	if (selectedPoses.length > 0) {
		startRound();
		startStopBtn.textContent = 'Stop';
	} else {
		alert('Please select a difficulty or expand poses to choose manually!');
	}
}

startStopBtn.addEventListener('click', () => {
	if (isStarted()) {
		stop();
	} else {
		tryStart();
	}
});

function startRound() {
	displayNewPose(() => {
		const secondsToGetIntoPose = Number(transitionTime.value);
		const expectedTimeOfHold = Date.now() + secondsToGetIntoPose * 1000;
		function nextMessage() {
			const millisecondsUntilHold = expectedTimeOfHold - Date.now();
			const secondsUntilHold = Math.ceil(millisecondsUntilHold / 1000);
			if (secondsUntilHold <= 0) {
				speak('Hold');
				intervalId = setTimeout(() => {
					startRound();
				}, Number(holdTime.value) * 1000);
			} else {
				speak(secondsUntilHold);
				intervalId = setTimeout(() => {
					nextMessage();
				}, millisecondsUntilHold - 1000 * (secondsUntilHold - 1));
			}
		}
		intervalId = setTimeout(() => {
			nextMessage();
		}, (secondsToGetIntoPose - countdownDuration) * 1000);
	});
}

function randomChoice(...options) {
	return options[Math.floor(Math.random() * options.length)];
}

function sideModifierString(nextPose) {
	switch (nextPose.side) {
		case Side.NONE:
			return '';
		case Side.BASE:
			return randomChoice('base left', 'base right');
		case Side.BOTH:
			return `${randomChoice('base', 'flyer')} ${randomChoice('left', 'right')}`;
	}
}

function displayNewPose(handleTimers) {
	let nextPose;
	let sideModifier;
	let poseString;
	do {
		nextPose = selectedPoses[Math.floor(Math.random() * selectedPoses.length)];
		sideModifier = bothSidesCheckbox.checked ? sideModifierString(nextPose) : none;
		poseString = sideModifier ? `${sideModifier} ${nextPose.pose}` : nextPose.pose;
	} while (poseString === currentPoseDisplay.textContent && selectedPoses.length > 1);
	currentPoseDisplay.textContent = poseString;
	lastPoseTime = Date.now();
	const spokenPose = nextPose.phonetic ?
		`${sideModifier} ${nextPose.phonetic}` :
		poseString;
	speak(spokenPose, handleTimers);
}

window.speechSynthesis.onvoiceschanged = setNewVoice;
let voice;
function setNewVoice() {
	const voices = window.speechSynthesis.getVoices();
	console.log('Available voices:', voices.length);
	if (voices.length > 0) {
		voice = voices[0];
		console.log('Using voice:', voice.name);
	} else {
		console.log('Waiting for voices to load...');
	}
}
setNewVoice();

function speak(text, onFinished = () => {}) {
	if (!('speechSynthesis' in window)) {
		console.log('Speech synthesis not supported');
		return;
	}
	const utterance = new SpeechSynthesisUtterance(text);
	utterance.onerror = (event) => {
		console.error('Speech error:', event.error);
		onFinished();
	};
	utterance.onend = onFinished;
	utterance.voice = voice;
	window.speechSynthesis.speak(utterance);
}
