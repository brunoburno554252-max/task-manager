import confetti from "canvas-confetti";

export function fireConfetti() {
  // Burst from both sides
  const defaults = { startVelocity: 25, spread: 65, ticks: 60, zIndex: 9999 };

  confetti({ ...defaults, particleCount: 40, origin: { x: 0.3, y: 0.6 }, colors: ["#10b981", "#34d399", "#6ee7b7"] });
  confetti({ ...defaults, particleCount: 40, origin: { x: 0.7, y: 0.6 }, colors: ["#10b981", "#34d399", "#6ee7b7"] });

  // Stars from center
  setTimeout(() => {
    confetti({
      particleCount: 20,
      spread: 100,
      origin: { x: 0.5, y: 0.5 },
      shapes: ["star"],
      colors: ["#fbbf24", "#f59e0b", "#eab308"],
      startVelocity: 20,
      ticks: 50,
      zIndex: 9999,
    });
  }, 150);
}
