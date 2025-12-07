import React from "react";

interface PasswordStrengthBarProps {
  password: string;
}

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (password.length >= 12) score++;
  return score;
}

function getStrengthLabel(score: number) {
  if (score <= 1) return { label: "ضعيفة جدًا", color: "bg-red-500" };
  if (score === 2) return { label: "ضعيفة", color: "bg-orange-500" };
  if (score === 3) return { label: "متوسطة", color: "bg-yellow-500" };
  if (score === 4) return { label: "جيدة", color: "bg-lime-500" };
  if (score >= 5) return { label: "قوية", color: "bg-green-600" };
  return { label: "", color: "bg-gray-300" };
}

const PasswordStrengthBar: React.FC<PasswordStrengthBarProps> = ({ password }) => {
  const score = getPasswordStrength(password);
  const { label, color } = getStrengthLabel(score);
  return (
    <div className="mt-1">
      <div className="w-full h-2 rounded bg-gray-200 overflow-hidden">
        <div
          className={`h-2 rounded transition-all duration-300 ${color}`}
          style={{ width: `${(score / 5) * 100}%` }}
        />
      </div>
      <div className="text-xs mt-1 text-right font-bold" style={{ color: color.replace('bg-', '') }}>
        {label}
      </div>
    </div>
  );
};

export default PasswordStrengthBar;
