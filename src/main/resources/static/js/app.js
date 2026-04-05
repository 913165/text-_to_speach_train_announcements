document.addEventListener('DOMContentLoaded', () => {

    // ── Tab switching ────────────────────────────────────────────────
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
        });
    });

    // ════════════════════════════════════════════════════════════════
    // TAB 1 – Text to Speech
    // ════════════════════════════════════════════════════════════════
    const textInput    = document.getElementById('textInput');
    const voiceSelect  = document.getElementById('voiceSelect');
    const generateBtn  = document.getElementById('generateBtn');
    const spinner      = document.getElementById('spinner');
    const btnLabel     = document.getElementById('btnLabel');
    const charCounter  = document.getElementById('charCounter');
    const audioSection = document.getElementById('audioSection');
    const audioPlayer  = document.getElementById('audioPlayer');
    const downloadLink = document.getElementById('downloadLink');
    const audioDuration= document.getElementById('audioDuration');
    const alertError   = document.getElementById('alertError');
    const validationMsg= document.getElementById('validationMsg');
    const regenerateBtn= document.getElementById('regenerateBtn');
    const MAX_CHARS    = 4096;

    textInput.addEventListener('input', () => {
        const len = textInput.value.length;
        charCounter.textContent = `${len} / ${MAX_CHARS}`;
        charCounter.classList.remove('warn', 'danger');
        if (len > MAX_CHARS * 0.9) charCounter.classList.add('danger');
        else if (len > MAX_CHARS * 0.7) charCounter.classList.add('warn');
        if (len > 0) validationMsg.classList.remove('show');
    });

    audioPlayer.addEventListener('loadedmetadata', () => {
        audioDuration.textContent = formatDuration(audioPlayer.duration);
    });

    generateBtn.addEventListener('click', generateAudio);
    regenerateBtn.addEventListener('click', generateAudio);

    async function generateAudio() {
        const text  = textInput.value.trim();
        const voice = voiceSelect.value;
        alertError.classList.remove('show');
        validationMsg.classList.remove('show');
        if (!text) { validationMsg.classList.add('show'); textInput.focus(); return; }

        setTtsLoading(true);
        audioSection.classList.remove('show');
        try {
            const res  = await fetch('/generate-audio-json', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, voice })
            });
            const data = await res.json();
            if (!res.ok || !data.success) { showError(alertError, data.error || 'Unexpected error.'); return; }
            playAudio(data.audioBase64, audioPlayer, downloadLink, `speech_${Date.now()}.mp3`);
            audioDuration.textContent = '';
            audioSection.classList.add('show');
        } catch (err) {
            showError(alertError, 'Network error: ' + err.message);
        } finally {
            setTtsLoading(false);
        }
    }

    function setTtsLoading(on) {
        generateBtn.disabled = on;
        spinner.classList.toggle('active', on);
        btnLabel.textContent = on ? 'Generating…' : 'Generate Voice';
    }

    // ════════════════════════════════════════════════════════════════
    // TAB 2 – Railway Announcement  (+  Auto-Simulation)
    // ════════════════════════════════════════════════════════════════

    // ── 5 preset scenarios ───────────────────────────────────────────
    const SIM_SCENARIOS = [
        {
            trainNumber: '12301', trainName: 'Rajdhani Express',
            sourceStation: 'New Delhi', destinationStation: 'Howrah Junction',
            platformNumber: '1', status: 'On Time', delayMinutes: ''
        },
        {
            trainNumber: '11057', trainName: 'Amritsar Express',
            sourceStation: 'Mumbai CSMT', destinationStation: 'Amritsar Junction',
            platformNumber: '5', status: 'Delayed', delayMinutes: '25'
        },
        {
            trainNumber: '22691', trainName: 'Rajdhani Express',
            sourceStation: 'Hazrat Nizamuddin', destinationStation: 'Bangalore City',
            platformNumber: '3', status: 'Arriving', delayMinutes: ''
        },
        {
            trainNumber: '12259', trainName: 'Sealdah Duronto',
            sourceStation: 'New Delhi', destinationStation: 'Sealdah',
            platformNumber: '7', status: 'Platform Changed', delayMinutes: ''
        },
        {
            trainNumber: '14033', trainName: 'Jammu Mail',
            sourceStation: 'Delhi Junction', destinationStation: 'Jammu Tawi',
            platformNumber: '2', status: 'Cancelled', delayMinutes: ''
        }
    ];

    const SIM_INTERVAL_MS  = 30000;   // 30 seconds between announcements
    const SIM_TOTAL        = SIM_SCENARIOS.length;

    let simTimerInterval   = null;   // countdown setInterval
    let simNextTimeout     = null;   // setTimeout for next scenario
    let simIndex           = 0;
    let simRunning         = false;
    let simSecondsLeft     = 0;

    const raGenerateBtn     = document.getElementById('raGenerateBtn');
    const raRegenerateBtn   = document.getElementById('raRegenerateBtn');
    const raSpinner         = document.getElementById('raSpinner');
    const raBtnLabel        = document.getElementById('raBtnLabel');
    const raResultSection   = document.getElementById('raResultSection');
    const raAudioPlayer     = document.getElementById('raAudioPlayer');
    const raDownloadLink    = document.getElementById('raDownloadLink');
    const raAudioDuration   = document.getElementById('raAudioDuration');
    const raAlertError      = document.getElementById('ra-alertError');
    const raAnnouncementTxt = document.getElementById('raAnnouncementText');
    const raTrainNumberMsg  = document.getElementById('raTrainNumberMsg');

    // Simulation UI
    const simStartBtn   = document.getElementById('simStartBtn');
    const simStopBtn    = document.getElementById('simStopBtn');
    const simBadge      = document.getElementById('simBadge');
    const simCountdown  = document.getElementById('simCountdown');
    const simProgressBar= document.getElementById('simProgressBar');

    // History
    const raHistorySection = document.getElementById('raHistorySection');
    const raHistoryList    = document.getElementById('raHistoryList');
    const raClearHistory   = document.getElementById('raClearHistory');

    raAudioPlayer.addEventListener('loadedmetadata', () => {
        raAudioDuration.textContent = formatDuration(raAudioPlayer.duration);
    });

    raGenerateBtn.addEventListener('click', generateRailwayAnnouncement);
    raRegenerateBtn.addEventListener('click', generateRailwayAnnouncement);
    simStartBtn.addEventListener('click', startSimulation);
    simStopBtn.addEventListener('click', stopSimulation);
    raClearHistory.addEventListener('click', () => {
        raHistoryList.innerHTML = '';
        raHistorySection.style.display = 'none';
    });

    // ── Simulation engine ────────────────────────────────────────────
    function startSimulation() {
        if (simRunning) return;
        simRunning = true;
        simIndex   = 0;
        simStartBtn.style.display = 'none';
        simStopBtn.style.display  = 'inline-flex';
        simBadge.textContent      = `▶ Simulating (1 / ${SIM_TOTAL})`;
        simBadge.classList.add('running');

        runNextScenario();
    }

    function stopSimulation() {
        simRunning = false;
        clearInterval(simTimerInterval);
        clearTimeout(simNextTimeout);
        simTimerInterval = null;
        simNextTimeout   = null;

        simStartBtn.style.display = 'inline-flex';
        simStopBtn.style.display  = 'none';
        simBadge.textContent      = '⏸ Simulation Off';
        simBadge.classList.remove('running');
        simBadge.classList.remove('done');
        simCountdown.textContent  = '';
        simProgressBar.style.width = '0%';
    }

    function runNextScenario() {
        if (!simRunning || simIndex >= SIM_TOTAL) {
            // All done
            simBadge.textContent = `✅ All ${SIM_TOTAL} announcements done`;
            simBadge.classList.remove('running');
            simBadge.classList.add('done');
            simCountdown.textContent = '';
            simProgressBar.style.width = '100%';
            simStartBtn.style.display  = 'inline-flex';
            simStopBtn.style.display   = 'none';
            simRunning = false;
            return;
        }

        const scenario = SIM_SCENARIOS[simIndex];
        fillForm(scenario);
        simBadge.textContent = `▶ Simulating (${simIndex + 1} / ${SIM_TOTAL})`;

        // Fire announcement immediately for this scenario
        generateRailwayAnnouncement().then(() => {
            simIndex++;
            if (!simRunning || simIndex >= SIM_TOTAL) {
                runNextScenario();   // will hit the "done" branch
                return;
            }
            // Start countdown to next scenario
            simSecondsLeft = SIM_INTERVAL_MS / 1000;
            simProgressBar.style.width = '0%';
            updateCountdown();

            simTimerInterval = setInterval(() => {
                simSecondsLeft--;
                updateCountdown();
                if (simSecondsLeft <= 0) {
                    clearInterval(simTimerInterval);
                    simTimerInterval = null;
                }
            }, 1000);

            simNextTimeout = setTimeout(() => {
                clearInterval(simTimerInterval);
                simTimerInterval = null;
                simCountdown.textContent = '';
                simProgressBar.style.width = '0%';
                runNextScenario();
            }, SIM_INTERVAL_MS);
        });
    }

    function updateCountdown() {
        const elapsed  = (SIM_INTERVAL_MS / 1000) - simSecondsLeft;
        const pct      = Math.min((elapsed / (SIM_INTERVAL_MS / 1000)) * 100, 100);
        simProgressBar.style.width = pct + '%';
        simCountdown.textContent   = `Next in ${simSecondsLeft}s`;
    }

    function fillForm(s) {
        document.getElementById('raTrainNumber').value  = s.trainNumber;
        document.getElementById('raTrainName').value    = s.trainName;
        document.getElementById('raSource').value       = s.sourceStation;
        document.getElementById('raDestination').value  = s.destinationStation;
        document.getElementById('raPlatform').value     = s.platformNumber;
        document.getElementById('raStatus').value       = s.status;
        document.getElementById('raDelay').value        = s.delayMinutes || '';
    }

    // ── Generate (manual or simulated) ──────────────────────────────
    async function generateRailwayAnnouncement() {
        const trainNumber   = document.getElementById('raTrainNumber').value.trim();
        const trainName     = document.getElementById('raTrainName').value.trim();
        const sourceStation = document.getElementById('raSource').value.trim();
        const destStation   = document.getElementById('raDestination').value.trim();
        const platform      = document.getElementById('raPlatform').value.trim();
        const status        = document.getElementById('raStatus').value;
        const delayMinutes  = document.getElementById('raDelay').value.trim();

        raAlertError.classList.remove('show');
        raTrainNumberMsg.classList.remove('show');

        if (!trainNumber) {
            raTrainNumberMsg.classList.add('show');
            document.getElementById('raTrainNumber').focus();
            return;
        }

        setRaLoading(true);
        raResultSection.classList.remove('show');

        try {
            const res  = await fetch('/generate-railway-announcement', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    trainNumber, trainName, sourceStation,
                    destinationStation: destStation,
                    platformNumber: platform, status, delayMinutes
                })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                showError(raAlertError, data.error || 'Unexpected error.');
                return;
            }

            raAnnouncementTxt.textContent = data.announcementText;
            playAudio(data.audioBase64, raAudioPlayer, raDownloadLink,
                      `railway-announcement_${Date.now()}.mp3`);
            raAudioDuration.textContent = '';
            raResultSection.classList.add('show');

            // ── Add to history ──────────────────────────────────────
            addToHistory({
                trainNumber, trainName, sourceStation,
                destinationStation: destStation,
                status, delayMinutes,
                announcementText: data.announcementText
            });

        } catch (err) {
            showError(raAlertError, 'Network error: ' + err.message);
        } finally {
            setRaLoading(false);
        }
    }

    function addToHistory(entry) {
        raHistorySection.style.display = 'block';

        // Remove 'new' highlight from previous items
        raHistoryList.querySelectorAll('.ra-history-item').forEach(el =>
            el.classList.remove('new'));

        const statusClass = {
            'On Time':        'status-ontime',
            'Delayed':        'status-delayed',
            'Arriving':       'status-arriving',
            'Platform Changed':'status-changed',
            'Cancelled':      'status-cancelled'
        }[entry.status] || '';

        const delayBadge = entry.delayMinutes
            ? `<span class="ra-history-tag status-delayed">⏱ ${entry.delayMinutes} min delay</span>`
            : '';

        const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        const item = document.createElement('div');
        item.className = 'ra-history-item new';
        item.innerHTML = `
            <div class="ra-history-meta">
                <span class="ra-history-tag">🚂 ${entry.trainNumber} – ${entry.trainName || 'Train'}</span>
                <span class="ra-history-tag">${entry.sourceStation || '?'} → ${entry.destinationStation || '?'}</span>
                <span class="ra-history-tag ${statusClass}">${entry.status}</span>
                ${delayBadge}
            </div>
            <div class="ra-history-text">${entry.announcementText}</div>
            <div class="ra-history-time">🕐 ${now}</div>`;

        raHistoryList.insertBefore(item, raHistoryList.firstChild);
    }

    function setRaLoading(on) {
        raGenerateBtn.disabled = on;
        raSpinner.classList.toggle('active', on);
        raBtnLabel.textContent = on ? 'Generating…' : '🎙️ Generate Announcement';
    }

    // ════════════════════════════════════════════════════════════════
    // TAB 3 – Live Simulation
    // 5 fixed messages → POST /generate-audio-json → autoplay
    // setInterval 20 000 ms between announcements
    // ════════════════════════════════════════════════════════════════

    const LIVE_MESSAGES = [
        "Attention please. Train number 12009 Shatabdi Express from Mumbai Central to Ahmedabad is arriving on platform number 2. Passengers are requested to kindly proceed for boarding. Thank you.",
        "Attention please. Train number 12951 Rajdhani Express from Mumbai Central to New Delhi is running late by 25 minutes. The inconvenience caused is deeply regretted. Passengers are requested to kindly wait for further updates. Thank you.",
        "Attention please. Train number 12627 Karnataka Express from Bengaluru to New Delhi will now arrive on platform number 5 instead of platform number 3. Passengers are requested to kindly note the change in platform number. Thank you.",
        "Attention please. Train number 12230 Lucknow Mail from New Delhi to Lucknow has been cancelled due to operational reasons. Passengers are requested to contact the enquiry counter for further assistance. The inconvenience caused is deeply regretted. Thank you.",
        "May I have your attention please. Train number 11057 CSMT Amritsar Express from Mumbai CSMT to Amritsar is arriving shortly on platform number 3. Passengers are requested to stand behind the yellow line. Thank you."
    ];

    const LIVE_INTERVAL_MS = 20000;   // 20 seconds as per requirement
    const LIVE_TOTAL       = LIVE_MESSAGES.length;  // 5

    let liveIntervalId   = null;
    let liveCountdownId  = null;
    let liveIndex        = 0;
    let liveRunning      = false;
    let liveSecondsLeft  = 0;

    // DOM refs
    const liveStartBtn      = document.getElementById('liveStartBtn');
    const liveStopBtn       = document.getElementById('liveStopBtn');
    const liveDot           = document.getElementById('liveDot');
    const liveStatusText    = document.getElementById('liveStatusText');
    const liveCounter       = document.getElementById('liveCounter');
    const liveProgressWrap  = document.getElementById('liveProgressWrap');
    const liveProgressFill  = document.getElementById('liveProgressFill');
    const liveCountdownText = document.getElementById('liveCountdownText');
    const liveNowPlaying    = document.getElementById('liveNowPlaying');
    const liveNowIndex      = document.getElementById('liveNowIndex');
    const liveNowText       = document.getElementById('liveNowText');
    const liveAudioPlayer   = document.getElementById('liveAudioPlayer');
    const liveList          = document.getElementById('liveList');
    const liveEmptyMsg      = document.getElementById('liveEmptyMsg');
    const liveAlertError    = document.getElementById('liveAlertError');
    const liveClearBtn      = document.getElementById('liveClearBtn');

    liveStartBtn.addEventListener('click', startLiveSimulation);
    liveStopBtn.addEventListener('click',  stopLiveSimulation);
    liveClearBtn.addEventListener('click', () => {
        liveList.innerHTML = '';
        liveList.appendChild(liveEmptyMsg);
        liveEmptyMsg.style.display = 'block';
        liveNowPlaying.style.display = 'none';
        liveAlertError.classList.remove('show');
    });

    // ── Start ────────────────────────────────────────────────────────
    function startLiveSimulation() {
        if (liveRunning) return;
        liveRunning = true;
        liveIndex   = 0;

        liveStartBtn.style.display = 'none';
        liveStopBtn.style.display  = 'inline-flex';
        liveDot.className          = 'live-dot running';
        liveProgressWrap.style.display = 'flex';
        liveAlertError.classList.remove('show');

        // Fire first announcement immediately, then every 20s via setInterval
        fireAnnouncement();

        liveIntervalId = setInterval(() => {
            if (liveIndex >= LIVE_TOTAL) {
                finishLiveSimulation();
                return;
            }
            fireAnnouncement();
        }, LIVE_INTERVAL_MS);
    }

    // ── Stop (manual) ────────────────────────────────────────────────
    function stopLiveSimulation() {
        liveRunning = false;
        clearInterval(liveIntervalId);
        clearInterval(liveCountdownId);
        liveIntervalId  = null;
        liveCountdownId = null;

        liveStartBtn.style.display = 'inline-flex';
        liveStopBtn.style.display  = 'none';
        liveDot.className          = 'live-dot';
        liveStatusText.textContent = 'Simulation stopped.';
        liveCounter.textContent    = '';
        liveProgressWrap.style.display = 'none';
        liveProgressFill.style.width   = '0%';
        liveCountdownText.textContent  = '';
    }

    // ── All done ─────────────────────────────────────────────────────
    function finishLiveSimulation() {
        liveRunning = false;
        clearInterval(liveIntervalId);
        clearInterval(liveCountdownId);
        liveIntervalId  = null;
        liveCountdownId = null;

        liveStartBtn.style.display = 'inline-flex';
        liveStopBtn.style.display  = 'none';
        liveDot.className          = 'live-dot done';
        liveStatusText.textContent = `✅ All ${LIVE_TOTAL} announcements completed!`;
        liveCounter.textContent    = '';
        liveProgressWrap.style.display = 'none';
    }

    // ── Fire one announcement ────────────────────────────────────────
    async function fireAnnouncement() {
        if (liveIndex >= LIVE_TOTAL) { finishLiveSimulation(); return; }

        const msgIndex = liveIndex;       // capture before async
        liveIndex++;

        const text = LIVE_MESSAGES[msgIndex];

        // Update status
        liveStatusText.textContent = `Generating announcement ${msgIndex + 1} of ${LIVE_TOTAL}…`;
        liveCounter.textContent    = `${msgIndex + 1} / ${LIVE_TOTAL}`;

        // Start countdown for NEXT announcement (unless this is the last)
        startLiveCountdown(msgIndex);

        // Show "now playing" skeleton immediately
        liveNowPlaying.style.display = 'block';
        liveNowIndex.textContent = msgIndex + 1;
        liveNowText.textContent  = text;
        if (liveEmptyMsg) liveEmptyMsg.style.display = 'none';

        try {
            const res  = await fetch('/generate-audio-json', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, voice: 'alloy' })
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                showError(liveAlertError, data.error || 'Failed to generate audio for message ' + (msgIndex + 1));
                return;
            }

            // Play audio
            const blob = new Blob([base64ToUint8Array(data.audioBase64)], { type: 'audio/mpeg' });
            const url  = URL.createObjectURL(blob);
            liveAudioPlayer.src = url;
            liveAudioPlayer.load();
            liveAudioPlayer.play().catch(() => {});

            liveStatusText.textContent = `Playing announcement ${msgIndex + 1} of ${LIVE_TOTAL}`;

            // Append to live list
            appendLiveItem(msgIndex + 1, text, url);

        } catch (err) {
            showError(liveAlertError, 'Network error on message ' + (msgIndex + 1) + ': ' + err.message);
        }
    }

    // ── Countdown progress bar for next announcement ─────────────────
    function startLiveCountdown(currentIndex) {
        clearInterval(liveCountdownId);
        liveProgressFill.style.width = '0%';
        liveCountdownText.textContent = '';

        // Don't show countdown after the last message
        if (currentIndex + 1 >= LIVE_TOTAL) return;

        liveSecondsLeft = LIVE_INTERVAL_MS / 1000;

        liveCountdownId = setInterval(() => {
            if (!liveRunning) { clearInterval(liveCountdownId); return; }
            liveSecondsLeft = Math.max(0, liveSecondsLeft - 1);
            const elapsed = (LIVE_INTERVAL_MS / 1000) - liveSecondsLeft;
            const pct     = Math.min((elapsed / (LIVE_INTERVAL_MS / 1000)) * 100, 100);
            liveProgressFill.style.width  = pct + '%';
            liveCountdownText.textContent = `Next in ${liveSecondsLeft}s`;
            if (liveSecondsLeft <= 0) clearInterval(liveCountdownId);
        }, 1000);
    }

    // ── Append item to the live list ─────────────────────────────────
    function appendLiveItem(num, text, audioUrl) {
        // Remove 'latest' from previous items
        liveList.querySelectorAll('.live-item').forEach(el => el.classList.remove('latest'));

        const now = new Date().toLocaleTimeString('en-IN', {
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });

        const item = document.createElement('div');
        item.className = 'live-item latest';
        item.innerHTML = `
            <div class="live-item-header">
                <span class="live-item-num">Announcement ${num}</span>
                <span class="live-item-time">🕐 ${now}</span>
            </div>
            <div class="live-item-text">${text}</div>`;

        liveList.insertBefore(item, liveList.firstChild);
    }

    // ── Shared helpers ───────────────────────────────────────────────
    function playAudio(base64, player, link, filename) {
        const blob = new Blob([base64ToUint8Array(base64)], { type: 'audio/mpeg' });
        const url  = URL.createObjectURL(blob);
        player.src = url; player.load();
        link.href = url; link.download = filename;
        player.play().catch(() => {});
    }

    function showError(el, message) {
        el.textContent = '⚠️ ' + message;
        el.classList.add('show');
    }

    function formatDuration(dur) {
        if (!isFinite(dur)) return '';
        const m = Math.floor(dur / 60).toString().padStart(2, '0');
        const s = Math.floor(dur % 60).toString().padStart(2, '0');
        return `Duration: ${m}:${s}`;
    }

    function base64ToUint8Array(base64) {
        const binary = atob(base64);
        const bytes  = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return bytes;
    }
});
