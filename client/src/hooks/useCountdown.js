import { useState, useEffect } from 'react';

export const useCountdown = (deadline) => {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!deadline) return;

    const calculate = () => {
      const diff = new Date(deadline) - new Date();
      if (diff <= 0) return setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });

      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
        expired: false,
      });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  return timeLeft;
};
