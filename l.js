function simulateNoiseLevel() {
  const hour = new Date().getHours();
  let baseNoise = hour >= 22 || hour < 6 ? 25 : 30;
  return Math.max(10, baseNoise + (Math.random() * 15));
}