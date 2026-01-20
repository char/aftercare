import { Signal } from "@char/aftercare";

const startTime = new Signal(0);
const elapsed = new Signal(0);
const running = new Signal(false);

const twoDigit = (n: number) => String(n).padStart(2, "0");
const formatTime = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = Math.floor((ms % 1000) / 10);
  return `${twoDigit(minutes)}:${twoDigit(seconds)}.${twoDigit(milliseconds)}`;
};

let interval: number;
running.subscribe(r => {
  if (r) {
    startTime.set(Date.now() - elapsed.get());
    interval = setInterval(() => {
      elapsed.set(Date.now() - startTime.get());
    }, 16);
  } else {
    clearInterval(interval);
  }
});

const stopwatch = (
  <main>
    <h1>stopwatch</h1>
    <div class="time-display">{elapsed.derive(formatTime)}</div>
    <div class="button-group">
      <button
        type="button"
        class={running.derive(r => (r ? "stop" : "start"))}
        _onclick={() => running.mut(b => !b)}
      >
        {running.derive(running => (running ? "Stop" : "Start"))}
      </button>
      <button type="button" class="reset" _onclick={() => elapsed.set(0)} disabled={running}>
        Reset
      </button>
    </div>
  </main>
);

document.body.append(stopwatch);
