const allPoses = [
	{name: 'back fly', difficulty: 0, reversible: true, canMono: true},
	{name: 'back bed', difficulty: 20, reversible: false, canMono: false},
	{name: 'front bed', difficulty: 20, reversible: false, canMono: false},
	{name: 'bicep stand', difficulty: 50, reversible: true, canMono: true},
	{name: 'bird', difficulty: 0, reversible: true, canMono: true},
	{name: 'free bird', difficulty: 20, reversible: false, canMono: true},
	{name: 'free reverse bird', difficulty: 30, reversible: false, canMono: true},
	{name: 'bird on hands', difficulty: 40, reversible: true, canMono: true},
	{name: 'back bird', difficulty: 20, reversible: true, canMono: true},
	{name: 'back bird on hands', difficulty: 50, reversible: true, canMono: true},
	{name: 'boat', difficulty: 40, reversible: true, canMono: true},
	{name: 'chair', difficulty: 0, reversible: true, canMono: true},
	{name: 'croc', difficulty: 70, reversible: true, canMono: false},
	{name: 'folded leaf', difficulty: 0, reversible: false, canMono: true},
	{name: 'foot to foot', difficulty: 50, reversible: true, canMono: true},
	{name: 'foot to hand', difficulty: 60, reversible: true, canMono: true},
	{name: 'extended foot to hand', difficulty: 65, reversible: true, canMono: true},
	{name: 'foot to shin', difficulty: 40, reversible: true, canMono: true},
	{name: 'floating paschi', difficulty: 35, reversible: true, canMono: true},
	{name: 'hand to hand', difficulty: 80, reversible: true, canMono: true},
	{name: 'extended hand to hand', difficulty: 90, reversible: true, canMono: true},
	{name: 'hangle dangle', difficulty: 70, reversible: true, canMono: true},
	{name: 'icarian throne', difficulty: 30, reversible: true, canMono: true},
	{name: 'straddle throne', difficulty: 0, reversible: true, canMono: true},
	{name: 'star', difficulty: 20, reversible: true, canMono: true},
	{name: 'free star', difficulty: 65, reversible: false, canMono: true},
	{name: 'free reverse star', difficulty: 60, reversible: false, canMono: true},
	{name: 'shin to foot', difficulty: 35, reversible: true, canMono: true},
	{name: 'shin to hand', difficulty: 50, reversible: true, canMono: true},
	{name: 'shoulder stand', difficulty: 50, reversible: true, canMono: true},
	{name: 'candlestick', difficulty: 30, reversible: false, canMono: true},
	{name: 'needle', difficulty: 70, reversible: true, canMono: true},
	{name: 'space needle', difficulty: 70, reversible: true, canMono: true},
	{name: 'inside side star', difficulty: 30, reversible: true, canMono: false},
	{name: 'outside side star', difficulty: 40, reversible: true, canMono: false},
	{name: 'straddle bat', difficulty: 20, reversible: false, canMono: true},
	{name: 'thinker', difficulty: 40, reversible: false, canMono: false},
	{name: 'vishnu\'s couch', difficulty: 30, reversible: true, canMono: false},
	{name: 'whale', difficulty: 0, reversible: false, canMono: true}
];

const reverseDifficulty = 20;
const monoDifficulty = 40;
const funkyDifficulty = 50;

const countdownDuration = 5;

let selectedPoses = [];
let lastPose = null;
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

function isStarted() {
	return Boolean(intervalId);
}

function getPoseScore(baseDifficulty, modifier) {
	return baseDifficulty +
		(modifier.includes('reverse') ? reverseDifficulty : 0) +
		(modifier.includes('mono') ? monoDifficulty : 0) +
		(modifier.includes('funky') ? funkyDifficulty : 0);
}

poseListContainer.style.display = 'none';
function generatePoseCheckboxes() {
	poseListContainer.innerHTML = '';
	allPoses.forEach(pose => {
		const groupDiv = document.createElement('div');
		groupDiv.className = 'pose-group';
		function makeLabel(modifier) {
			const label = document.createElement('label');
			label.innerHTML = `
				<input type="checkbox" class="pose" data-pose="${pose.name}" data-modifier="${modifier}">
				${modifier === 'none' ? pose.name : `${modifier} ${pose.name}`}<br>
			`;
			if (modifier === 'none') {
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
		}
		makeLabel('none');
		if (pose.reversible) {
			makeLabel('reverse');
		}
		if (pose.canMono) {
			['mono', 'funky'].forEach(modifier => {
				makeLabel(modifier);
				if (pose.reversible) {
					makeLabel(`${modifier} reverse`);
				}
			});
		}
		poseListContainer.appendChild(groupDiv);
	});
	document.querySelectorAll('.pose').forEach(checkbox => {
		checkbox.addEventListener('change', () => {
			updateSelectedPoses();
			presetSelect.value = 'custom';
		});
	});
}
generatePoseCheckboxes();

function updateSelectedPoses() {
	selectedPoses = Array.from(document.querySelectorAll('.pose'))
		.filter(cb => cb.checked)
		.map(cb => ({
			pose: cb.dataset.pose,
			modifier: cb.dataset.modifier
		}));
}

function applyPreset() {
	const difficulty = presetSelect.value;
	if (difficulty === 'custom') {
		return;
	}
	selectPosesByDifficulty(difficulty);
	transitionTime.value = transitionTimeForDifficulty(difficulty);
	holdTime.value = holdTimeForDifficulty(difficulty);
	updateSelectedPoses();
}

presetSelect.addEventListener('change', applyPreset);
applyPreset();

function selectPosesByDifficulty(difficulty) {
	const {min, max} = scoreForDifficulty(difficulty);
	const checkboxes = document.querySelectorAll('.pose');
	checkboxes.forEach(cb => {
		const pose = allPoses.find(p => p.name === cb.dataset.pose);
		const modifier = cb.dataset.modifier;
		const score = getPoseScore(pose.difficulty, modifier);
		cb.checked = min <= score && score <= max;
	});
}
function scoreForDifficulty(difficulty) {
	switch (difficulty) {
		case 'beginner':
			return {min: 0, max: 0};
		case 'easy':
			return {min: 0, max: 30};
		case 'medium':
			return {min: 0, max: 60};
		case 'hard':
			return {min: 30, max: 80};
		case 'crazy':
			return {min: 40, max: Infinity};
	}
}

function transitionTimeForDifficulty(difficulty) {
	switch (difficulty) {
		case 'beginner':
			return 60;
		case 'easy':
			return 40;
		case 'medium':
			return 30;
		case 'hard':
			return 20;
		case 'crazy':
			return 15;
	}
}

function holdTimeForDifficulty(difficulty) {
	switch (difficulty) {
		case 'beginner':
			return 10;
		case 'easy':
			return 5;
		case 'medium':
			return 5;
		case 'hard':
			return 10;
		case 'crazy':
			return 15;
	}
}

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
		const secondsToGetIntoPose = transitionTime.value;
		const expectedTimeOfHold = Date.now() + secondsToGetIntoPose * 1000;
		function nextMessage() {
			const millisecondsUntilHold = expectedTimeOfHold - Date.now();
			const secondsUntilHold = Math.ceil(millisecondsUntilHold / 1000);
			if (secondsUntilHold <= 0) {
				speak('Hold');
				intervalId = setTimeout(() => {
					startRound();
				}, holdTime.value * 1000);
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

function displayNewPose(handleTimers) {
	let newPoseCombo;
	do {
		const combo = selectedPoses[Math.floor(Math.random() * selectedPoses.length)];
		newPoseCombo = combo.modifier === 'none' ? combo.pose : `${combo.modifier} ${combo.pose}`;
		if (bothSidesCheckbox.checked) {
			const canMono = allPoses.find(p => p.name === combo.pose).canMono;
			const needsSide = !canMono || combo.modifier.includes('mono') || combo.modifier.includes('funky');
			if (needsSide) {
				const role = Math.random() < 0.5 ? 'flyer' : 'base';
				const side = Math.random() < 0.5 ? 'left' : 'right';
				newPoseCombo = `${role} ${side} ${newPoseCombo}`;
			}
		}
	} while (newPoseCombo === lastPose && selectedPoses.length > 1);
	lastPose = newPoseCombo;
	lastPoseTime = Date.now();
	currentPoseDisplay.textContent = newPoseCombo;
	speak(spokenPose(newPoseCombo), handleTimers);
}

function spokenPose(writtenPose) {
    if (writtenPose.includes('paschi')) {
        return writtenPose.replace('paschi', 'pahshee');
    } else {
		return writtenPose;
	}
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
